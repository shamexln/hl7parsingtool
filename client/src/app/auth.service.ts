import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';

interface LoginRes {
  success?: boolean;
  token?: string;
  refreshToken?: string;
}
interface SetupRequiredRes {
  setupRequired: boolean;
  status?: string;
}
interface SetupInitialRes {
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  private readonly _token$ = new BehaviorSubject<string | null>(null);
  private readonly _refreshToken$ = new BehaviorSubject<string | null>(null);

  private _refreshing$?: Observable<boolean>;

  constructor(private http: HttpClient) {}

  get isLoggedIn$(): Observable<boolean> { return this._isLoggedIn$.asObservable(); }
  get isLoggedIn(): boolean { return this._isLoggedIn$.value; }
  get token$(): Observable<string | null> { return this._token$.asObservable(); }
  get token(): string | null { return this._token$.value; }
  get refreshToken(): string | null { return this._refreshToken$.value; }

  private setTokens(accessToken: string | null, refreshToken: string | null): void {
    this._token$.next(accessToken);
    this._refreshToken$.next(refreshToken);
    this._isLoggedIn$.next(!!accessToken);
  }

  // Clear tokens locally without calling backend (used on refresh failure)
  logoutLocal(): void {
    this.setTokens(null, null);
  }

  // 首次登录检查：后端返回是否需要初始化
  setupRequired(): Observable<SetupRequiredRes> {
    return this.http.get<SetupRequiredRes>('/api/auth/setup-required').pipe(
      catchError(() => of({ setupRequired: false, status: 'error' }))
    );
  }

  // 首次初始化：双输入密码提交到后端，后端不校验直接存库
  setupInitial(username: string, password: string, confirmPassword: string): Observable<SetupInitialRes> {
    return this.http.post<SetupInitialRes>('/api/auth/setup-initial', { username, password, confirmPassword });
  }

  // 登录：保存 accessToken 和 refreshToken（仅内存）
  login(username: string, password: string): Observable<boolean> {
    const body = { username, password };
    return this.http.post<LoginRes>('/api/auth/login', body).pipe(
      map(res => ({ access: res?.token ?? null, refresh: res?.refreshToken ?? null })),
      tap(({ access, refresh }) => this.setTokens(access, refresh)),
      map(({ access }) => !!access),
      catchError(() => {
        this.setTokens(null, null);
        return of(false);
      })
    );
  }

  // 主动刷新访问令牌：使用 X-Refresh-Token 请求 /api/auth/me
  refreshAccessToken(): Observable<boolean> {
    const rt = this.refreshToken;
    if (!rt) return of(false);

    if (this._refreshing$) return this._refreshing$; // 返回正在进行的刷新请求

    const headers = new HttpHeaders({ 'X-Refresh-Token': rt ,'Cache-Control': 'no-cache, no-store, must-revalidate','Pragma': 'no-cache',
      'Expires': '0',});
    //const params = new HttpParams().set('_ts', Date.now().toString());
    this._refreshing$ = this.http.get<{ authenticated: boolean; token?: string }>(`/api/auth/me`, { headers })
      .pipe(
        map(res => (res?.authenticated && res?.token ? res.token : null)),
        tap(newAccess => {
          if (newAccess) {
            this.setTokens(newAccess, rt);
          } else {
            // Refresh token invalid/expired or backend refused → clear both tokens
            this.setTokens(null, null);
          }
        }),
        map(newAccess => !!newAccess),
        catchError(() => {
          this.setTokens(null, null);
          return of(false);
        }),
        finalize(() => { this._refreshing$ = undefined; }),
        shareReplay(1)
      );

    return this._refreshing$;
  }

  // 可选：检查会话，带上 refresh token 以便后端在 access 失效时签发新 access
  checkSession(): Observable<boolean> {
    const rt = this.refreshToken;
    const options = rt ? { headers: new HttpHeaders({ 'X-Refresh-Token': rt }) } : {};
    return this.http.get<{ authenticated: boolean; token?: string }>(`/api/auth/me`, options)
      .pipe(
        tap(res => {
          if (res?.authenticated && res?.token) {
            // 后端刷新了 access token
            this.setTokens(res.token, rt ?? this.refreshToken);
          } else if (!res?.authenticated) {
            // Refresh token invalid or not provided → clear everything
            this.setTokens(null, null);
          }
        }),
        map(res => !!res?.authenticated),
        catchError(() => {
          this._isLoggedIn$.next(false);
          return of(false);
        })
      );
  }

  logout(): Observable<void> {
    const rt = this.refreshToken;
    const options = rt ? { headers: new HttpHeaders({ 'X-Refresh-Token': rt }) } : {};
    return this.http.post<void>(`/api/auth/logout`, {}, options)
      .pipe(
        catchError(() => of(void 0)),
        tap(() => this.setTokens(null, null))
      );
  }
}
