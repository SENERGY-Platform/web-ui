/*
 *
 *       2018 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 * /
 */

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {MatLegacyDialogHarness as MatDialogHarness} from '@angular/material/legacy-dialog/testing';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { AuthorizationServiceMock } from 'src/app/core/services/authorization.service.mock';
import { KongService } from '../services/kong.service';
import { KongServiceMock } from '../services/kong.service.mock';
import { LadonService } from '../services/ladom.service';
import { LadomServiceMock } from '../services/ladom.service.mock';
import {PermissionsListComponent} from './permissions-list.component';

describe('PermissionsListComponent', () => {
    let component: PermissionsListComponent;
    let fixture: ComponentFixture<PermissionsListComponent>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            declarations: [PermissionsListComponent],
            providers: [
                {provide: AuthorizationService, useClass: AuthorizationServiceMock},
                {provide: MatDialog, useClass: MatDialogHarness},
                {provide: LadonService, useClass: LadomServiceMock},
                {provide: KongService, useClass: KongServiceMock},
            ],
            imports: [
                MatCardModule,
                MatCheckboxModule,
                MatIconModule,
                MatTableModule,
                MatAutocompleteModule,
                MatFormFieldModule,
                FormsModule,
                BrowserAnimationsModule,
                MatSelectModule,
                ReactiveFormsModule,
                MatInputModule,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PermissionsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

});
