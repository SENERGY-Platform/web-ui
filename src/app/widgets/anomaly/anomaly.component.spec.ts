import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyComponent } from './anomaly.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AnomalyWidgetProperties } from './shared/anomaly.model';

describe('AnomalyComponent', () => {
    let component: AnomalyComponent;
    let fixture: ComponentFixture<AnomalyComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [AnomalyComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
            .compileComponents();

        fixture = TestBed.createComponent(AnomalyComponent);
        component = fixture.componentInstance;
        component.widget = {properties: {measurement: undefined, anomalyDetection: {export: '1234'} as AnomalyWidgetProperties}, id: '1234', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
