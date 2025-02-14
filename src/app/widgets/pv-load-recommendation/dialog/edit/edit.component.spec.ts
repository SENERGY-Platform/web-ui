import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PVLoadRecommendationEditComponent } from './edit.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PVLoadRecommendationEditComponent', () => {
    let component: PVLoadRecommendationEditComponent;
    let fixture: ComponentFixture<PVLoadRecommendationEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
    declarations: [PVLoadRecommendationEditComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
})
            .compileComponents();

        fixture = TestBed.createComponent(PVLoadRecommendationEditComponent);
        component = fixture.componentInstance;
        component.widget = {properties: {measurement: undefined}, id: '', name: '', type: '', y: 1, x: 1, cols: 1, rows: 1};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
