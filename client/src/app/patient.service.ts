import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {tap, map, Observable, throwError} from 'rxjs';
import { catchError } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = '/api/patients';
  constructor(private http: HttpClient) { }
  getPatientById(id: string): Observable<any[]> {
    return this.http.get<any | any[]>(`${this.apiUrl}/${encodeURIComponent(id)}`).pipe(
      map((response: any | any[]) => Array.isArray(response) ? response : [response]), // 确保总是返回数组
      tap((data:any|any[]) => console.log('get patient data:', data)),
      catchError(this.handleError)
    );
  }

  getPaginatedPatientById(id: string | null | undefined, page: number, pageSize: number,
                          startTime?: string, endTime?: string): Observable<any> {
    const url = id
      ? `${this.apiUrl}/paginated/${encodeURIComponent(id)}`
      : `${this.apiUrl}/paginated`;

    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (startTime) params = params.set('startTime', startTime);
    if (endTime) params = params.set('endTime', endTime);


    return this.http.get<any | any[]>(url, { params })
      .pipe(
      map((response: any | any[]) => Array.isArray(response) ? response : [response]), // 确保总是返回数组
      tap((data:any|any[]) => console.log('get patient data:', data)),
      catchError(this.handleError)
    );
  }

  exportAllDataToExcel(id?: string | null , startTime?: string, endTime?: string): Observable<Blob> {
    const url = id
      ? `${this.apiUrl}/export/${encodeURIComponent(id)}`
      : `${this.apiUrl}/export`;

    let params = new HttpParams();
    if (startTime) params = params.set('startTime', startTime);
    if (endTime) params = params.set('endTime', endTime);

    return this.http.get(url, {
      responseType: 'blob',
      params
    }).pipe(
      tap(() => console.log('get excel file successfully')),
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse) {
    const message = error.error?.message || error.statusText || 'Unknown error';
    return throwError(() => new Error(`request fail：${message}`));
  }


}
