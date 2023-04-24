/*
 * Copyright 2020 InfAI (CC SES)
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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentVariableDialogComponent } from './content-variable-dialog.component';
import { CoreModule } from '../../../../core/core.module';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogModule as MatDialogModule, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { FlexModule } from '@angular/flex-layout';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { DeviceTypeCharacteristicsModel } from '../../../metadata/device-types-overview/shared/device-type.model';

describe('ContentVariableDialogComponent', () => {
    let component: ContentVariableDialogComponent;
    let fixture: ComponentFixture<ContentVariableDialogComponent>;
    const exampleChar: DeviceTypeCharacteristicsModel = {
        id: 'char0',
        name: 'char0',
        display_unit: '',
        type: 'https://schema.org/Text',
        sub_characteristics: null,
    };
    const typeConceptCharacteristics: Map<string, Map<string, DeviceTypeCharacteristicsModel[]>> = new Map();
    const m: Map<string, DeviceTypeCharacteristicsModel[]> = new Map();
    m.set('testconcept', [exampleChar]);
    typeConceptCharacteristics.set('https://schema.org/Text', m);

    const dialogData = {
        typeConceptCharacteristics,
        content: undefined,
        infoOnly: false,
    };
    let r: any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ContentVariableDialogComponent],
            imports: [
                CoreModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                MatCheckboxModule,
                FlexModule,
                MatTooltipModule,
                MatButtonModule,
                MatFormFieldModule,
                MatInputModule,
                MatSelectModule,
                MatDialogModule,
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (rv: any) => {
                            r = rv;
                        },
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should allow editing', () => {
        expect(component.form.disabled).toBeFalse();
    });

    it('should return a valid value', () => {
        r = undefined;
        const val = {
            name: 'test',
            type: component.STRING,
            characteristic_id: 'char0',
            use_as_tag: true,
            function_id: null,
            aspect_id: null,
        };
        component.form.patchValue(val);
        component.save();
        expect(r).toEqual(val);
    });
});
