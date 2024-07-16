import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { IncidentDialogComponent } from './incident-dialog.component';

describe('IncidentDialogComponent', () => {
  let component: IncidentDialogComponent;
  let fixture: ComponentFixture<IncidentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IncidentDialogComponent ],
      imports: [
        MatDialogModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {config: {message: ''}} },
        {provide: MatDialogRef, useValue: {}},
    ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
