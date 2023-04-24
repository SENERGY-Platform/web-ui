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
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DeviceTypesComponent} from './device-types.component';
import {CoreModule} from '../../../../core/core.module';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {MatStepperModule} from '@angular/material/stepper';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatIconModule} from '@angular/material/icon';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {DeviceTypeService} from '../shared/device-type.service';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {DeviceTypeModel, DeviceTypeProtocolModel, DeviceTypeServiceModel} from '../shared/device-type.model';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {FlexLayoutModule} from '@angular/flex-layout';
import {util} from 'jointjs';
import uuid = util.uuid;
import {MatTreeModule} from '@angular/material/tree';

describe('DeviceTypesComponent', () => {
    let component: DeviceTypesComponent;
    let fixture: ComponentFixture<DeviceTypesComponent>;
    const devicetypesEdit = {
        path: 'metadata/devicetypesoverview/devicetypes/:id',
        pathMatch: 'full',
        component: DeviceTypesComponent,
        data: {header: 'Devices'},
    };

    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);

    function init(id: string, func: string) {
        deviceTypeServiceSpy.getLeafCharacteristics.and.returnValue(
            of([
                {
                    id: 'char:1',
                    min_value: 0,
                    name: 'lux',
                    rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
                    type: 'https://schema.org/Float',
                },
            ]),
        );
        deviceTypeServiceSpy.getProtocols.and.returnValue(
            of([
                {
                    id: 'protocol_1',
                    handler: 'connector',
                    name: 'standard-connector',
                    protocol_segments: [
                        {
                            id: 'protocol_segment_1',
                            name: 'metadata',
                        },
                        {
                            id: 'protocol_segment_2',
                            name: 'data',
                        },
                    ],
                },
            ] as DeviceTypeProtocolModel[]),
        );
        const args: DeviceTypeModel = {
            id: 'device_id_4711',
            name: 'device_type_name',
            description: 'desc',
            device_class_id: 'device_class_1',
            services: [
                {
                    id: 'service_id_1',
                    local_id: 'local_id_1',
                    name: 'service1',
                    description: 'serv_desc',
                    protocol_id: 'protocol_1',
                    interaction: 'event',
                    inputs: [
                        {
                            id: 'input_id_1',
                            protocol_segment_id: 'protocol_segment_1',
                            serialization: 'json',
                            content_variable: {
                                id: 'content_variable_1',
                                name: 'power_comsumption',
                                type: 'https://schema.org/StructuredValue',
                                sub_content_variables: [
                                    {
                                        id: 'sub_content_variable_1',
                                        characteristic_id: 'char_1',
                                        name: 'level',
                                        type: 'https://schema.org/Float',
                                        value: 0,
                                    },
                                    {
                                        id: 'sub_content_variable_2',
                                        characteristic_id: 'char_1',
                                        name: 'level2',
                                        type: 'https://schema.org/Float',
                                        value: 0,
                                    },
                                ],
                            },
                        },
                    ],
                    outputs: [
                        {
                            id: 'output_id_1',
                            protocol_segment_id: 'protocol_segment_2',
                            serialization: 'json',
                            content_variable: {
                                id: 'content_variable_out_1',
                                name: 'brightness',
                                type: 'https://schema.org/Float',
                            },
                        },
                    ],
                },
            ] as DeviceTypeServiceModel[],
        };
        deviceTypeServiceSpy.getDeviceType.and.returnValue(of(args));
        deviceTypeServiceSpy.getDeviceClasses.and.returnValue(of());
        deviceTypeServiceSpy.getControllingFunctions.and.returnValue(of());
        deviceTypeServiceSpy.getMeasuringFunctions.and.returnValue(of());
        deviceTypeServiceSpy.getAspects.and.returnValue(of());
        deviceTypeServiceSpy.createDeviceType.and.returnValue(of({id: uuid()}));
        deviceTypeServiceSpy.updateDeviceType.and.returnValue(of({id: uuid()}));

        TestBed.configureTestingModule({
            imports: [
                CoreModule,
                RouterTestingModule.withRoutes([devicetypesEdit]),
                HttpClientTestingModule,
                MatSnackBarModule,
                MatStepperModule,
                MatFormFieldModule,
                MatSelectModule,
                MatIconModule,
                ReactiveFormsModule,
                MatInputModule,
                MatExpansionModule,
                MatTabsModule,
                MatTooltipModule,
                FlexLayoutModule,
                MatTreeModule,
            ],
            declarations: [DeviceTypesComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({id}),
                            queryParamMap: convertToParamMap({function: func}),
                        },
                    },
                },
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(waitForAsync(() => {
    }));

    it(
        'should create the app',
        waitForAsync(() => {
            init('', '');
            expect(component).toBeTruthy();
        }),
    );

    it(
        'init create',
        waitForAsync(() => {
            init('', 'create');
            expect(component.id).toBe('');
            expect(component.queryParamFunction).toBe('create');
            expect(component.editable).toBe(true);
            expect(component.firstFormGroup.getRawValue()).toEqual({
                id: undefined,
                name: null,
                description: null,
                device_class_id: null,
            });
            expect(component.services.length).toBe(0);
        }),
    );

    it(
        'init copy',
        waitForAsync(() => {
            init('device_id_4711', 'copy');

            expect(component.id).toBe('device_id_4711');
            expect(component.queryParamFunction).toBe('copy');
            expect(component.leafCharacteristics.length).toBe(1);
            expect(component.editable).toBe(true);
            expect(component.firstFormGroup.getRawValue()).toEqual({
                id: '', // id must be empty, cause its deleted
                name: 'device_type_name',
                description: 'desc',
                device_class_id: 'device_class_1',
            });
            expect(component.serviceControl(0).getRawValue().id).toBe('');
            expect(component.serviceControl(0).value.local_id).toBe('local_id_1');
            expect(component.serviceControl(0).value.name).toBe('service1');
            expect(component.serviceControl(0).value.description).toBe('serv_desc');
            expect(component.serviceControl(0).value.protocol_id).toBe('protocol_1');
            // input index 0
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.id).toBe('');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.name).toBe('metadata');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.serialization).toBe('json');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.protocol_segment_id).toBe('protocol_segment_1');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.show).toBe(true);
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 0).value.dataSource.data).toEqual([
                {
                    indices: [0],
                    name: 'power_comsumption',
                    type: 'https://schema.org/StructuredValue',
                    sub_content_variables: [
                        {
                            indices: [0, 0],
                            name: 'level',
                            type: 'https://schema.org/Float',
                            characteristic_id: 'char_1',
                            value: 0,
                        },
                        {
                            indices: [0, 1],
                            name: 'level2',
                            type: 'https://schema.org/Float',
                            characteristic_id: 'char_1',
                            value: 0,
                        },
                    ],
                },
            ]);
            // input index 1
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.id).toBe('');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.name).toBe('data');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.serialization).toBe(null);
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.protocol_segment_id).toBe('protocol_segment_2');
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.show).toBe(false);
            expect(component.inputOutput(component.serviceControl(0), 'inputs', 1).value.dataSource.data.length).toBe(0);
            // output index 0
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.id).toBe('');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.name).toBe('metadata');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.serialization).toBe(null);
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.protocol_segment_id).toBe('protocol_segment_1');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.show).toBe(false);
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 0).value.dataSource.data.length).toBe(0);
            // output index 1
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.id).toBe('');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.name).toBe('data');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.serialization).toBe('json');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.protocol_segment_id).toBe('protocol_segment_2');
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.show).toBe(true);
            expect(component.inputOutput(component.serviceControl(0), 'outputs', 1).value.dataSource.data).toEqual([
                {
                    indices: [0],
                    name: 'brightness',
                    type: 'https://schema.org/Float',
                },
            ]);
            expect(component.services.length).toBe(1);
        }),
    );

    it(
        'check save with copy',
        waitForAsync(() => {
            init('device_id_4711', 'copy');
            component.save();
            expect(component.secondFormGroup.getRawValue().services).toEqual([
                {
                    id: '',
                    local_id: 'local_id_1',
                    service_group_key: null,
                    name: 'service1',
                    description: 'serv_desc',
                    protocol_id: 'protocol_1',
                    interaction: 'event',
                    attributes: [
                        {key: 'senergy/time_path', value: '', origin: 'web-ui'}
                    ],
                    inputs: [
                        {
                            id: '',
                            name: 'metadata',
                            serialization: 'json',
                            content_variable: {
                                name: 'power_comsumption',
                                type: 'https://schema.org/StructuredValue',
                                sub_content_variables: [
                                    {
                                        name: 'level',
                                        type: 'https://schema.org/Float',
                                        characteristic_id: 'char_1',
                                        value: 0,
                                    },
                                    {
                                        name: 'level2',
                                        type: 'https://schema.org/Float',
                                        characteristic_id: 'char_1',
                                        value: 0,
                                    },
                                ],
                            },
                            protocol_segment_id: 'protocol_segment_1',
                            show: true,
                        },
                    ],
                    outputs: [
                        {
                            id: '',
                            name: 'data',
                            serialization: 'json',
                            content_variable: {
                                name: 'brightness',
                                type: 'https://schema.org/Float',
                            },
                            protocol_segment_id: 'protocol_segment_2',
                            show: true,
                        },
                    ],
                },
            ]);
        }),
    );

    it(
        'check save with edit',
        waitForAsync(() => {
            init('device_id_4711', 'edit');
            const inputs = component.inputOutputArray(component.services.controls[0], 'inputs');
            component.deleteContentVariable(inputs[0], [0, 1]);

            component.save();
            expect(component.secondFormGroup.getRawValue().services).toEqual([
                {
                    id: 'service_id_1',
                    local_id: 'local_id_1',
                    service_group_key: null,
                    name: 'service1',
                    description: 'serv_desc',
                    protocol_id: 'protocol_1',
                    interaction: 'event',
                    attributes: [
                        {key: 'senergy/time_path', value: '', origin: 'web-ui'}
                    ],
                    inputs: [
                        {
                            id: 'input_id_1',
                            name: 'metadata',
                            serialization: 'json',
                            content_variable: {
                                id: 'content_variable_1',
                                name: 'power_comsumption',
                                type: 'https://schema.org/StructuredValue',
                                sub_content_variables: [
                                    {
                                        id: 'sub_content_variable_1',
                                        name: 'level',
                                        type: 'https://schema.org/Float',
                                        characteristic_id: 'char_1',
                                        value: 0,
                                    },
                                ],
                            },
                            protocol_segment_id: 'protocol_segment_1',
                            show: true,
                        },
                    ],
                    outputs: [
                        {
                            id: 'output_id_1',
                            name: 'data',
                            serialization: 'json',
                            content_variable: {
                                id: 'content_variable_out_1',
                                name: 'brightness',
                                type: 'https://schema.org/Float',
                            },
                            protocol_segment_id: 'protocol_segment_2',
                            show: true,
                        },
                    ],
                },
            ]);
        }),
    );
});
