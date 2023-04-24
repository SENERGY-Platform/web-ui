import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {MatLegacyDialogHarness as MatDialogHarness} from '@angular/material/legacy-dialog/testing';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';

import {PermissionsDialogImportComponent} from './permissions-dialog-import.component';

describe('PermissionsDialogImportComponent', () => {
    let component: PermissionsDialogImportComponent;
    let fixture: ComponentFixture<PermissionsDialogImportComponent>;

    const snackBarMock = jasmine.createSpyObj(['open']);

    beforeEach(async(() => {
        TestBed.configureTestingModule({
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
