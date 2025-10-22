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
      this.errorMessage = this.translate.instant('MSG.InvalidPort');
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
          this.errorMessage  = this.translate.instant('CONFIG.UpdatePortFail');
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
      this.httpErrorMessage = this.translate.instant('MSG.InvalidPort');
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
          this.httpErrorMessage  = this.translate.instant('MSG.UpdatePortFail');
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
}
