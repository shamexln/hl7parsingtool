import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule} from '@odx/angular/components/card';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {ButtonComponent, ButtonVariant} from '@odx/angular/components/button';
@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, AreaHeaderComponent, ButtonComponent],
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Load saved port configurations from the server
    this.loadPortConfigurations();
  }

  loadPortConfigurations(): void {
    // Fetch port configurations from the server
    this.http.get<any>('/api/port-config').subscribe({
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
      this.errorMessage = 'Please enter a valid port number (1-65535)';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // Save to the server via API
    this.http.post<any>('/api/port-config', { tcpPort: Number(this.port) }).subscribe({
      next: (response) => {
        if (response.success) {
          // Update saved port value
          this.savedPort = this.port;

          // Also save to local storage as fallback
          localStorage.setItem('apiPort', this.port);

          this.isSaving = false;
          this.isEditing = false;
        } else {
          this.errorMessage = response.message || 'Failed to update port configuration';
          this.isSaving = false;
        }
      },
      error: (error) => {
        console.error('Error saving port configuration:', error);
        this.errorMessage = error.error?.message || 'Failed to connect to server';
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
      this.httpErrorMessage = 'Please enter a valid port number (1-65535)';
      return;
    }

    this.isHttpSaving = true;
    this.httpErrorMessage = '';

    // Save to the server via API
    this.http.post<any>('/api/port-config', { httpPort: Number(this.httpPort) }).subscribe({
      next: (response) => {
        if (response.success) {
          // Update saved port value
          this.savedHttpPort = this.httpPort;

          // Also save to local storage as fallback
          localStorage.setItem('httpPort', this.httpPort);

          this.isHttpSaving = false;
          this.isHttpEditing = false;
        } else {
          this.httpErrorMessage = response.message || 'Failed to update HTTP port configuration';
          this.isHttpSaving = false;
        }
      },
      error: (error) => {
        console.error('Error saving HTTP port configuration:', error);
        this.httpErrorMessage = error.error?.message || 'Failed to connect to server';
        this.isHttpSaving = false;
      }
    });
  }
}
