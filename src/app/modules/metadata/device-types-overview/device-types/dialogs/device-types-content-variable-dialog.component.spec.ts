/*
 * Copyright 2021 InfAI (CC SES)
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

import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {DeviceTypesContentVariableDialogComponent} from './device-types-content-variable-dialog.component';
import {CoreModule} from '../../../../../core/core.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogModule as MatDialogModule, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {
    DeviceTypeAspectModel,
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel
} from '../../shared/device-type.model';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';

describe('DeviceTypesContentVariableDialog', () => {
    let component: DeviceTypesContentVariableDialogComponent;
    let fixture: ComponentFixture<DeviceTypesContentVariableDialogComponent>;

    const matDialogRefSpy: Spy<MatDialogRef<DeviceTypesContentVariableDialogComponent>> =
        createSpyFromClass<MatDialogRef<DeviceTypesContentVariableDialogComponent>>(MatDialogRef);
    function init(contentVariable: DeviceTypeContentVariableModel, concepts: ConceptsCharacteristicsModel[], functions: DeviceTypeFunctionModel[], aspects: DeviceTypeAspectModel[]) {
        TestBed.configureTestingModule({
            imports: [CoreModule, MatDialogModule, MatRadioModule, ReactiveFormsModule, MatSelectModule, MatInputModule, MatCheckboxModule],
            declarations: [DeviceTypesContentVariableDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: matDialogRefSpy },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        contentVariable,
                        concepts,
                        functions,
                        aspects,
                        prohibitedNames: [],
                    },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(waitForAsync(() => {}));

    it(
        'should create the app',
        waitForAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);
            expect(component).toBeTruthy();
        }),
    );

    it(
        'create primitive Type',
        waitForAsync(() => {
            init({} as DeviceTypeContentVariableModel, [], [], []);
            expect(component.isPrimitiveType()).toBe(true);
            expect(component.typeOptionsControl.value).toBe('primitive');
            expect(component.firstFormGroup.invalid).toBe(true);
            component.firstFormGroup.patchValue({
                name: 'testName',
                type: component.primitiveTypes[0].type,
            });
            expect(component.firstFormGroup.valid).toBe(true);
            component.firstFormGroup.patchValue({
                name: 'testName',
                type: component.primitiveTypes[0].type,
                characteristic_id: 'characteristic_id',
                serialization_options: ['serialization_options'],
                unit_reference: 'unit_reference',
                value: 'value',
            });
            expect(component.firstFormGroup.getRawValue()).toEqual({
                indices: null,
                id: null,
                name: 'testName',
                type: component.primitiveTypes[0].type,
                characteristic_id: 'characteristic_id',
                serialization_options: ['serialization_options'],
                unit_reference: 'unit_reference',
                sub_content_variables: null,
                value: 'value',
                aspect_id: null,
                function_id: null,
                is_void: null,
                omit_empty: false,
            });
        }),
    );

    it(
        'edit primitive Type',
        waitForAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {
                indices: [0, 1, 0],
                id: 'id1',
                name: 'testName',
                type: 'https://schema.org/Text',
                characteristic_id: 'characteristic_id',
                serialization_options: ['serialization_options'],
                unit_reference: 'unit_reference',
                value: 'value',
                omit_empty: false,
            } as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);
            expect(component.typeOptionsControl.value).toBe('primitive');
            expect(component.typeOptionsControl.disabled).toBe(true);
            expect(component.firstFormGroup.getRawValue()).toEqual({
                indices: [0, 1, 0],
                id: 'id1',
                name: 'testName',
                type: component.primitiveTypes[0].type,
                characteristic_id: 'characteristic_id',
                serialization_options: ['serialization_options'],
                unit_reference: 'unit_reference',
                sub_content_variables: null,
                value: 'value',
                aspect_id: null,
                function_id: null,
                is_void: null,
                omit_empty: false,
            });
        }),
    );

    it(
        'create non-primitive Type',
        waitForAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);
            component.typeOptionsControl.setValue('non-primitive');
            expect(component.typeOptionsControl.value).toBe('non-primitive');
            expect(component.isPrimitiveType()).toBe(false);
            expect(component.firstFormGroup.invalid).toBe(true);
            component.firstFormGroup.patchValue({
                name: 'testStruct',
                type: component.nonPrimitiveTypes[0].type,
                aspect_id: null,
                function_id: null,
            });
            expect(component.firstFormGroup.valid).toBe(true);
            expect(component.firstFormGroup.getRawValue()).toEqual({
                indices: null,
                id: null,
                name: 'testStruct',
                type: component.nonPrimitiveTypes[0].type,
                characteristic_id: null,
                serialization_options: null,
                unit_reference: null,
                sub_content_variables: [],
                value: null,
                aspect_id: null,
                function_id: null,
                is_void: false,
                omit_empty: false,
            });
        }),
    );

    it(
        'edit non-primitive Type',
        waitForAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {
                id: 'id2',
                name: 'testStruct',
                type: 'https://schema.org/StructuredValue',
                sub_content_variables: [
                    {
                        id: 'id3',
                        name: 'testFloat',
                        type: 'https://schema.org/Float',
                    },
                ] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);
            expect(component.typeOptionsControl.value).toBe('non-primitive');
            expect(component.typeOptionsControl.disabled).toBe(true);
            expect(component.firstFormGroup.getRawValue()).toEqual({
                indices: null,
                id: 'id2',
                name: 'testStruct',
                type: 'https://schema.org/StructuredValue',
                characteristic_id: null,
                serialization_options: null,
                unit_reference: null,
                sub_content_variables: [
                    {
                        id: 'id3',
                        name: 'testFloat',
                        type: 'https://schema.org/Float',
                    },
                ],
                value: null,
                aspect_id: null,
                function_id: null,
                is_void: null,
                omit_empty: false,
            });
        }),
    );
});
