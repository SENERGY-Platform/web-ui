import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
import { LadonService } from '../services/ladom.service';
import { PermissionModel } from '../permission.model';

import {PermissionsEditComponent} from './permissions-edit.component';
import { LadomServiceMock } from '../services/ladom.service.mock';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { KongServiceMock } from '../services/kong.service.mock';
import { KongService } from '../services/kong.service';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';

describe('PermissionsEditComponent', () => {
    let component: PermissionsEditComponent;
    let fixture: ComponentFixture<PermissionsEditComponent>;

    const snackBarMock = jasmine.createSpyObj(['open']);

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PermissionsEditComponent],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {"permission": {"id": "id", "subject": "admin", "resource": "", "actions": ["GET"]}, "roles": [], "users": [], "clients": []}},
                FormBuilder,
                {provide: AuthorizationService, useClass: AuthorizationServiceMock},
                {provide: LadonService, useClass: LadomServiceMock},
                {provide: KongService, useClass: KongServiceMock},
                {
                    provide: ActivatedRoute, useValue: {
                        params: of([{id: 0}]),
                        snapshot: {
                            paramMap: {
                                get: () => '',
                            },
                        },
                    },
                },
                {provide: MatSnackBar, useValue: snackBarMock},
            ],
            imports: [
                MatAutocompleteModule,
                MatCheckboxModule,
                MatRadioModule,
                MatSelectModule,
                MatFormFieldModule,
                BrowserAnimationsModule,
                FormsModule,
                ReactiveFormsModule,
                MatInputModule,
            ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PermissionsEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
