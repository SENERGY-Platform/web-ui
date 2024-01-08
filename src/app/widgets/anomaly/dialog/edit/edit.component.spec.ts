import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { EditComponent } from './edit.component';

describe('EditComponent', () => {
    let component: EditComponent;
    let fixture: ComponentFixture<EditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ EditComponent ],
            imports: [
                MatDialogModule,
                HttpClientTestingModule,
                MatSnackBarModule
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {} },
                {provide: MatDialogRef, useValue: {}},
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(EditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
