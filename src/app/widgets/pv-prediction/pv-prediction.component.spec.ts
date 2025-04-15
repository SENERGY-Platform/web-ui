import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PvPredictionComponent } from './pv-prediction.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PvPredictionComponent', () => {
  let component: PvPredictionComponent;
  let fixture: ComponentFixture<PvPredictionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [PvPredictionComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(PvPredictionComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {measurement: undefined, pvPrediction: {exportID: '1234', displayNextValue: false, displayTimeline: false, nextValueConfig: {level: '', time: 0}}}, id: '1234', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
