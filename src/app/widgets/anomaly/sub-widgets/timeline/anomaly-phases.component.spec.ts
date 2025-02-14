import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyPhasesComponent } from './anomaly-phases.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AnomalyPhasesComponent', () => {
  let component: AnomalyPhasesComponent;
  let fixture: ComponentFixture<AnomalyPhasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [AnomalyPhasesComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(AnomalyPhasesComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {
      anomalyDetection: {
        timeRangeConfig: {
          timeRange: {level: 'h', time: 1}
        },
        showDebug: false,
        showFrequencyAnomalies: false,
        export: '',
        timelineConfig: {},
        deviceValueConfig: {
          exports: [],
          fields: []
        },
        visualizationType: 'line'
      }
    }, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
