import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyComponent } from './anomaly.component';

describe('AnomalyComponent', () => {
    let component: AnomalyComponent;
    let fixture: ComponentFixture<AnomalyComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ AnomalyComponent ],
            imports: [
                MatDialogModule,
                HttpClientTestingModule,
                MatSnackBarModule
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AnomalyComponent);
        component = fixture.componentInstance;
        component.widget = {properties: {measurement: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
