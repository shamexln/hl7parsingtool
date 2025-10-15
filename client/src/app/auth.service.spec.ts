import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService (refresh token flow)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login() should store access and refresh tokens and mark logged in', (done) => {
    service.login('u', 'p').subscribe(ok => {
      expect(ok).toBeTrue();
      expect(service.isLoggedIn).toBeTrue();
      expect(service.token).toBe('ACCESS');
      expect(service.refreshToken).toBe('REFRESH');
      done();
    });
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('refreshAccessToken() should call /api/auth/me with X-Refresh-Token and update access token', (done) => {
    // Seed tokens by simulating previous login
    // Use private method indirectly via login
    service.login('u', 'p').subscribe(() => {
      // Now trigger refresh
      service.refreshAccessToken().subscribe(ok => {
        expect(ok).toBeTrue();
        expect(service.token).toBe('NEW_ACCESS');
        expect(service.refreshToken).toBe('REFRESH');
        done();
      });
      // Expect /api/auth/me for refresh
      const refreshReq = httpMock.expectOne('/api/auth/me');
      expect(refreshReq.request.method).toBe('GET');
      expect(refreshReq.request.headers.get('X-Refresh-Token')).toBe('REFRESH');
      refreshReq.flush({ authenticated: true, token: 'NEW_ACCESS' });
    });
    // Respond to login
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('checkSession() should update access token when backend returns authenticated + token', (done) => {
    // Seed refresh token via login
    service.login('u', 'p').subscribe(() => {
      service.checkSession().subscribe(auth => {
        expect(auth).toBeTrue();
        expect(service.token).toBe('NEWER');
        expect(service.refreshToken).toBe('REFRESH');
        done();
      });
      const meReq = httpMock.expectOne('/api/auth/me');
      expect(meReq.request.headers.get('X-Refresh-Token')).toBe('REFRESH');
      meReq.flush({ authenticated: true, token: 'NEWER' });
    });
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('logout() should send X-Refresh-Token and clear tokens', (done) => {
    service.login('u', 'p').subscribe(() => {
      service.logout().subscribe(() => {
        expect(service.token).toBeNull();
        expect(service.refreshToken).toBeNull();
        expect(service.isLoggedIn).toBeFalse();
        done();
      });
      const logoutReq = httpMock.expectOne('/api/auth/logout');
      expect(logoutReq.request.method).toBe('POST');
      expect(logoutReq.request.headers.get('X-Refresh-Token')).toBe('REFRESH');
      logoutReq.flush({});
    });
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('refreshAccessToken() should fail and clear tokens when backend says not authenticated', (done) => {
    service.login('u', 'p').subscribe(() => {
      service.refreshAccessToken().subscribe(ok => {
        expect(ok).toBeFalse();
        expect(service.token).toBeNull();
        expect(service.refreshToken).toBeNull();
        expect(service.isLoggedIn).toBeFalse();
        done();
      });
      const refreshReq = httpMock.expectOne('/api/auth/me');
      refreshReq.flush({ authenticated: false });
    });
    const loginReq = httpMock.expectOne('/api/auth/login');
    loginReq.flush({ success: true, token: 'ACCESS', refreshToken: 'REFRESH' });
  });
});
