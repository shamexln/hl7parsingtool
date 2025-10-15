import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

// Helper endpoint used in tests
const API_URL = '/api/some-protected-resource';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor]))
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Authorization header when token is present', (done) => {
    // Seed tokens via login
    auth.login('u', 'p').subscribe(() => {
      http.get(API_URL).subscribe(res => {
        expect(res).toEqual({ ok: true });
        done();
      });
      const req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ACCESS');
      req.flush({ ok: true });
    });
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('on 401 should refresh via /api/auth/me using X-Refresh-Token and retry original request with new access token', (done) => {
    // Seed tokens via login
    auth.login('u', 'p').subscribe(() => {
      // Issue request that will 401 first
      http.get(API_URL).subscribe(res => {
        expect(res).toEqual({ data: 'ok-after-refresh' });
        // After retry, next requests should use new token automatically
        http.get(API_URL).subscribe(res2 => {
          expect(res2).toEqual({ data: 'ok2' });
          done();
        });
        const secondReq = httpMock.expectOne(API_URL);
        expect(secondReq.request.headers.get('Authorization')).toBe('Bearer NEW_ACCESS');
        secondReq.flush({ data: 'ok2' });
      });

      // First attempt with old token → 401
      const firstReq = httpMock.expectOne(API_URL);
      expect(firstReq.request.headers.get('Authorization')).toBe('Bearer ACCESS');
      firstReq.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

      // Interceptor should call refresh endpoint
      const refreshReq = httpMock.expectOne('/api/auth/me');
      expect(refreshReq.request.method).toBe('GET');
      expect(refreshReq.request.headers.get('X-Refresh-Token')).toBe('REFRESH');
      refreshReq.flush({ authenticated: true, token: 'NEW_ACCESS' });

      // Then retry original request with NEW_ACCESS
      const retried = httpMock.expectOne(API_URL);
      expect(retried.request.headers.get('Authorization')).toBe('Bearer NEW_ACCESS');
      retried.flush({ data: 'ok-after-refresh' });
    });

    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('should bubble the error if refresh fails (no retry)', (done) => {
    auth.login('u', 'p').subscribe(() => {
      http.get(API_URL).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => {
          expect(err.status).toBe(401);
          expect(auth.isLoggedIn).toBeFalse(); // service clears tokens on failed refresh
          done();
        }
      });

      const firstReq = httpMock.expectOne(API_URL);
      firstReq.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne('/api/auth/me');
      // Backend indicates not authenticated; service clears tokens
      refreshReq.flush({ authenticated: false });
    });

    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });
});
