import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PortConfigResponse {
  success: boolean;
  config: { tcpPort?: number; httpPort?: number };
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  constructor(private http: HttpClient) {}

  getPortConfig(): Observable<PortConfigResponse> {
    return this.http.get<PortConfigResponse>('/api/port-config');
  }

  updateTcpPort(port: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/port-config', { tcpPort: port });
  }

  updateHttpPort(port: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/port-config', { httpPort: port });
  }
}
