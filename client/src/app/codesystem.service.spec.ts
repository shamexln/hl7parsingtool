import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CodesystemService } from './codesystem.service';

describe('CodesystemService', () => {
  let service: CodesystemService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CodesystemService]
    });
    service = TestBed.inject(CodesystemService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get codesystem data correctly', () => {
    const mockCodesystemData = [
      {
        id: 1,
        code: "LOINC",
        display: "Logical Observation Identifiers Names and Codes",
        version: "2.73",
        description: "LOINC database provides a set of universal names and ID codes for identifying laboratory and clinical test results."
      },
      {
        id: 2,
        code: "SNOMED-CT",
        display: "SNOMED Clinical Terms",
        version: "International 2023-07-31",
        description: "SNOMED CT is a systematically organized computer processable collection of medical terms providing codes, terms, synonyms and definitions used in clinical documentation and reporting."
      }
    ];

    service.getCodesystem().subscribe(response => {
      expect(response).toEqual(mockCodesystemData);
      expect(response.length).toBe(2);
    });

    const req = httpMock.expectOne(`/api/codesystem`);
    expect(req.request.method).toEqual('GET');
    req.flush(mockCodesystemData);
  });

  it('should handle error scenario gracefully', () => {
    const errorMessage = 'Server error';

    service.getCodesystem().subscribe({
      next: () => fail('should fail with 500 error'),
      error: (error) => {
        expect(error.message).toContain('request fail');
      }
    });

    const req = httpMock.expectOne(`/api/codesystem`);
    req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
  });
});
