import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

// Minimal idle tracking service: logs out after N minutes of no user activity.
// Persistence: reads/writes localStorage key 'autoLogoffMinutes'.
// Value semantics:
//  - 0 or null => Never auto log-off
//  - positive number => minutes until logout
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private timeoutHandle: any = null;
  private lastActivity = Date.now();
  private minutes = 0; // 0 = Never
  private initialized = false;

  constructor(private zone: NgZone, private auth: AuthService, private router: Router) {}

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Load initial minutes
    this.minutes = this.readMinutes();

    // Attach listeners outside Angular to avoid change detection storms
    this.zone.runOutsideAngular(() => {
      const reset = () => this.onActivity();
      window.addEventListener('mousemove', reset, { passive: true });
      window.addEventListener('mousedown', reset, { passive: true });
      window.addEventListener('keydown', reset, { passive: true });
      window.addEventListener('touchstart', reset, { passive: true });
      window.addEventListener('scroll', reset, { passive: true });
    });

    // Start timer
    this.resetTimer();
  }

  // Update minutes and persist
  update(minutes: number): void {
    if (typeof minutes !== 'number' || minutes < 0 || !isFinite(minutes)) minutes = 0;
    this.minutes = Math.floor(minutes);
    try { localStorage.setItem('autoLogoffMinutes', String(this.minutes)); } catch {}
    this.resetTimer();
  }

  // Read minutes from localStorage
  private readMinutes(): number {
    try {
      const v = localStorage.getItem('autoLogoffMinutes');
      const n = v == null ? 0 : Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  private onActivity(): void {
    this.lastActivity = Date.now();
    // Only reset timer if we actually have a timeout configured
    if (this.minutes > 0) this.resetTimer();
  }

  private clearTimer(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private resetTimer(): void {
    this.clearTimer();
    if (this.minutes <= 0) return; // Never

    const ms = this.minutes * 60 * 1000;
    const remaining = ms - (Date.now() - this.lastActivity);
    const delay = remaining > 0 ? remaining : 0;

    // Run timeout inside Angular so navigation happens properly
    this.timeoutHandle = setTimeout(() => {
      // If already logged out, nothing to do
      if (!this.auth.isLoggedIn) return;
      this.zone.run(() => {
        this.auth.logout().subscribe(() => {
          try { sessionStorage.setItem('autoLogoffReason', 'inactive'); } catch {}
          this.router.navigate(['/login']);
        });
      });
    }, delay);
  }
}
