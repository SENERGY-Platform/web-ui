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

import {ComponentFixture, fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {DeviceTypesContentVariableDialogComponent} from './device-types-content-variable-dialog.component';
import {CoreModule} from '../../../../../core/core.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {
    DeviceTypeAspectModel,
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel
} from '../../shared/device-type.model';
import {MatRadioModule} from '@angular/material/radio';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MtxSelectModule } from '@ng-matero/extensions/select';

describe('DeviceTypesContentVariableDialog', () => {
    let component: DeviceTypesContentVariableDialogComponent;
    let fixture: ComponentFixture<DeviceTypesContentVariableDialogComponent>;

    const matDialogRefSpy: Spy<MatDialogRef<DeviceTypesContentVariableDialogComponent>> =
        createSpyFromClass<MatDialogRef<DeviceTypesContentVariableDialogComponent>>(MatDialogRef);
    function init(contentVariable: DeviceTypeContentVariableModel, concepts: ConceptsCharacteristicsModel[], functions: DeviceTypeFunctionModel[], aspects: DeviceTypeAspectModel[]) {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, MatDialogModule, MatRadioModule, ReactiveFormsModule, MatInputModule, MatCheckboxModule, MtxSelectModule],
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

    beforeEach(fakeAsync(() => {}));

    it(
        'should create the app',
        fakeAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);

            fixture.detectChanges();
            flush();
            expect(component).toBeTruthy();
        }),
    );

    it(
        'create primitive Type',
        fakeAsync(() => {
            init({} as DeviceTypeContentVariableModel, [], [], []);

            fixture.detectChanges();
            flush();

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
            fixture.detectChanges();
            flush();

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
        fakeAsync(() => {
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

            fixture.detectChanges();
            flush();
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
        fakeAsync(() => {
            const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
            init(contentVariable, [], [], []);
            component.typeOptionsControl.setValue('non-primitive');

            fixture.detectChanges();
            tick(100);
            flush();

            expect(component.typeOptionsControl.value).toBe('non-primitive');
            expect(component.isPrimitiveType()).toBe(false);
            expect(component.firstFormGroup.invalid).toBe(true);
            component.firstFormGroup.patchValue({
                name: 'testStruct',
                type: component.nonPrimitiveTypes[0].type,
                aspect_id: null,
                function_id: null,
            });
            fixture.detectChanges();
            tick(100);
            flush();

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
        fakeAsync(() => {
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

            fixture.detectChanges();
            flush();

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
