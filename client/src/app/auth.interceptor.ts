import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

// Interceptor: attach Authorization header; on 401, try refresh via refresh token and retry once.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const isAuthEndpoint = /\/api\/auth\//.test(req.url);

  const maybeAuthedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const router = inject(Router);
  return next(maybeAuthedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err && err.status === 401 && !isAuthEndpoint) {
        // Attempt to refresh access token and retry once
        return auth.refreshAccessToken().pipe(
          switchMap(ok => {
            if (!ok) {
              // Refresh token likely expired/invalid → force logout and redirect to login
              auth.logoutLocal();
              // Navigate asynchronously; ignore navigation result
              try { router.navigate(['/login']); } catch {}
              return throwError(() => err);
            }
            const newToken = auth.token;
            const retryReq = newToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
              : req;
            return next(retryReq);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
