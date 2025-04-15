import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AnomalyReconstructionComponent } from './reconstruction.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AnomalyReconstructionComponent', () => {
  let component: AnomalyReconstructionComponent;
  let fixture: ComponentFixture<AnomalyReconstructionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
      declarations: [ AnomalyReconstructionComponent ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {anomaly: {original_reconstructed_curves: []}}},
        {provide: MatDialogRef, useValue: {}},
    ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnomalyReconstructionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
