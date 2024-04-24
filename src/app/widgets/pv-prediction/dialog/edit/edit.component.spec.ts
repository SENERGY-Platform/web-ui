import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';

import { PVPredictionEditComponent } from './edit.component';

describe('PVPredictionEditComponent', () => {
    let component: PVPredictionEditComponent;
    let fixture: ComponentFixture<PVPredictionEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ PVPredictionEditComponent ],
            imports: [
                MatDialogModule,
                HttpClientTestingModule,
                MatSnackBarModule
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {} },
                { provide: MatDialogRef, useValue: {}},
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PVPredictionEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
