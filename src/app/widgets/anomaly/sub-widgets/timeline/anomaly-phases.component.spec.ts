import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnomalyPhasesComponent } from './anomaly-phases.component';

describe('AnomalyPhasesComponent', () => {
  let component: AnomalyPhasesComponent;
  let fixture: ComponentFixture<AnomalyPhasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnomalyPhasesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnomalyPhasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
