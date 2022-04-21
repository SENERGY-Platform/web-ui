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
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CoreModule } from '../../../../core/core.module';
import { MatTabsModule } from '@angular/material/tabs';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DevicesModule } from '../../../devices/devices.module';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../../../../core/services/keycloak.mock';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcessDeploymentsConfigComponent } from './deployments-config.component';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import {
    DeploymentsSelectionConfigurableModel, DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedModel
} from '../shared/deployments-prepared-v2.model';
import { DeploymentsService } from '../shared/deployments.service';
import { of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProcessesModule } from '../../processes.module';

const nullPath = { path: '', characteristicId: '', aspectNode: Object({  }), functionId: '', isVoid: false, value: null, type: '', configurables: [  ] }

function pathOptionsWithConfig(serviceId: string, config: DeploymentsSelectionConfigurableModel[] ): Map<string, DeploymentsSelectionPathOptionModel[]> {
    let result = new Map<string, DeploymentsSelectionPathOptionModel[]>();
    result.set(serviceId, [{
        path: "foo.bar",
        type: "https://schema.org/Text",
        value: "foo",
        isVoid: false,
        aspectNode: {
            id: "",
            name: "",
            ancestor_ids: [],
            child_ids: [],
            descendent_ids: [],
            parent_id: "",
            root_id: ""
        },
        characteristicId: "cid",
        functionId: "fid",
        configurables: config
    }])
    return result
}

