# Mock Data for Testing

This directory contains mock data and services for testing purposes.

## CodesystemMockService

The `CodesystemMockService` provides mock data for testing the Codesystem functionality without requiring a backend API.

### Usage

#### In Component Tests

To use the mock service in component tests:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CodesystemComponent } from './codesystem.component';
import { CodesystemService } from '../codesystem.service';

describe('CodesystemComponent', () => {
  let component: CodesystemComponent;
  let fixture: ComponentFixture<CodesystemComponent>;
  let codesystemServiceSpy: jasmine.SpyObj<CodesystemService>;

  // Mock data
  const mockCodesystemData = [
    {
      id: 1,
      code: "LOINC",
      display: "Logical Observation Identifiers Names and Codes",
      version: "2.73",
      description: "LOINC database provides a set of universal names and ID codes for identifying laboratory and clinical test results."
    },
    // ... more mock data
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('CodesystemService', ['getCodesystem']);
    
    await TestBed.configureTestingModule({
      imports: [CodesystemComponent],
      providers: [
        { provide: CodesystemService, useValue: spy }
      ]
    }).compileComponents();

    codesystemServiceSpy = TestBed.inject(CodesystemService) as jasmine.SpyObj<CodesystemService>;
    fixture = TestBed.createComponent(CodesystemComponent);
    component = fixture.componentInstance;
    
    // Set up the spy to return mock data
    codesystemServiceSpy.getCodesystem.and.returnValue(of(mockCodesystemData));
    fixture.detectChanges();
  });

  // Tests...
});
```

#### For Manual Testing

For manual testing or development without a backend, you can provide the mock service instead of the real service:

```typescript
// In your module or component provider
import { CodesystemService } from './codesystem.service';
import { CodesystemMockService } from './mock/codesystem-mock';

@NgModule({
  // ...
  providers: [
    // Use this for development/testing without a backend
    { provide: CodesystemService, useClass: CodesystemMockService },
    
    // Use this for production
    // { provide: CodesystemService, useClass: CodesystemService },
  ]
})
```

### Available Mock Data

The mock service includes sample data for common medical coding systems:

1. LOINC (Logical Observation Identifiers Names and Codes)
2. SNOMED-CT (SNOMED Clinical Terms)
3. ICD-10 (International Classification of Diseases)
4. RxNorm (Prescription drug terminology)
5. CPT (Current Procedural Terminology)

Each entry includes:
- id: Unique identifier
- code: The code system's short name
- display: The full name of the code system
- version: The version of the code system
- description: A brief description of the code system's purpose

### Extending the Mock Data

To add more mock data, edit the `mockCodesystemData` array in `codesystem-mock.ts`.
