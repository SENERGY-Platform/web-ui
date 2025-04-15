import {waitForAsync, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatDialogHarness} from '@angular/material/dialog/testing';
import {MatInputModule} from '@angular/material/input';
import {MatRadioModule} from '@angular/material/radio';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTableModule} from '@angular/material/table';

import {PermissionsDialogImportComponent} from './permissions-dialog-import.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PermissionsDialogImportComponent', () => {
    let component: PermissionsDialogImportComponent;
    let fixture: ComponentFixture<PermissionsDialogImportComponent>;

    const snackBarMock = jasmine.createSpyObj(['open']);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            declarations: [PermissionsDialogImportComponent],
            providers: [
                {provide: MatDialog, useClass: MatDialogHarness},
                {provide: MatDialogRef, useValue: {}},
                {provide: MatSnackBar, useValue: snackBarMock},
            ],
            imports: [
                MatCheckboxModule,
                MatTableModule,
                MatRadioModule,
                FormsModule,
                ReactiveFormsModule,
                MatInputModule,
            ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PermissionsDialogImportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
