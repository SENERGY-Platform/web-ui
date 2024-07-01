import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeakageDetectionComponent } from './leakage-detection.component';

describe('LeakageDetectionComponent', () => {
  let component: LeakageDetectionComponent;
  let fixture: ComponentFixture<LeakageDetectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LeakageDetectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeakageDetectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
