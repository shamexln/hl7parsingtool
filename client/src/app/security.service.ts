import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PasswordCycleResponse {
  success?: boolean;
  cycle?: string;
  message?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityService {
  constructor(private http: HttpClient) {}

  getPasswordCycle(): Observable<PasswordCycleResponse> {
    return this.http.get<PasswordCycleResponse>('/api/password-cycle');
  }

  setPasswordCycle(cycle: string): Observable<PasswordCycleResponse> {
    return this.http.post<PasswordCycleResponse>('/api/password-cycle', { cycle });
  }

  changePassword(oldPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/api/change-password', { oldPassword, newPassword });
  }
}
