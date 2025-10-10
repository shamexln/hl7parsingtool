import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodesystemdetailComponent } from './codesystemdetail.component';

describe('CodesystemdetailComponent', () => {
  let component: CodesystemdetailComponent;
  let fixture: ComponentFixture<CodesystemdetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodesystemdetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodesystemdetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