describe('ProcessDeploymentsConfigComponent', () => {
    let component: ProcessDeploymentsConfigComponent;
    let fixture: ComponentFixture<ProcessDeploymentsConfigComponent>;

    const routerSpy: Spy<Router> = createSpyFromClass<Router>(Router);
    const deploymentsServiceSpy: Spy<DeploymentsService> = createSpyFromClass<DeploymentsService>(DeploymentsService);

    function initSpies(): void {
        TestBed.configureTestingModule({
            imports: [
                MatDialogModule,
                HttpClientTestingModule,
                MatSnackBarModule,
                CoreModule,
                MatTabsModule,
                InfiniteScrollModule,
                DevicesModule,
                MatFormFieldModule,
                ReactiveFormsModule,
                FlexLayoutModule,
                MatInputModule,
                MatSelectModule,
                ProcessesModule,
            ],
            declarations: [ProcessDeploymentsConfigComponent],
            providers: [
                { provide: KeycloakService, useClass: MockKeycloakService },
                { provide: Router, useValue: routerSpy },
                { provide: DeploymentsService, useValue: deploymentsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParams: {
                                processId: '4711',
                            },
                        },
                    },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ProcessDeploymentsConfigComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should create', () => {
        deploymentsServiceSpy.getPreparedDeployments.and.returnValue(of(null));
        deploymentsServiceSpy.getConfigurables.and.returnValue(of(null));
        initSpies();
        expect(component).toBeTruthy();
    });

    it('test simple process and service auto selection', () => {
        const simpleProcess = {
            version: 3,
            description: '',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_0imkg6m',
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    task: {
                        parameter: {},
                        retries: 0,
                        selection: {
                            filter_criteria: {
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                            },
                            selected_device_id: '',
                            selected_service_id: '',
                            selected_device_group_id: null,
                            selected_import_id: null,
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: {
                                        'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9': [
                                            {
                                                path: 'value.root.value',
                                                characteristicId: 'testCharacteristic',
                                            },
                                        ],
                                    },
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                            name: 'setOnService1',
                                        },
                                        {
                                            id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                            name: 'setOnService2',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lampe_ein',
        };
        deploymentsServiceSpy.getPreparedDeployments.and.returnValue(of(simpleProcess));
        deploymentsServiceSpy.getConfigurables.and.returnValue(of(null));
        initSpies();
        const selectedDeviceIdControl = component.deploymentFormGroup.get(['elements', 0, 'task', 'selection', 'selected_device_id']);
        // set device id of first device in selectionOption => selectionOptionIndex = 0
        if (selectedDeviceIdControl) {
            selectedDeviceIdControl.patchValue('urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b');
        }
        component.changeTaskSelectionOption(0, 0);
        expect(component.processId).toBe('4711');
        expect(component.deploymentId).toBeUndefined();
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            version: 3,
            description: 'no description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_0imkg6m',
                    group: null,
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    message_event: null,
                    notification: null,
                    task: {
                        parameter: {},
                        retries: 0,
                        selection: {
                            filter_criteria: {
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                            },
                            selected_device_id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                            selected_service_id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 0,
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: {
                                        'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9': [
                                            {
                                                path: 'value.root.value',
                                                characteristicId: 'testCharacteristic',
                                            },
                                        ],
                                    },
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                            name: 'setOnService1',
                                        },
                                        {
                                            id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                            name: 'setOnService2',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lampe_ein',
        });

        // set device id of seconde device in selectionOption => selectionOptionIndex = 1
        if (selectedDeviceIdControl) {
            selectedDeviceIdControl.patchValue('urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143');
        }
        component.changeTaskSelectionOption(0, 1);
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            version: 3,
            description: 'no description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_0imkg6m',
                    group: null,
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    message_event: null,
                    notification: null,
                    task: {
                        parameter: {},
                        retries: 0,
                        selection: {
                            filter_criteria: {
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                            },
                            selected_device_id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                            selected_service_id: null,
                            selected_device_group_id: null,
                            show: true,
                            selection_options_index: 1,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: {
                                        'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9': [
                                            {
                                                path: 'value.root.value',
                                                characteristicId: 'testCharacteristic',
                                            },
                                        ],
                                    },
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                            name: 'setOnService1',
                                        },
                                        {
                                            id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                            name: 'setOnService2',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lampe_ein',
        });
    });

    it('test lane process and auto selection of device and services', () => {
        const configurable: DeploymentsSelectionConfigurableModel[] = [
            {
                characteristic_id: 'urn:infai:ses:characteristic:541665645sd-asdsad',
                path: "test.path",
                type: "https://schema.org/Text",
                value: "foo",
                function_id: "",
                aspect_node: {
                    id: "",
                    name: "",
                    ancestor_ids: [],
                    child_ids: [],
                    descendent_ids: [],
                    parent_id: "",
                    root_id: ""
                }
            },
        ];

        const laneProcess = {
            version: 3,
            description: 'description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_1954wep',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0pciieh',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT10S',
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_1qz61o8',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setColorFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0',
                        },
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                function_id: 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0yhxn55',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT2M',
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_0m8q0z5',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOffStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lamp_in_Lane',
        } as V2DeploymentsPreparedModel;
        deploymentsServiceSpy.getPreparedDeployments.and.returnValue(of(laneProcess));
        initSpies();
        const selectedDeviceIdControl = component.deploymentFormGroup.get(['elements', 0, 'task', 'selection', 'selected_device_id']);
        // set device id of first device in selectionOption => selectionOptionIndex = 0
        if (selectedDeviceIdControl) {
            selectedDeviceIdControl.patchValue('urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2');
        }
        component.changeTaskSelectionOption(0, 2);
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            version: 3,
            description: 'description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_1954wep',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                            selected_service_id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 2,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0pciieh',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT10S',
                        durationUnits: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 10 },
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_1qz61o8',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setColorFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0',
                        },
                        selection: {
                            filter_criteria: {
                                characteristic_id: 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                function_id: 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                            selected_service_id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 2,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0yhxn55',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT2M',
                        durationUnits: { years: 0, months: 0, days: 0, hours: 0, minutes: 2, seconds: 0 },
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_0m8q0z5',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOffStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                            selected_service_id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 2,
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lamp_in_Lane',
        } as V2DeploymentsPreparedModel);
    });

    it('test lane process auto selection of device-group', () => {
        const laneProcess = {
            version: 3,
            description: 'description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_1954wep',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0pciieh',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT10S',
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_1qz61o8',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setColorFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0',
                        },
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                function_id: 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0yhxn55',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT2M',
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_0m8q0z5',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOffStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: null,
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lamp_in_Lane',
        } as V2DeploymentsPreparedModel;
        deploymentsServiceSpy.getPreparedDeployments.and.returnValue(of(laneProcess));
        initSpies();
        component.changeTaskSelectionOption(0, 3);
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            version: 3,
            description: 'description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: '',
            },
            elements: [
                {
                    bpmn_id: 'Task_1954wep',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOnStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            name: 'setOnService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 3,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0pciieh',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT10S',
                        durationUnits: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 10 },
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_1qz61o8',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setColorFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0',
                        },
                        selection: {
                            filter_criteria: {
                                characteristic_id: 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                function_id: 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            name: 'setColorService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 3,
                        },
                    },
                },
                {
                    bpmn_id: 'IntermediateThrowEvent_0yhxn55',
                    group: 'pool:Lane_Lamp',
                    name: '',
                    order: 0,
                    time_event: {
                        type: 'timeDuration',
                        time: 'PT2M',
                        durationUnits: { years: 0, months: 0, days: 0, hours: 0, minutes: 2, seconds: 0 },
                    },
                    notification: null,
                    message_event: null,
                    task: null,
                },
                {
                    bpmn_id: 'Task_0m8q0z5',
                    group: 'pool:Lane_Lamp',
                    name: 'Lamp setOffStateFunction',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: null,
                    task: {
                        retries: 0,
                        parameter: {},
                        
                        selection: {
                            filter_criteria: {
                                characteristic_id: '',
                                function_id: 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                aspect_id: null,
                            },
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        name: 'Hue color lamp 1',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        name: 'Hue color lamp 2',
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            name: 'setOffService',
                                        },
                                    ],
                                    device_group: null,
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                                {
                                    device: null,
                                    services: [],
                                    device_group: {
                                        id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                                        name: 'group1',
                                    },
                                    import: null,
                                    importType: null,
                                    path_options: null,
                                },
                            ],
                            selected_device_id: null,
                            selected_service_id: null,
                            selected_device_group_id: 'urn:infai:ses:device-group:foo-bar-batz-group-1',
                            selected_import_id: null,
                            
                            selected_path: nullPath,
                            selected_path_option: undefined,
                            show: false,
                            selection_options_index: 3,
                        },
                    },
                },
            ],
            executable: true,
            id: '',
            name: 'Lamp_in_Lane',
        });
    });
});
