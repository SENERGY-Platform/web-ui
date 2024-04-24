import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvPredictionComponent } from './pv-prediction.component';

describe('PvPredictionComponent', () => {
  let component: PvPredictionComponent;
  let fixture: ComponentFixture<PvPredictionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PvPredictionComponent ],
      imports: [
        MatDialogModule,
        HttpClientTestingModule,
        MatSnackBarModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PvPredictionComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {measurement: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
