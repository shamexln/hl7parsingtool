import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface LoginRes {
  success?: boolean;
  token?: string;
}
interface SetupRequiredRes {
  setupRequired: boolean;
}
interface SetupInitialRes {
  success: boolean;
  message?: string;
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  private readonly _token$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  get isLoggedIn$(): Observable<boolean> { return this._isLoggedIn$.asObservable(); }
  get isLoggedIn(): boolean { return this._isLoggedIn$.value; }
  get token$(): Observable<string | null> { return this._token$.asObservable(); }
  get token(): string | null { return this._token$.value; }

  // 首次登录检查：后端返回是否需要初始化
  setupRequired(): Observable<boolean> {
    return this.http.get<SetupRequiredRes>('/api/auth/setup-required').pipe(
      map(res => !!res?.setupRequired),
      catchError(() => of(false))
    );
  }

  // 首次初始化：双输入密码提交到后端，后端不校验直接存库
  setupInitial(username: string, password: string, confirmPassword: string): Observable<boolean> {
    return this.http.post<SetupInitialRes>('/api/auth/setup-initial', { username, password, confirmPassword }).pipe(
      map(res => res?.success === true),
      catchError(() => of(false))
    );
  }

  // Login expects backend to return a JWT access token: { token: string }
  // We keep the token only in memory (no localStorage/cookies).
  login(username: string, password: string): Observable<boolean> {
    const body = { username, password };
    return this.http.post<LoginRes>('/api/auth/login', body).pipe(
      map(res => res?.token ? res.token : null),
      tap(token => {
        const ok = typeof token === 'string' && token.length > 0;
        this._token$.next(ok ? (token as string) : null);
        this._isLoggedIn$.next(ok);
      }),
      map(token => !!token),
      catchError(() => {
        this._token$.next(null);
        this._isLoggedIn$.next(false);
        return of(false);
      })
    );
  }

  // Optionally verify token with backend (requires Authorization header via interceptor)
  checkSession(): Observable<boolean> {
    return this.http.get<{ authenticated: boolean }>(`/api/auth/me`)
      .pipe(
        map(res => !!res?.authenticated),
        tap(auth => this._isLoggedIn$.next(auth)),
        catchError(() => {
          this._isLoggedIn$.next(false);
          return of(false);
        })
      );
  }

  logout(): Observable<void> {
    // Inform backend if endpoint exists; regardless, clear local token.
    return this.http.post<void>(`/api/auth/logout`, {})
      .pipe(
        catchError(() => of(void 0)),
        tap(() => {
          this._token$.next(null);
          this._isLoggedIn$.next(false);
        })
      );
  }
}
