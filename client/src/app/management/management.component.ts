import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Http requests moved to service
import { SecurityService } from '../security.service';
import { CardModule } from '@odx/angular/components/card';
import { AreaHeaderComponent } from '@odx/angular/components/area-header';
import { ButtonComponent, ButtonVariant } from '@odx/angular/components/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SelectComponent, SelectOptionComponent } from '@odx/angular/components/select';
import { SessionIdleService } from '../session-idle.service';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, AreaHeaderComponent, ButtonComponent, TranslateModule, SelectComponent, SelectOptionComponent],
  templateUrl: './management.component.html',
  styleUrl: './management.component.css'
})
export class ManagementComponent implements OnInit {
  public variantValue = ButtonVariant.HIGHLIGHT;

  // Auto Log-off
  autoLogoffSelect: 'Never' | 'Custom' = 'Never';
  autoLogoffMinutes: number = 0;
  autoLogoffMessage: string = '';
  isAutoLogoffSaving: boolean = false;

  // Password Management
  // Change Password
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isPasswordSaving: boolean = false;
  passwordErrorMessage: string = '';
  passwordSuccessMessage: string = '';

  // Password cycle management
  selectedCycle: string = 'Never';
  isCycleSaving: boolean = false;
  cycleErrorMessage: string = '';
  cycleSuccessMessage: string = '';

  constructor(private securityService: SecurityService, private translate: TranslateService, private idle: SessionIdleService) {}

  ngOnInit(): void {
    this.loadAutoLogoff();
    this.loadPasswordCycle();
  }

  // Auto Log-off setting
  loadAutoLogoff(): void {
    try {
      const minStr = localStorage.getItem('autoLogoffMinutes');
      const n = minStr == null ? 0 : Number(minStr);
      if (Number.isFinite(n) && n > 0) {
        this.autoLogoffSelect = 'Custom';
        this.autoLogoffMinutes = Math.floor(n);
      } else {
        this.autoLogoffSelect = 'Never';
        this.autoLogoffMinutes = 0;
      }
      // Ensure service is in sync
      this.idle.update(this.autoLogoffMinutes);
    } catch {
      this.autoLogoffSelect = 'Never';
      this.autoLogoffMinutes = 0;
      this.idle.update(0);
    }
  }

  saveAutoLogoff(): void {
    this.autoLogoffMessage = '';
    this.isAutoLogoffSaving = true;
    // Validate
    let minutes = 0;
    if (this.autoLogoffSelect === 'Custom') {
      minutes = Number(this.autoLogoffMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        this.isAutoLogoffSaving = false;
        const msg = this.translate.instant('MANAGEMENT.AUTO_LOGOFF.ERROR_INVALID_MINUTES');
        this.autoLogoffMessage = msg && msg !== 'MANAGEMENT.AUTO_LOGOFF.ERROR_INVALID_MINUTES' ? msg : 'Please enter a valid positive number of minutes';
        return;
      }
      minutes = Math.floor(minutes);
    }
    try {
      localStorage.setItem('autoLogoffMinutes', String(minutes));
    } catch {}
    // Update idle service
    this.idle.update(minutes);
    this.isAutoLogoffSaving = false;
    const ok = this.translate.instant('MANAGEMENT.AUTO_LOGOFF.SAVED');
    this.autoLogoffMessage = ok && ok !== 'MANAGEMENT.AUTO_LOGOFF.SAVED' ? ok : 'Saved';
  }

  onAutoLogoffSelectChange(): void {
    if (this.autoLogoffSelect === 'Never') {
      this.autoLogoffMinutes = 0;
    }
  }

  // Password cycle
  loadPasswordCycle(): void {
    this.securityService.getPasswordCycle().subscribe({
      next: (res) => {
        if (res && res.success && res.cycle) {
          this.selectedCycle = res.cycle;
        }
      },
      error: () => {}
    });
  }

  savePasswordCycle(): void {
    this.cycleErrorMessage = '';
    this.cycleSuccessMessage = '';
    const allowed = ['-1', '1m', '2m', '6m', '1y'];
    if (!allowed.includes(this.selectedCycle)) {
      const msg = this.translate.instant('PASSWORD.CYCLE.ERROR_INVALID');
      this.cycleErrorMessage = msg && msg !== 'PASSWORD.CYCLE.ERROR_INVALID' ? msg : 'Invalid cycle';
      return;
    }
    this.isCycleSaving = true;
    this.securityService.setPasswordCycle(this.selectedCycle).subscribe({
      next: (res) => {
        if (res && res.success) {
          const ok = this.translate.instant('PASSWORD.CYCLE.SUCCESS_SAVED');
          this.cycleSuccessMessage = ok && ok !== 'PASSWORD.CYCLE.SUCCESS_SAVED' ? ok : 'Password update cycle saved';
        } else {
          const msg = this.translate.instant('PASSWORD.CYCLE.ERROR_SAVE_FAILED');
          this.cycleErrorMessage = res?.message || (msg && msg !== 'PASSWORD.CYCLE.ERROR_SAVE_FAILED' ? msg : 'Failed to save password update cycle');
        }
        this.isCycleSaving = false;
      },
      error: (err) => {
        const msg = this.translate.instant('COMMON.ERROR_NETWORK');
        this.cycleErrorMessage = err?.error?.message || (msg && msg !== 'COMMON.ERROR_NETWORK' ? msg : 'Failed to connect to server');
        this.isCycleSaving = false;
      }
    });
  }

  // Change Password
  changePassword(): void {
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      const msg = this.translate.instant('PASSWORD.CHANGE.ERROR_INVALID');
      this.passwordErrorMessage = msg && msg !== 'PASSWORD.CHANGE.ERROR_INVALID' ? msg : 'Please enter a valid password';
      return;
    }

    if (this.newPassword.length < 8) {
      const msg = this.translate.instant('PASSWORD.CHANGE.ERROR_LENGTH');
      this.passwordErrorMessage = msg && msg !== 'PASSWORD.CHANGE.ERROR_LENGTH' ? msg : 'New password must be at least 8 characters';
      return;
    }

    if (this.newPassword === this.oldPassword) {
      const msg = this.translate.instant('PASSWORD.CHANGE.ERROR_SAME');
      this.passwordErrorMessage = msg && msg !== 'PASSWORD.CHANGE.ERROR_SAME' ? msg : 'New password must differ from the previous one';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      const msg = this.translate.instant('PASSWORD.CHANGE.ERROR_MISMATCH');
      this.passwordErrorMessage = msg && msg !== 'PASSWORD.CHANGE.ERROR_MISMATCH' ? msg : 'New password and confirm password do not match';
      return;
    }

    this.isPasswordSaving = true;

    this.securityService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: (response) => {
        if (response.success) {
          const ok = this.translate.instant('PASSWORD.CHANGE.SUCCESS');
          this.passwordSuccessMessage = ok && ok !== 'PASSWORD.CHANGE.SUCCESS' ? ok : 'Password changed successfully';
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          const msg = this.translate.instant('PASSWORD.CHANGE.ERROR_FAILED');
          this.passwordErrorMessage = response.message || (msg && msg !== 'PASSWORD.CHANGE.ERROR_FAILED' ? msg : 'Failed to change password');
        }
        this.isPasswordSaving = false;
      },
      error: (error) => {
        const msg = this.translate.instant('COMMON.ERROR_NETWORK');
        this.passwordErrorMessage = error.error?.message || (msg && msg !== 'COMMON.ERROR_NETWORK' ? msg : 'Failed to connect to server');
        this.isPasswordSaving = false;
      }
    });
  }
}
