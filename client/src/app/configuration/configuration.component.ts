import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Http requests moved to services
import { ConfigurationService } from './configuration.service';
import { SecurityService } from '../security.service';
import { CardModule} from '@odx/angular/components/card';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {ButtonComponent, ButtonVariant} from '@odx/angular/components/button';
import { TranslateModule, TranslateService} from '@ngx-translate/core';
import { SessionIdleService } from '../session-idle.service';
@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, AreaHeaderComponent, ButtonComponent, TranslateModule],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css'
})
export class ConfigurationComponent implements OnInit {

  public variantValue = ButtonVariant.HIGHLIGHT;

  // HL7 Server Configuration
  port: string = '3359';
  savedPort: string = '3359';
  isEditing: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';

  // HTTP RESTFUL Server Configuration
  httpPort: string = '8978';
  savedHttpPort: string = '8978';
  isHttpEditing: boolean = false;
  isHttpSaving: boolean = false;
  httpErrorMessage: string = '';

  // Change Password
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isPasswordSaving: boolean = false;
  passwordErrorMessage: string = '';
  passwordSuccessMessage: string = '';

  constructor(private configService: ConfigurationService, private securityService: SecurityService, private translate: TranslateService, private idle: SessionIdleService) {}

  // Auto Log-off
  autoLogoffSelect: 'Never' | 'Custom' = 'Never';
  autoLogoffMinutes: number = 0;
  autoLogoffMessage: string = '';
  isAutoLogoffSaving: boolean = false;

  // Password cycle management
  selectedCycle: string = 'Never';
  isCycleSaving: boolean = false;
  cycleErrorMessage: string = '';
  cycleSuccessMessage: string = '';

  ngOnInit(): void {
    // Load saved port configurations from the server
    this.loadPortConfigurations();
  }

  loadPortConfigurations(): void {
    // Fetch port configurations from the server
    this.configService.getPortConfig().subscribe({
      next: (response) => {
        if (response.success) {
          // Update TCP port
          if (response.config.tcpPort) {
            this.port = response.config.tcpPort.toString();
            this.savedPort = response.config.tcpPort.toString();
          }

          // Update HTTP port
          if (response.config.httpPort) {
            this.httpPort = response.config.httpPort.toString();
            this.savedHttpPort = response.config.httpPort.toString();
          }
        }
      },
      error: (error) => {
        console.error('Failed to load port configurations:', error);
        // Fallback to local storage if API fails
        this.loadFromLocalStorage();
      }
    });
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
        this.autoLogoffMessage = 'Please enter a valid positive number of minutes';
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
    this.autoLogoffMessage = 'Saved';
  }

  onAutoLogoffSelectChange(): void {
    if (this.autoLogoffSelect === 'Never') {
      this.autoLogoffMinutes = 0;
    }
  }

  loadFromLocalStorage(): void {
    // Fallback to local storage for TCP port
    const savedPort = localStorage.getItem('apiPort');
    if (savedPort) {
      this.port = savedPort;
      this.savedPort = savedPort;
    }

    // Fallback to local storage for HTTP port
    const savedHttpPort = localStorage.getItem('httpPort');
    if (savedHttpPort) {
      this.httpPort = savedHttpPort;
      this.savedHttpPort = savedHttpPort;
    }
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.port = this.savedPort;
    this.isEditing = false;
    this.errorMessage = '';
  }

  savePortConfiguration(): void {
    // Validate port
    if (!this.port || isNaN(Number(this.port)) || Number(this.port) < 1 || Number(this.port) > 65535) {
      const msg = this.translate.instant('CONFIG.ERROR_INVALID_PORT');
      this.errorMessage = msg && msg !== 'CONFIG.ERROR_INVALID_PORT' ? msg : 'Please enter a valid port number (1-65535)';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Save to the server via API
    this.configService.updateTcpPort(Number(this.port)).subscribe({
      next: (response) => {
        if (response.success) {
          // Update saved port value
          this.savedPort = this.port;

          // Also save to local storage as fallback
          localStorage.setItem('apiPort', this.port);

          this.isSaving = false;
          this.isEditing = false;
        } else {
          const msg = this.translate.instant('CONFIG.ERROR_UPDATE_PORT_FAILED');
          this.errorMessage = response.message || (msg && msg !== 'CONFIG.ERROR_UPDATE_PORT_FAILED' ? msg : 'Failed to update port configuration');
          this.isSaving = false;
        }
      },
      error: (error) => {
        console.error('Error saving port configuration:', error);
        const msg = this.translate.instant('COMMON.ERROR_NETWORK');
        this.errorMessage = error.error?.message || (msg && msg !== 'COMMON.ERROR_NETWORK' ? msg : 'Failed to connect to server');
        this.isSaving = false;
      }
    });
  }

  // HTTP RESTFUL Server Configuration Methods

  startHttpEditing(): void {
    this.isHttpEditing = true;
  }

  cancelHttpEditing(): void {
    this.httpPort = this.savedHttpPort;
    this.isHttpEditing = false;
    this.httpErrorMessage = '';
  }

  saveHttpPortConfiguration(): void {
    // Validate port
    if (!this.httpPort || isNaN(Number(this.httpPort)) || Number(this.httpPort) < 1 || Number(this.httpPort) > 65535) {
      const msg = this.translate.instant('CONFIG.ERROR_INVALID_PORT');
      this.httpErrorMessage = msg && msg !== 'CONFIG.ERROR_INVALID_PORT' ? msg : 'Please enter a valid port number (1-65535)';
      return;
    }

    this.isHttpSaving = true;
    this.httpErrorMessage = '';

    // Save to the server via API
    this.configService.updateHttpPort(Number(this.httpPort)).subscribe({
      next: (response) => {
        if (response.success) {
          // Update saved port value
          this.savedHttpPort = this.httpPort;

          // Also save to local storage as fallback
          localStorage.setItem('httpPort', this.httpPort);

          this.isHttpSaving = false;
          this.isHttpEditing = false;
        } else {
          const msg = this.translate.instant('CONFIG.HTTP_ERROR_UPDATE_PORT_FAILED');
          this.httpErrorMessage = response.message || (msg && msg !== 'CONFIG.HTTP_ERROR_UPDATE_PORT_FAILED' ? msg : 'Failed to update HTTP port configuration');
          this.isHttpSaving = false;
        }
      },
      error: (error) => {
        console.error('Error saving HTTP port configuration:', error);
        const msg = this.translate.instant('COMMON.ERROR_NETWORK');
        this.httpErrorMessage = error.error?.message || (msg && msg !== 'COMMON.ERROR_NETWORK' ? msg : 'Failed to connect to server');
        this.isHttpSaving = false;
      }
    });
  }

  loadPasswordCycle(): void {
    // Fetch current cycle from server
    this.securityService.getPasswordCycle().subscribe({
      next: (res) => {
        if (res && res.success) {
          if (res.cycle) {
            this.selectedCycle = res.cycle;
          }
        }
      },
      error: () => {
        // silently ignore; keep default
      }
    });
  }

  savePasswordCycle(): void {
    this.cycleErrorMessage = '';
    this.cycleSuccessMessage = '';
    const allowed = ['Never', '1m','2m','6m','1y'];
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

  // Change Password Methods
  changePassword(): void {
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    // Basic validation
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
          // Clear fields
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
        console.error('Error changing password:', error);
        const msg = this.translate.instant('COMMON.ERROR_NETWORK');
        this.passwordErrorMessage = error.error?.message || (msg && msg !== 'COMMON.ERROR_NETWORK' ? msg : 'Failed to connect to server');
        this.isPasswordSaving = false;
      }
    });
  }
}
