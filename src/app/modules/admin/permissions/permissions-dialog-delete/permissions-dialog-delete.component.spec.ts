import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';

import {PermissionsDialogDeleteComponent} from './permissions-dialog-delete.component';

describe('PermissionsDialogDeleteComponent', () => {
    let component: PermissionsDialogDeleteComponent;
    let fixture: ComponentFixture<PermissionsDialogDeleteComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PermissionsDialogDeleteComponent],
            providers: [
                {provide: MatDialogRef, useValue: {}},
            ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PermissionsDialogDeleteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
