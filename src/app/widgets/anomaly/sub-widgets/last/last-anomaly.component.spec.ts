import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LastAnomalyComponent } from './last-anomaly.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('LastAnomalyComponent', () => {
  let component: LastAnomalyComponent;
  let fixture: ComponentFixture<LastAnomalyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
      declarations: [ LastAnomalyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LastAnomalyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
