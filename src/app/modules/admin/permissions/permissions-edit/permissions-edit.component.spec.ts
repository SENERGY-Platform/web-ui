import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSnackBar} from '@angular/material/snack-bar';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
import { LadonService } from '../shared/services/ladom.service';
import { PermissionModel } from '../shared/permission.model';

import {PermissionsEditComponent} from './permissions-edit.component';
import { LadomServiceMock } from '../shared/services/ladom.service.mock';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { KongService } from '../shared/services/kong.service';
import { KongServiceMock } from '../shared/services/kong.service.mock';

describe('PermissionsEditComponent', () => {
    let component: PermissionsEditComponent;
    let fixture: ComponentFixture<PermissionsEditComponent>;

    const snackBarMock = jasmine.createSpyObj(['open']);

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PermissionsEditComponent],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {permission: {id: 'id', subject: 'admin', resource: '', actions: ['GET']}, roles: [], users: [], clients: []}},
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
