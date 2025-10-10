import { TestBed } from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PatientService]
    });
    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get paginated patient data correctly', () => {
    const mockResponse = [{
      rows:  [
        {
          "id": 18,
          "local_time": "2025-04-02 14:25:22",
          "Date": "2025-04-02",
          "Time": "14:2",
          "Hour": "14",
          "bed_label": "icu1",
          "pat_ID": "0012",
          "mon_unit": null,
          "care_unit": null,
          "alarm_grade": "PM",
          "alarm_state": "active",
          "Alarm_Grade_2": null,
          "alarm_message": "196674",
          "param_id": "405",
          "param_value": "20",
          "param_uom": "264928",
          "param_upper_lim": "30",
          "param_lower_lim": "22",
          "Limit_Violation_Type": null,
          "Limit_Violation_Value": null,
          "onset_tick": null,
          "alarm_duration": null,
          "change_time_UTC": null,
          "change_tick": null,
          "aborted": null,
          "received_at": "2025-04-02 06:24:37"
        },
        {
          "id": 19,
          "local_time": "2025-04-02 14:25:22",
          "Date": "2025-04-02",
          "Time": "14:2",
          "Hour": "14",
          "bed_label": "icu1",
          "pat_ID": "0012",
          "mon_unit": null,
          "care_unit": null,
          "alarm_grade": "PM",
          "alarm_state": "active",
          "Alarm_Grade_2": null,
          "alarm_message": "196674",
          "param_id": "150344",
          "param_value": "36.0",
          "param_uom": "268192",
          "param_upper_lim": "39.0",
          "param_lower_lim": "37.0",
          "Limit_Violation_Type": null,
          "Limit_Violation_Value": null,
          "onset_tick": null,
          "alarm_duration": null,
          "change_time_UTC": null,
          "change_tick": null,
          "aborted": null,
          "received_at": "2025-04-02 06:24:37"
        },
        {
          "id": 20,
          "local_time": "2025-04-02 14:25:22",
          "Date": "2025-04-02",
          "Time": "14:2",
          "Hour": "14",
          "bed_label": "icu1",
          "pat_ID": "0012",
          "mon_unit": null,
          "care_unit": null,
          "alarm_grade": "PM",
          "alarm_state": "active",
          "Alarm_Grade_2": null,
          "alarm_message": "196674",
          "param_id": "150456",
          "param_value": "98",
          "param_uom": "262688",
          "param_upper_lim": "100",
          "param_lower_lim": "99",
          "Limit_Violation_Type": null,
          "Limit_Violation_Value": null,
          "onset_tick": null,
          "alarm_duration": null,
          "change_time_UTC": null,
          "change_tick": null,
          "aborted": null,
          "received_at": "2025-04-02 06:24:37"
        },
        {
          "id": 21,
          "local_time": "2025-04-02 14:27:24",
          "Date": "2025-04-02",
          "Time": "14:2",
          "Hour": "14",
          "bed_label": "icu1",
          "pat_ID": "0012",
          "mon_unit": null,
          "care_unit": null,
          "alarm_grade": "PM",
          "alarm_state": "active",
          "Alarm_Grade_2": null,
          "alarm_message": "196674",
          "param_id": "147842",
          "param_value": "60",
          "param_uom": "264864",
          "param_upper_lim": "120",
          "param_lower_lim": "66",
          "Limit_Violation_Type": null,
          "Limit_Violation_Value": null,
          "onset_tick": null,
          "alarm_duration": null,
          "change_time_UTC": null,
          "change_tick": null,
          "aborted": null,
          "received_at": "2025-04-02 06:26:39"
        },
        {
          "id": 22,
          "local_time": "2025-04-02 14:27:31",
          "Date": "2025-04-02",
          "Time": "14:2",
          "Hour": "14",
          "bed_label": "icu1",
          "pat_ID": "0012",
          "mon_unit": null,
          "care_unit": null,
          "alarm_grade": "PM",
          "alarm_state": "active",
          "Alarm_Grade_2": null,
          "alarm_message": "196674",
          "param_id": "150456",
          "param_value": "98",
          "param_uom": "262688",
          "param_upper_lim": "100",
          "param_lower_lim": "99",
          "Limit_Violation_Type": null,
          "Limit_Violation_Value": null,
          "onset_tick": null,
          "alarm_duration": null,
          "change_time_UTC": null,
          "change_tick": null,
          "aborted": null,
          "received_at": "2025-04-02 06:26:46"
        }
      ],
      total: 2,
      page: 1,
      pageSize: 2,
      totalPages: 1
    }];

    service.getPaginatedPatientById('0012', 1, 2).subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
      expect(response[0].rows.length).toBe(2);
      expect(response[0].total).toBe(2);
    });

    const req = httpMock.expectOne(req =>
      req.method === 'GET' &&
      req.url === '/api/patients/0012/paginated' &&
      req.params.get('page') === '1' &&
      req.params.get('pageSize') === '2');

    expect(req.request.method).toEqual('GET');
    req.flush(mockResponse);
  });

  it('should handle error scenario gracefully', () => {
    const errorMessage = 'Server error';

    service.getPaginatedPatientById('0012', 1, 2).subscribe({
      next: () => fail('should fail with 500 error'),
      error: (error) => {
        expect(error.status).toBe(500);
        expect(error.error).toEqual(errorMessage);
      }
    });

    const req = httpMock.expectOne(req =>
      req.method === 'GET' &&
      req.url === '/api/patients/0012/paginated' &&
      req.params.get('page') === '1' &&
      req.params.get('pageSize') === '2');

    // 模拟服务器错误
    req.flush(errorMessage, {status: 500, statusText: 'Internal Server Error'});
  });


});
