import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CodesystemMockService {
  // Mock data for codesystem
  private mockCodesystemData = [
    {
      id: 1,
      codesystem_id: "1",
      codesystem_name: "300",
      codesystem_filename: "300_map.xml",
      codesystem_tablename: "hl7_codesystem_300",
      codesystem_isdeault: "true",
      codesystem_istrue: "true",
      codesystem_xml: "true",
    },
    {
      id: 2,
      codesystem_id: "2",
      codesystem_name: "400",
      codesystem_filename: "400_map.xml",
      codesystem_tablename: "hl7_codesystem_400",
      codesystem_isdeault: "true",
      codesystem_istrue: "true",
      codesystem_xml: "true",
    },
    {
      id: 3,
      codesystem_id: "3",
      codesystem_name: "500",
      codesystem_filename: "500_map.xml",
      codesystem_tablename: "hl7_codesystem_500",
      codesystem_isdeault: "true",
      codesystem_istrue: "true",
      codesystem_xml: "true",
    },
    {
      id: 4,
      codesystem_id: "4",
      codesystem_name: "600",
      codesystem_filename: "600_map.xml",
      codesystem_tablename: "hl7_codesystem_600",
      codesystem_isdeault: "true",
      codesystem_istrue: "true",
      codesystem_xml: "true",
    },
    {
      id: 5,
      codesystem_id: "5",
      codesystem_name: "700",
      codesystem_filename: "700_map.xml",
      codesystem_tablename: "hl7_codesystem_700",
      codesystem_isdeault: "true",
      codesystem_istrue: "true",
      codesystem_xml: "true",
    }
  ];

  /**
   * Get mock codesystem data
   * @returns Observable of mock codesystem data
   */
  getCodesystem(): Observable<any[]> {
    return of(this.mockCodesystemData);
  }

  /**
   * Get mock codesystem detail data by ID
   * @param id The ID of the codesystem to retrieve
   * @returns Observable of mock codesystem detail data
   */
  getCodesystemDetail(id: string): Observable<any> {
    const codesystem = this.mockCodesystemData.find(cs => cs.id.toString() === id);

    if (codesystem) {
      // Return a copy of the codesystem with additional detail information
      return of({
        ...codesystem,
        detail_description: `Detailed description for codesystem ${codesystem.codesystem_name}`,
        last_updated: new Date().toISOString(),
        version: '1.0.0',
        status: 'Active'
      });
    } else {
      // Return null if codesystem not found
      return of(null);
    }
  }
}
