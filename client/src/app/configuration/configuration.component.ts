import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Http requests moved to services
import { ConfigurationService } from './configuration.service';
import { SecurityService } from '../security.service';
import { CardModule} from '@odx/angular/components/card';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {ButtonComponent, ButtonVariant} from '@odx/angular/components/button';
import { TranslateModule, TranslateService} from '@ngx-translate/core';
import {ModalDirective, ModalModule, ModalOptions, ModalSize} from '@odx/angular/components/modal';
import { SessionIdleService } from '../session-idle.service';
@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, AreaHeaderComponent, ButtonComponent, TranslateModule, ModalModule],
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

  @ViewChild('modal', { static: true }) modal!: ModalDirective;
  args: Partial<ModalOptions> | "" | null | undefined;

  constructor(private configService: ConfigurationService, private securityService: SecurityService, private translate: TranslateService, private idle: SessionIdleService) {}

  openModalWithData(message: string, heroIcon: string = 'info', heroVariant: string = 'success', afterClose?: () => void) {
    // Set args; the data field will be passed to modalRef.data
    this.args =  {
      data: { message, heroIcon, heroVariant } ,
      size: ModalSize.XSMALL
    };
    this.modal.open();
    const sub = this.modal.modalClose?.subscribe(() => {
      sub?.unsubscribe();
      if (afterClose) afterClose();
    });
  }
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
        // No local storage fallback; leave current values unchanged
      }
    });
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
    if (!this.port || isNaN(Number(this.port)) || Number(this.port) < 2000 || Number(this.port) > 65535) {
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

          // Prompt user to restart service to apply changes
          const message = this.translate.instant('MSG.RestartServiceNotice');
          this.openModalWithData(message,'info', 'success', ()=> {});

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
    if (!this.httpPort || isNaN(Number(this.httpPort)) || Number(this.httpPort) < 2000 || Number(this.httpPort) > 65535) {
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

          // Prompt user to restart service to apply changes
          const message = this.translate.instant('MSG.RestartServiceNotice');
          this.openModalWithData(message,'info', 'success', ()=> {});

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
