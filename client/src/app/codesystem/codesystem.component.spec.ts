import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {of, throwError} from 'rxjs';

import {CodesystemComponent} from './codesystem.component';
import {CodesystemService} from '../codesystem.service';
import {NgFor, NgIf} from '@angular/common';
import {ButtonComponent} from '@odx/angular/components/button';

describe('CodesystemComponent', () => {
  let component: CodesystemComponent;
  let fixture: ComponentFixture<CodesystemComponent>;
  let codesystemServiceSpy: jasmine.SpyObj<CodesystemService>;

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

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('CodesystemService', ['getCodesystem']);

    await TestBed.configureTestingModule({
      imports: [
        CodesystemComponent,
        HttpClientTestingModule,
        NgFor,
        NgIf,
        ButtonComponent
      ],
      providers: [
        {provide: CodesystemService, useValue: spy}
      ]
    })
      .compileComponents();

    codesystemServiceSpy = TestBed.inject(CodesystemService) as jasmine.SpyObj<CodesystemService>;
    fixture = TestBed.createComponent(CodesystemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    codesystemServiceSpy.getCodesystem.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load codesystems on init', () => {
    codesystemServiceSpy.getCodesystem.and.returnValue(of(mockCodesystemData));
    fixture.detectChanges();

    expect(codesystemServiceSpy.getCodesystem).toHaveBeenCalled();
    expect(component.codesystems).toEqual(mockCodesystemData);
  });

  it('should handle error when loading codesystems', () => {
    const errorMessage = 'Error loading codesystems';
    codesystemServiceSpy.getCodesystem.and.returnValue(throwError(() => new Error(errorMessage)));
    fixture.detectChanges();

    expect(codesystemServiceSpy.getCodesystem).toHaveBeenCalled();
    expect(component.codesystems).toEqual([]);
  });

  it('should refresh codesystems when fetchCodesystems is called', () => {
    codesystemServiceSpy.getCodesystem.and.returnValue(of(mockCodesystemData));
    fixture.detectChanges();

    // Reset the spy call count
    codesystemServiceSpy.getCodesystem.calls.reset();

    // Call fetchCodesystems
    component.fetchCodesystems();

    expect(codesystemServiceSpy.getCodesystem).toHaveBeenCalled();
    expect(component.codesystems).toEqual(mockCodesystemData);
  });
});
