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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialogModule} from '@angular/material/dialog';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {CoreModule} from '../../../../core/core.module';
import {MatTabsModule} from '@angular/material/tabs';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {DevicesModule} from '../../../devices/devices.module';
import {KeycloakService} from 'keycloak-angular';
import {MockKeycloakService} from '../../../../core/services/keycloak.mock';
import {Router} from '@angular/router';
import {ProcessDeploymentsConfigComponent} from './deployments-config.component';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {V2DeploymentsPreparedModel} from '../shared/deployments-prepared-v2.model';
import {DeploymentsService} from '../shared/deployments.service';
import {of} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlexLayoutModule} from '@angular/flex-layout';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';

fdescribe('ProcessDeploymentsConfigComponent', () => {
    let component: ProcessDeploymentsConfigComponent;
    let fixture: ComponentFixture<ProcessDeploymentsConfigComponent>;

    const routerSpy: Spy<Router> = createSpyFromClass<Router>(Router);
    const deploymentsServiceSpy: Spy<DeploymentsService> = createSpyFromClass<DeploymentsService>(DeploymentsService);

    function initSpies(): void {
        routerSpy.getCurrentNavigation.and.returnValues({
            extras: {
                state: {
                    processId: '4711',
                    deploymentId: ''
                }
            }
        });

        deploymentsServiceSpy.getPreparedDeployments.and.returnValue(of({
            description: '',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: ''
            },
            elements: [{
                bpmn_id: 'Task_0imkg6m',
                name: 'Lamp setOnStateFunction',
                order: 0,
                task: {
                    parameter: {},
                    retries: 0,
                    selection: {
                        filter_criteria: {
                            device_class_id: 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                            function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9'
                        },
                        selected_device_id: '',
                        selected_service_id: '',
                        selection_options: [
                            {
                                device: {
                                    id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                    name: 'setOnService'
                                }]
                            },
                            {
                                device: {
                                    id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                    name: 'setOnService1'
                                },
                                    {
                                        id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                        name: 'setOnService2'
                                    }]
                            }

                        ]
                    }
                }
            }],
            executable: true,
            id: '',
            name: 'Lampe_ein'
        } as V2DeploymentsPreparedModel));

        TestBed.configureTestingModule({
            imports: [MatDialogModule, HttpClientTestingModule, MatSnackBarModule, CoreModule, MatTabsModule, InfiniteScrollModule, DevicesModule, MatFormFieldModule, ReactiveFormsModule,
                FlexLayoutModule,
                MatInputModule,
                MatSelectModule,
            ],
            declarations: [ProcessDeploymentsConfigComponent],
            providers: [{provide: KeycloakService, useClass: MockKeycloakService},
                {provide: Router, useValue: routerSpy},
                {provide: DeploymentsService, useValue: deploymentsServiceSpy}]
        }).compileComponents();
        fixture = TestBed.createComponent(ProcessDeploymentsConfigComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should create', () => {
        initSpies();
        expect(component).toBeTruthy();
    });

    it('test simple process and service auto selection', () => {
        initSpies();
        const selectedDeviceIdControl = component.deploymentFormGroup.get(['elements', 0, 'task', 'selection', 'selected_device_id']);
        // set device id of first device in selectionOption => selectionOptionIndex = 0
        if (selectedDeviceIdControl) {
            selectedDeviceIdControl.patchValue('urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b');
        }
        component.changeTaskSelectionOption(0, 0);
        expect(component.processId).toBe('4711');
        expect(component.deploymentId).toBe('');
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            description: 'no description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: ''
            },
            elements: [{
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
                            function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9'
                        },
                        selected_device_id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                        selected_service_id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                        show: false,
                        selection_options_index: 0,
                        selection_options: [
                            {
                                device: {
                                    id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                    name: 'setOnService'
                                }]
                            },
                            {
                                device: {
                                    id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                    name: 'setOnService1'
                                },
                                    {
                                        id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                        name: 'setOnService2'
                                    }]
                            }
                        ]
                    },
                    configurables: null
                }
            }],
            executable: true,
            id: '',
            name: 'Lampe_ein'
        } as V2DeploymentsPreparedModel);

        // set device id of seconde device in selectionOption => selectionOptionIndex = 1
        if (selectedDeviceIdControl) {
            selectedDeviceIdControl.patchValue('urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143');
        }
        component.changeTaskSelectionOption(0, 1);
        expect(component.deploymentFormGroup.getRawValue()).toEqual({
            description: 'no description',
            diagram: {
                svg: '',
                xml_raw: '',
                xml_deployed: ''
            },
            elements: [{
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
                            function_id: 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9'
                        },
                        selected_device_id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                        selected_service_id: '',
                        show: true,
                        selection_options_index: 1,
                        selection_options: [
                            {
                                device: {
                                    id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                    name: 'setOnService'
                                }]
                            },
                            {
                                device: {
                                    id: 'urn:infai:ses:device:20b915d4-5d1e-4446-b721-64c1481a0143',
                                    name: 'LIFX Color Bulb 1'
                                },
                                services: [{
                                    id: 'urn:infai:ses:service:fa650f74-0552-4819-9b2c-f56498e070a0',
                                    name: 'setOnService1'
                                },
                                    {
                                        id: '87d5e964-b9c7-4e86-8d66-3bc9302c934e',
                                        name: 'setOnService2'
                                    }]
                            }
                        ]
                    },
                    configurables: null
                }
            }],
            executable: true,
            id: '',
            name: 'Lampe_ein'
        } as V2DeploymentsPreparedModel);
    });
});
