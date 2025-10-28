import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If in-memory state already authenticated, allow immediately
  if (auth.isLoggedIn) {
    return true;
  }

  // Otherwise, attempt to restore session from backend (e.g., cookie-based)
  // Allow navigation if backend reports authenticated; else redirect to /login
  return auth.checkSession().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
