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
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DeviceTypesComponent} from './device-types.component';
import {CoreModule} from '../../../../core/core.module';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {MatStepperModule} from '@angular/material/stepper';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatIconModule} from '@angular/material/icon';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {DeviceTypeService} from '../shared/device-type.service';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeServiceModel
} from '../shared/device-type.model';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FlexLayoutModule} from '@angular/flex-layout';
import {util} from 'jointjs';
import uuid = util.uuid;

describe('DeviceTypesComponent', () => {
    let component: DeviceTypesComponent;
    let fixture: ComponentFixture<DeviceTypesComponent>;
    const devicetypesEdit = {path: 'devices/devicetypesoverview/devicetypes/:id', pathMatch: 'full', component: DeviceTypesComponent, data: { header: 'Devices' }};

    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);

    function init(id: string, func: string) {

        deviceTypeServiceSpy.getLeafCharacteristics.and.returnValue(of([{
            id: 'char:1',
            min_value: 0,
            name: 'lux',
            rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
            type: 'https://schema.org/Float'
        }]));
        deviceTypeServiceSpy.getProtocols.and.returnValue(of([{
            id: 'protocol_1', handler: 'connector', name: 'standard-connector', protocol_segments: [{
                id: 'protocol_segment_1',
                name: 'metadata'
            }, {
                id: 'protocol_segment_2',
                name: 'data'
            }]
        }] as DeviceTypeProtocolModel[]));
        const args: DeviceTypeModel = {
            id: 'device_id_4711',
            name: 'device_type_name',
            description: 'desc',
            image: 'img',
            device_class: {
                id: 'device_class_1',
                name: 'device_class_name'
            },
            services: [{
                id: 'service_id_1',
                local_id: 'local_id_1',
                name: 'service1',
                description: 'serv_desc',
                protocol_id: 'protocol_1',
                inputs: [{
                    id: 'input_id_1', protocol_segment_id: 'protocol_segment_1', serialization: 'json', content_variable: {
                        id: 'content_variable_1',
                        name: 'power_comsumption',
                        type: 'https://schema.org/StructuredValue',
                        sub_content_variables: [{
                            id: 'sub_content_variable_1',
                            characteristic_id: 'char_1',
                            name: 'level',
                            type: 'https://schema.org/Float',
                            value: 0
                        },
                            {
                                id: 'sub_content_variable_2',
                                characteristic_id: 'char_1',
                                name: 'level2',
                                type: 'https://schema.org/Float',
                                value: 0,
                                unit_reference: null
                            }]
                    }
                }],
                outputs: [{
                    id: 'output_id_1', protocol_segment_id: 'protocol_segment_2', serialization: 'json', content_variable: {
                        id: 'content_variable_out_1',
                        name: 'brightness',
                        type: 'https://schema.org/Float',
                    }
                }],
            }] as DeviceTypeServiceModel[]
        };
        deviceTypeServiceSpy.getDeviceType.and.returnValue(of(args));
        deviceTypeServiceSpy.getDeviceClasses.and.returnValue(of());
        deviceTypeServiceSpy.getControllingFunctions.and.returnValue(of());
        deviceTypeServiceSpy.getMeasuringFunctions.and.returnValue(of());
        deviceTypeServiceSpy.getAspects.and.returnValue(of());
        deviceTypeServiceSpy.createDeviceType.and.returnValue(of({id: uuid()}));
        deviceTypeServiceSpy.updateDeviceType.and.returnValue(of({id: uuid()}));

        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule.withRoutes([devicetypesEdit]), HttpClientTestingModule, MatSnackBarModule, MatStepperModule,
                MatFormFieldModule, MatSelectModule, MatIconModule, ReactiveFormsModule, MatInputModule, MatExpansionModule, MatTabsModule,
                MatTooltipModule, FlexLayoutModule],
            declarations: [
                DeviceTypesComponent
            ],
            providers: [
                {
                    provide: ActivatedRoute, useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({'id': id}),
                            queryParamMap: convertToParamMap({'function': func})
                        }
                    }
                },
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(async(() => {
    }));

    it('should create the app', async(() => {
        init('', '');
        expect(component).toBeTruthy();
    }));

    it('init create', async(() => {
        init('', 'create');
        expect(component.id).toBe('');
        expect(component.queryParamFunction).toBe('create');
        expect(component.editable).toBe(true);
        expect(component.firstFormGroup.getRawValue()).toEqual({
            id: undefined,
            name: null,
            description: null,
            image: null,
            device_class: null
        });
        expect(component.services.length).toBe(0);
    }));

    it('init copy', async(() => {
        init('device_id_4711', 'copy');

        expect(component.id).toBe('device_id_4711');
        expect(component.queryParamFunction).toBe('copy');
        expect(component.leafCharacteristics.length).toBe(1);
        expect(component.editable).toBe(true);
        expect(component.firstFormGroup.getRawValue()).toEqual({
            id: '', // id must be empty, cause its deleted
            name: 'device_type_name',
            description: 'desc',
            image: 'img',
            device_class: {
                id: 'device_class_1',
                name: 'device_class_name'
            }
        });
        expect(component.serviceControl(0).getRawValue().id).toBe('');
        expect(component.serviceControl(0).value.local_id).toBe('local_id_1');
        expect(component.serviceControl(0).value.name).toBe('service1');
        expect(component.serviceControl(0).value.description).toBe('serv_desc');
        expect(component.serviceControl(0).value.protocol_id).toBe('protocol_1');
        expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value).toEqual({
            id: '',
            name: 'metadata',
            serialization: 'json',
            content_variable_raw: '{\n' +
                '     "name": "power_comsumption",\n' +
                '     "type": "https://schema.org/StructuredValue",\n' +
                '     "characteristic_id": null,\n' +
                '     "value": null,\n' +
                '     "sub_content_variables": [\n' +
                '          {\n' +
                '               "name": "level",\n' +
                '               "type": "https://schema.org/Float",\n' +
                '               "characteristic_id": "char_1",\n' +
                '               "value": 0,\n' +
                '               "sub_content_variables": null,\n' +
                '               "serialization_options": null,\n' +
                '               "unit_reference": null\n' +
                '          },\n' +
                '          {\n' +
                '               "name": "level2",\n' +
                '               "type": "https://schema.org/Float",\n' +
                '               "characteristic_id": "char_1",\n' +
                '               "value": 0,\n' +
                '               "sub_content_variables": null,\n' +
                '               "serialization_options": null,\n' +
                '               "unit_reference": null\n' +
                '          }\n' +
                '     ],\n' +
                '     "serialization_options": null,\n' +
                '     "unit_reference": null\n' +
                '}',
            content_variable: {
                name: 'power_comsumption',
                type: 'https://schema.org/StructuredValue',
                characteristic_id: null,
                value: null,
                sub_content_variables: [{
                    name: 'level',
                    type: 'https://schema.org/Float',
                    characteristic_id: 'char_1',
                    value: 0,
                    unit_reference: null,
                    sub_content_variables: null,
                    serialization_options: null
                },
                    {
                        name: 'level2',
                        type: 'https://schema.org/Float',
                        characteristic_id: 'char_1',
                        value: 0,
                        unit_reference: null,
                        sub_content_variables: null,
                        serialization_options: null
                    }],
                serialization_options: null,
                unit_reference: null
            },
            protocol_segment_id: 'protocol_segment_1',
            show: true,
        });
        expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value).toEqual({
            id: '',
            name: 'data',
            serialization: null,
            content_variable_raw: null,
            content_variable: '',
            protocol_segment_id: 'protocol_segment_2',
            show: false,
        });
        expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value).toEqual({
            id: '',
            name: 'metadata',
            serialization: null,
            content_variable_raw: null,
            content_variable: '',
            protocol_segment_id: 'protocol_segment_1',
            show: false,
        });
        expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value).toEqual({
            id: '',
            name: 'data',
            serialization: 'json',
            content_variable_raw: '{\n' +
                '     "name": "brightness",\n' +
                '     "type": "https://schema.org/Float",\n' +
                '     "characteristic_id": null,\n' +
                '     "value": null,\n' +
                '     "sub_content_variables": null,\n' +
                '     "serialization_options": null,\n' +
                '     "unit_reference": null\n' +
                '}',
            content_variable: {
                name: 'brightness',
                type: 'https://schema.org/Float',
                characteristic_id: null,
                value: null,
                unit_reference: null,
                sub_content_variables: null,
                serialization_options: null
            },
            protocol_segment_id: 'protocol_segment_2',
            show: true,
        });
        expect(component.services.length).toBe(1);
    }));

    it('check save with copy', async(() => {
        init('device_id_4711', 'copy');
        component.save();
        expect(component.secondFormGroup.getRawValue().services).toEqual([{
            id: '',
            local_id: 'local_id_1',
            name: 'service1',
            description: 'serv_desc',
            protocol_id: 'protocol_1',
            inputs: [
                {
                    id: '',
                    name: 'metadata',
                    serialization: 'json',
                    content_variable_raw: '{\n' +
                        '     "name": "power_comsumption",\n' +
                        '     "type": "https://schema.org/StructuredValue",\n' +
                        '     "characteristic_id": null,\n' +
                        '     "value": null,\n' +
                        '     "sub_content_variables": [\n' +
                        '          {\n' +
                        '               "name": "level",\n' +
                        '               "type": "https://schema.org/Float",\n' +
                        '               "characteristic_id": "char_1",\n' +
                        '               "value": 0,\n' +
                        '               "sub_content_variables": null,\n' +
                        '               "serialization_options": null,\n' +
                        '               "unit_reference": null\n' +
                        '          },\n' +
                        '          {\n' +
                        '               "name": "level2",\n' +
                        '               "type": "https://schema.org/Float",\n' +
                        '               "characteristic_id": "char_1",\n' +
                        '               "value": 0,\n' +
                        '               "sub_content_variables": null,\n' +
                        '               "serialization_options": null,\n' +
                        '               "unit_reference": null\n' +
                        '          }\n' +
                        '     ],\n' +
                        '     "serialization_options": null,\n' +
                        '     "unit_reference": null\n' +
                        '}',
                    content_variable: {
                        id: null,
                        name: 'power_comsumption',
                        type: 'https://schema.org/StructuredValue',
                        characteristic_id: null,
                        value: null,
                        sub_content_variables: [{
                            id: null,
                            name: 'level',
                            type: 'https://schema.org/Float',
                            characteristic_id: 'char_1',
                            value: 0,
                            unit_reference: null,
                            sub_content_variables: null,
                            serialization_options: null
                        },
                            {
                                id: null,
                                name: 'level2',
                                type: 'https://schema.org/Float',
                                characteristic_id: 'char_1',
                                value: 0,
                                unit_reference: null,
                                sub_content_variables: null,
                                serialization_options: null
                            }],
                        serialization_options: null,
                        unit_reference: null
                    },
                    protocol_segment_id: 'protocol_segment_1',
                    show: true,
                }
            ],
            outputs: [{
                id: '',
                name: 'data',
                serialization: 'json',
                content_variable_raw: '{\n' +
                    '     "name": "brightness",\n' +
                    '     "type": "https://schema.org/Float",\n' +
                    '     "characteristic_id": null,\n' +
                    '     "value": null,\n' +
                    '     "sub_content_variables": null,\n' +
                    '     "serialization_options": null,\n' +
                    '     "unit_reference": null\n' +
                    '}',
                content_variable: {
                    id: null,
                    name: 'brightness',
                    type: 'https://schema.org/Float',
                    characteristic_id: null,
                    value: null,
                    sub_content_variables: null,
                    unit_reference: null,
                    serialization_options: null
                },
                protocol_segment_id: 'protocol_segment_2',
                show: true,
            }],
            functionType: {text: ''},
            functions: [],
            aspects: []
        }]);

    }));

    it('check save with edit', async(() => {
        init('device_id_4711', 'edit');
        component.inputOutputContentVariableRaw(component.services.at(0), 'inputs', 0).setValue('{\n' +
            '     "id": "content_variable_1",\n' +
            '     "name": "power_comsumption",\n' +
            '     "type": "https://schema.org/StructuredValue",\n' +
            '     "sub_content_variables": [\n' +
            '          {\n' +
            '               "id": "sub_content_variable_1",\n' +
            '               "characteristic_id": "char_1",\n' +
            '               "name": "level_neu",\n' +
            '               "type": "https://schema.org/Float",\n' +
            '               "value": 0\n' +
            '          }' +
            '     ]\n' +
            '}');
        component.save();
        expect(component.secondFormGroup.getRawValue().services).toEqual([{
            id: 'service_id_1',
            local_id: 'local_id_1',
            name: 'service1',
            description: 'serv_desc',
            protocol_id: 'protocol_1',
            inputs: [
                {
                    id: 'input_id_1',
                    name: 'metadata',
                    serialization: 'json',
                    content_variable_raw: '{\n' +
                        '     "id": "content_variable_1",\n' +
                        '     "name": "power_comsumption",\n' +
                        '     "type": "https://schema.org/StructuredValue",\n' +
                        '     "sub_content_variables": [\n' +
                        '          {\n' +
                        '               "id": "sub_content_variable_1",\n' +
                        '               "characteristic_id": "char_1",\n' +
                        '               "name": "level_neu",\n' +
                        '               "type": "https://schema.org/Float",\n' +
                        '               "value": 0\n' +
                        '          }' +
                        '     ]\n' +
                        '}',
                    content_variable: {
                        id: 'content_variable_1',
                        name: 'power_comsumption',
                        type: 'https://schema.org/StructuredValue',
                        characteristic_id: null,
                        value: null,
                        sub_content_variables: [{
                            id: 'sub_content_variable_1',
                            name: 'level_neu',
                            type: 'https://schema.org/Float',
                            characteristic_id: 'char_1',
                            value: 0,
                            unit_reference: null,
                            sub_content_variables: null,
                            serialization_options: null
                        }],
                        serialization_options: null,
                        unit_reference: null
                    },
                    protocol_segment_id: 'protocol_segment_1',
                    show: true,
                }
            ],
            outputs: [{
                id: 'output_id_1',
                name: 'data',
                serialization: 'json',
                content_variable_raw: '{\n' +
                    '     "id": "content_variable_out_1",\n' +
                    '     "name": "brightness",\n' +
                    '     "type": "https://schema.org/Float"\n' +
                    '}',
                content_variable: {
                    id: 'content_variable_out_1',
                    name: 'brightness',
                    type: 'https://schema.org/Float',
                    characteristic_id: null,
                    value: null,
                    sub_content_variables: null,
                    unit_reference: null,
                    serialization_options: null
                },
                protocol_segment_id: 'protocol_segment_2',
                show: true,
            }],
            functionType: {text: ''},
            functions: [],
            aspects: []
        }]);

    }));

    it('check save with unit_reference', async(() => {
        init('device_id_4711', 'edit');
        component.inputOutputContentVariableRaw(component.services.at(0), 'inputs', 0).setValue('{\n' +
            '     "id": "content_variable_1",\n' +
            '     "name": "power_comsumption",\n' +
            '     "type": "https://schema.org/StructuredValue",\n' +
            '     "sub_content_variables": [\n' +
            '          {\n' +
            '               "id": "sub_content_variable_1",\n' +
            '               "characteristic_id": "char_1",\n' +
            '               "name": "level_neu",\n' +
            '               "type": "https://schema.org/Float",\n' +
            '               "value": 0\n' +
            '          },' +
            '          {\n' +
            '               "id": "sub_content_variable_1_unit",\n' +
            '               "characteristic_id": null,\n' +
            '               "name": "level_neu_unit",\n' +
            '               "type": "https://schema.org/Text",\n' +
            '               "unit_reference": "level_neu",\n' +
            '               "value": null\n' +
            '          }' +
            '     ]\n' +
            '}');
        component.save();
        expect(component.secondFormGroup.getRawValue().services).toEqual([{
            id: 'service_id_1',
            local_id: 'local_id_1',
            name: 'service1',
            description: 'serv_desc',
            protocol_id: 'protocol_1',
            inputs: [
                {
                    id: 'input_id_1',
                    name: 'metadata',
                    serialization: 'json',
                    content_variable_raw: '{\n' +
                        '     "id": "content_variable_1",\n' +
                        '     "name": "power_comsumption",\n' +
                        '     "type": "https://schema.org/StructuredValue",\n' +
                        '     "sub_content_variables": [\n' +
                        '          {\n' +
                        '               "id": "sub_content_variable_1",\n' +
                        '               "characteristic_id": "char_1",\n' +
                        '               "name": "level_neu",\n' +
                        '               "type": "https://schema.org/Float",\n' +
                        '               "value": 0\n' +
                        '          },' +
                        '          {\n' +
                        '               "id": "sub_content_variable_1_unit",\n' +
                        '               "characteristic_id": null,\n' +
                        '               "name": "level_neu_unit",\n' +
                        '               "type": "https://schema.org/Text",\n' +
                        '               "unit_reference": "level_neu",\n' +
                        '               "value": null\n' +
                        '          }' +
                        '     ]\n' +
                        '}',
                    content_variable: {
                        id: 'content_variable_1',
                        name: 'power_comsumption',
                        type: 'https://schema.org/StructuredValue',
                        characteristic_id: null,
                        value: null,
                        unit_reference: null,
                        sub_content_variables: [
                            {
                                id: 'sub_content_variable_1',
                                name: 'level_neu',
                                type: 'https://schema.org/Float',
                                characteristic_id: 'char_1',
                                value: 0,
                                unit_reference: null,
                                sub_content_variables: null,
                                serialization_options: null
                            },
                            {
                                id: 'sub_content_variable_1_unit',
                                characteristic_id: null,
                                name: 'level_neu_unit',
                                type: 'https://schema.org/Text',
                                value: null,
                                unit_reference: 'level_neu',
                                sub_content_variables: null,
                                serialization_options: null
                            }
                        ],
                        serialization_options: null
                    },
                    protocol_segment_id: 'protocol_segment_1',
                    show: true,
                }
            ],
            outputs: [{
                id: 'output_id_1',
                name: 'data',
                serialization: 'json',
                content_variable_raw: '{\n' +
                    '     "id": "content_variable_out_1",\n' +
                    '     "name": "brightness",\n' +
                    '     "type": "https://schema.org/Float"\n' +
                    '}',
                content_variable: {
                    id: 'content_variable_out_1',
                    name: 'brightness',
                    type: 'https://schema.org/Float',
                    characteristic_id: null,
                    value: null,
                    unit_reference: null,
                    sub_content_variables: null,
                    serialization_options: null
                },
                protocol_segment_id: 'protocol_segment_2',
                show: true,
            }],
            functionType: {text: ''},
            functions: [],
            aspects: []
        }]);

    }));


});
