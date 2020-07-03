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

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DeviceTypesContentVariableDialogComponent} from './device-types-content-variable-dialog.component';
import {CoreModule} from '../../../../../core/core.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ConceptsService} from '../../../concepts/shared/concepts.service';
import {DeviceTypeContentVariableModel, DeviceTypeFunctionModel} from '../../shared/device-type.model';
import {MatRadioModule} from '@angular/material/radio';
import {ReactiveFormsModule} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {of} from 'rxjs';

fdescribe('DeviceTypesContentVariableDialog', () => {
    let component: DeviceTypesContentVariableDialogComponent;
    let fixture: ComponentFixture<DeviceTypesContentVariableDialogComponent>;

    const matDialogRefSpy: Spy<MatDialogRef<DeviceTypesContentVariableDialogComponent>> = createSpyFromClass<MatDialogRef<DeviceTypesContentVariableDialogComponent>>(MatDialogRef);
    const conceptServiceSpy: Spy<ConceptsService> = createSpyFromClass(ConceptsService);

    function init(contentVariable: DeviceTypeContentVariableModel, functions: DeviceTypeFunctionModel[]) {
        TestBed.configureTestingModule({
            imports: [CoreModule, MatDialogModule, MatRadioModule, ReactiveFormsModule, MatSelectModule, MatInputModule],
            declarations: [
                DeviceTypesContentVariableDialogComponent
            ],
            providers: [
                {provide: MatDialogRef, useValue: matDialogRefSpy},
                {provide: ConceptsService, useValue: conceptServiceSpy},
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {contentVariable: contentVariable, functions: functions}
                },
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(async(() => {
    }));

    it('should create the app', async(() => {
        const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
        init(contentVariable, []);
        expect(component).toBeTruthy();
    }));

    it('create primitive Type', async(() => {
        init({} as DeviceTypeContentVariableModel, []);
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
            id: null,
            name: 'testName',
            type: component.primitiveTypes[0].type,
            characteristic_id: 'characteristic_id',
            serialization_options: ['serialization_options'],
            unit_reference: 'unit_reference',
            sub_content_variables: null,
            value: 'value',
        });
    }));

    it('edit primitive Type', async(() => {
        const contentVariable: DeviceTypeContentVariableModel = {
            id: 'id1',
            name: 'testName',
            type: 'https://schema.org/Text',
            characteristic_id: 'characteristic_id',
            serialization_options: ['serialization_options'],
            unit_reference: 'unit_reference',
            value: 'value',
        } as DeviceTypeContentVariableModel;
        init(contentVariable, []);
        expect(component.typeOptionsControl.value).toBe('primitive');
        expect(component.typeOptionsControl.disabled).toBe(true);
        expect(component.firstFormGroup.getRawValue()).toEqual({
            id: 'id1',
            name: 'testName',
            type: component.primitiveTypes[0].type,
            characteristic_id: 'characteristic_id',
            serialization_options: ['serialization_options'],
            unit_reference: 'unit_reference',
            sub_content_variables: null,
            value: 'value',
        });
    }));

    it('create non-primitive Type', async(() => {
        const contentVariable: DeviceTypeContentVariableModel = {} as DeviceTypeContentVariableModel;
        init(contentVariable, []);
        component.typeOptionsControl.setValue('non-primitive');
        expect(component.typeOptionsControl.value).toBe('non-primitive');
        expect(component.isPrimitiveType()).toBe(false);
        expect(component.firstFormGroup.invalid).toBe(true);
        component.firstFormGroup.patchValue({
            name: 'testStruct',
            type: component.nonPrimitiveTypes[0].type,
        });
        expect(component.firstFormGroup.valid).toBe(true);
        expect(component.firstFormGroup.getRawValue()).toEqual({
            id: null,
            name: 'testStruct',
            type: component.nonPrimitiveTypes[0].type,
            characteristic_id: null,
            serialization_options: null,
            unit_reference: null,
            sub_content_variables: [],
            value: null,
        });
    }));

    it('edit non-primitive Type', async(() => {
        const contentVariable: DeviceTypeContentVariableModel = {
            id: 'id2',
            name: 'testStruct',
            type: 'https://schema.org/StructuredValue',
            sub_content_variables: [{
                id: 'id3',
                name: 'testFloat',
                type: 'https://schema.org/Float'
            }] as DeviceTypeContentVariableModel[],
        } as DeviceTypeContentVariableModel;
        init(contentVariable, []);
        expect(component.typeOptionsControl.value).toBe('non-primitive');
        expect(component.typeOptionsControl.disabled).toBe(true);
        expect(component.firstFormGroup.getRawValue()).toEqual({
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
                    type: 'https://schema.org/Float'
                }
            ],
            value: null,
        });
    }));

    it('init concepts and characteristics', async(() => {
        conceptServiceSpy.getConceptWithCharacteristics.and.returnValue(of({
            id: '1',
        } as  ConceptsCharacteristicsModel));
        const functions: DeviceTypeFunctionModel[] = [{
            id: 'func_id_1',
            name: 'without_concept_id',
            rdf_type: 'rdf_type',
            concept_id: ''
        },
            {
                id: 'func_id_2',
                name: 'with_concept_id',
                rdf_type: 'rdf_type',
                concept_id: 'concept_id_1'
            }];
        init({} as DeviceTypeContentVariableModel, functions);
        expect(component.functions).toEqual(functions);
        expect(component.concepts.length).toBe(1);
    }));




});
