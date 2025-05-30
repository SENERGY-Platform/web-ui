/*
 * Copyright 2025 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
import { LadonService } from '../shared/services/ladom.service';

import { PermissionsEditComponent } from './permissions-edit.component';
import { LadomServiceMock } from '../shared/services/ladom.service.mock';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { KongService } from '../shared/services/kong.service';
import { KongServiceMock } from '../shared/services/kong.service.mock';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PermissionsEditComponent', () => {
    let component: PermissionsEditComponent;
    let fixture: ComponentFixture<PermissionsEditComponent>;

    const snackBarMock = jasmine.createSpyObj(['open']);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
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
