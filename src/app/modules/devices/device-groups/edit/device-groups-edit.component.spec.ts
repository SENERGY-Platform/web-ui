/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this fi8le except in compliance with the License.
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
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CoreModule } from '../../../../core/core.module';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {ActivatedRoute, convertToParamMap, Route} from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { DeviceGroupsEditComponent } from './device-groups-edit.component';
import { DeviceGroupsService } from '../shared/device-groups.service';
import { DeviceGroupHelperResultModel, DeviceGroupModel } from '../shared/device-groups.model';
import { DeviceInstancesBaseModel } from '../../device-instances/shared/device-instances.model';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { DeviceTypeDeviceClassModel, DeviceTypeFunctionModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { AspectsPermSearchModel } from '../../../metadata/aspects/shared/aspects-perm-search.model';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {FlexLayoutModule} from '@ngbracket/ngx-layout';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DeviceGroupsEditComponent', () => {
    let component: DeviceGroupsEditComponent;
    let fixture: ComponentFixture<DeviceGroupsEditComponent>;

    const deviceGroupsEdit: Route = {
        path: 'devices/devicegroups/edit/:id',
        pathMatch: 'full',
        component: DeviceGroupsEditComponent,
        data: { header: 'Devices' },
    };

    const exampleGroup = {
        id: 'test-group:id',
        image: 'some-image.png',
        name: 'group-name',
        device_ids: ['device:id-1', 'device:id-2'],
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
    };

    const exampleReducedGroup = {
        id: 'test-group:id',
        image: 'some-image.png',
        name: 'group-name',
        device_ids: ['device:id-1'],
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'event',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
    };

    const exampleExpandedGroup = {
        id: 'test-group:id',
        image: 'some-image.png',
        name: 'group-name',
        device_ids: ['device:id-1', 'device:id-2', 'device:id-4'],
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
    };

    const knownFunctions = [
        {
            id: 'function:id-1',
            name: 'getSomething',
            rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
            concept_id: '',
            description: 'measure something',
        },
        {
            id: 'function:id-2',
            name: 'setSomething',
            rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction',
            concept_id: '',
            description: 'control something',
        },
    ] as DeviceTypeFunctionModel[];

    const knownDeviceClasses = [
        {
            id: 'device-class:id-1',
            name: 'controller-type',
            image: '',
        },
    ] as DeviceTypeDeviceClassModel[];

    const knownAspects = [
        {
            id: 'aspect:id-1',
            name: 'temperature',
            creator: '',
            permissions: { r: true, w: true, x: true, a: true },
            shared: false,
        },
    ] as AspectsPermSearchModel[];

    const knownDevices = [
        {
            id: 'device:id-1',
            local_id: 'local-device-id-1',
            name: 'device1',
        },
        {
            id: 'device:id-2',
            local_id: 'local-device-id-2',
            name: 'device2',
        },
        {
            id: 'device:id-3',
            local_id: 'local-device-id-3',
            name: 'device3',
        },
        {
            id: 'device:id-4',
            local_id: 'local-device-id-4',
            name: 'device4',
        },
        {
            id: 'device:id-5',
            local_id: 'local-device-id-5',
            name: 'device5',
        },
    ] as DeviceInstancesBaseModel[];

    const helperScenario1: DeviceGroupHelperResultModel = {
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
        options: [
            {
                device: {
                    id: 'device:id-3',
                    local_id: 'local-device-id-3',
                    name: 'device3',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [],
            },
            {
                device: {
                    id: 'device:id-4',
                    local_id: 'local-device-id-4',
                    name: 'device4',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                ],
            },
            {
                device: {
                    id: 'device:id-5',
                    local_id: 'local-device-id-5',
                    name: 'device5',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: false,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                    },
                ],
            },
        ],
    };

    const helperScenario2: DeviceGroupHelperResultModel = {
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
        options: [
            {
                device: {
                    id: 'device:id-3',
                    local_id: 'local-device-id-3',
                    name: 'device3',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [],
            },
            {
                device: {
                    id: 'device:id-5',
                    local_id: 'local-device-id-5',
                    name: 'device5',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: false,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                    },
                ],
            },
        ],
    };

    const helperScenario3: DeviceGroupHelperResultModel = {
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'event',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
        options: [
            {
                device: {
                    id: 'device:id-2',
                    local_id: 'local-device-id-2',
                    name: 'device2',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [
                    {
                        interaction: 'event',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                ],
            },
            {
                device: {
                    id: 'device:id-3',
                    local_id: 'local-device-id-3',
                    name: 'device3',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [
                    {
                        interaction: 'event',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                ],
            },
            {
                device: {
                    id: 'device:id-4',
                    local_id: 'local-device-id-4',
                    name: 'device4',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                    {
                        interaction: 'event',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                ],
            },
            {
                device: {
                    id: 'device:id-5',
                    local_id: 'local-device-id-5',
                    name: 'device5',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: false,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                    {
                        interaction: 'event',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    },
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                    },
                ],
            },
        ],
    };

    const helperScenario4: DeviceGroupHelperResultModel = {
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-2',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            },
        ],
        options: [
            {
                device: {
                    id: 'device:id-3',
                    local_id: 'local-device-id-3',
                    name: 'device3',
                    device_type_id: '0',
                    owner_id: '0',
                },
                maintains_group_usability: true,
                removes_criteria: [],
            },
        ],
    };
    beforeEach(
        fakeAsync(() => {
            const deviceGroupServiceSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
            deviceGroupServiceSpy.getDeviceGroup.and.returnValue(of(JSON.parse(JSON.stringify(exampleGroup as DeviceGroupModel))));

            const deviceInstanceServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
            deviceInstanceServiceSpy.getDeviceInstances.and.callFake(function(options: {deviceIds: string[]}) {
                const result: DeviceInstancesBaseModel[] = [];
                for (const id of options.deviceIds) {
                    for (const device of knownDevices) {
                        if (id === device.id) {
                            result.push(device);
                        }
                    }
                }
                const res = {result: JSON.parse(JSON.stringify(result))};
                return of(res);
            });
            deviceGroupServiceSpy.getFunctionListByIds.and.callFake(function(ids: string[]) {
                const result: DeviceTypeFunctionModel[] = [];
                for (const id of ids) {
                    for (const f of knownFunctions) {
                        if (id === f.id) {
                            result.push(f);
                        }
                    }
                }
                return of(JSON.parse(JSON.stringify(result)));
            });
            deviceGroupServiceSpy.getAspectListByIds.and.callFake(function(ids: string[]) {
                const result: AspectsPermSearchModel[] = [];
                for (const id of ids) {
                    for (const aspect of knownAspects) {
                        if (id === aspect.id) {
                            result.push(aspect);
                        }
                    }
                }
                return of(JSON.parse(JSON.stringify(result)));
            });
            deviceGroupServiceSpy.getDeviceClassListByIds.and.callFake(function(ids: string[]) {
                const result: DeviceTypeDeviceClassModel[] = [];
                for (const id of ids) {
                    for (const dc of knownDeviceClasses) {
                        if (id === dc.id) {
                            result.push(dc);
                        }
                    }
                }
                return of(JSON.parse(JSON.stringify(result)));
            });

            deviceGroupServiceSpy.useDeviceSelectionDeviceGroupHelper.and.callFake(function(
                currentDeviceIds: string[],
                search: string,
                limit: number,
                offset: number,
            ) {
                if (search === '' && currentDeviceIds.length === 2) {
                    return of(JSON.parse(JSON.stringify(helperScenario1)));
                }
                if (search === '' && currentDeviceIds.length === 3) {
                    return of(JSON.parse(JSON.stringify(helperScenario2)));
                }
                if (search === '' && currentDeviceIds.length === 1) {
                    return of(JSON.parse(JSON.stringify(helperScenario3)));
                }
                if (search === '3' && currentDeviceIds.length === 2) {
                    return of(JSON.parse(JSON.stringify(helperScenario4)));
                }
                throw new Error(
                    'unknown test scenario for useDeviceSelectionDeviceGroupHelper: ' +
                        JSON.stringify([currentDeviceIds, search, limit, offset]),
                );
            });

            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DeviceGroupsEditComponent],
    imports: [CoreModule,
        RouterTestingModule.withRoutes([deviceGroupsEdit]),
        MatSnackBarModule,
        MatFormFieldModule,
        MatIconModule,
        ReactiveFormsModule,
        MatInputModule,
        MatChipsModule,
        MatCardModule,
        MatTooltipModule,
        CommonModule,
        FlexLayoutModule],
    providers: [
        {
            provide: ActivatedRoute,
            useValue: {
                snapshot: {
                    paramMap: convertToParamMap({ id: 'test-group:id' }),
                },
            },
        },
        { provide: DeviceGroupsService, useValue: deviceGroupServiceSpy },
        { provide: DeviceInstancesService, useValue: deviceInstanceServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
            fixture = TestBed.createComponent(DeviceGroupsEditComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();
        }),
    );

    afterEach(
        fakeAsync(() => {
            fixture.destroy();
            flush();
        }),
    );

    it(
        'should create the app',
        fakeAsync(() => {
            expect(component).toBeTruthy();
        }),
    );

    it(
        'should init',
        fakeAsync(() => {
            expect(component.id).toBe('test-group:id');
            expect(component.deviceGroupForm.getRawValue()).toEqual(exampleGroup);
            expect(component.selectableForm.value).toEqual(helperScenario1.options);
            expect(component.selectedForm.value).toEqual([
                {
                    id: 'device:id-1',
                    local_id: 'local-device-id-1',
                    name: 'device1',
                },
                {
                    id: 'device:id-2',
                    local_id: 'local-device-id-2',
                    name: 'device2',
                },
            ]);
            expect(component.capabilities.value).toEqual(
                component.sortCapabilities([
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                        function_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
                        function_name: 'getSomething',
                        function_description: 'measure something',
                        device_class_name: '',
                        aspect_name: 'temperature',
                    },
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                        function_type: 'https://senergy.infai.org/ontology/ControllingFunction',
                        function_name: 'setSomething',
                        function_description: 'control something',
                        device_class_name: 'controller-type',
                        aspect_name: '',
                    },
                ]),
            );
        }),
    );

    it(
        'can add device',
        fakeAsync(() => {
                component.addDevice('device:id-4');
                fixture.detectChanges();
                tick(100);
                flush();

                expect(component).toBeTruthy();
                expect(component.deviceGroupForm.getRawValue()).toEqual(exampleExpandedGroup);
                expect(component.selectableForm.value).toEqual(helperScenario2.options);
                expect(component.selectedForm.value).toEqual([
                    {
                        id: 'device:id-1',
                        local_id: 'local-device-id-1',
                        name: 'device1',
                    },
                    {
                        id: 'device:id-2',
                        local_id: 'local-device-id-2',
                        name: 'device2',
                    },
                    {
                        id: 'device:id-4',
                        local_id: 'local-device-id-4',
                        name: 'device4',
                    },
                ]);
                expect(component.capabilities.value).toEqual(
                    component.sortCapabilities([
                        {
                            interaction: 'request',
                            function_id: 'function:id-2',
                            aspect_id: '',
                            device_class_id: 'device-class:id-1',
                            function_type: 'https://senergy.infai.org/ontology/ControllingFunction',
                            function_name: 'setSomething',
                            function_description: 'control something',
                            device_class_name: 'controller-type',
                            aspect_name: '',
                        },
                    ]),
                );
        }),
    );

    it(
        'can remove device',
        fakeAsync(() => {
            component.removeDevice('device:id-2');
            fixture.detectChanges();
            tick(100);
            flush();

            expect(component).toBeTruthy();
            expect(component.deviceGroupForm.getRawValue()).toEqual(exampleReducedGroup);
            expect(component.selectableForm.value).toEqual(helperScenario3.options);
            expect(component.selectedForm.value).toEqual([
                {
                    id: 'device:id-1',
                    local_id: 'local-device-id-1',
                    name: 'device1',
                },
            ]);
            expect(component.capabilities.value).toEqual(
                component.sortCapabilities([
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                        function_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
                        function_name: 'getSomething',
                        function_description: 'measure something',
                        device_class_name: '',
                        aspect_name: 'temperature',
                    },
                    {
                        interaction: 'event',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                        function_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
                        function_name: 'getSomething',
                        function_description: 'measure something',
                        device_class_name: '',
                        aspect_name: 'temperature',
                    },
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                        function_type: 'https://senergy.infai.org/ontology/ControllingFunction',
                        function_name: 'setSomething',
                        function_description: 'control something',
                        device_class_name: 'controller-type',
                        aspect_name: '',
                    },
                ]),
            );
        }),
    );

    it(
        'can search',
        fakeAsync(() => {
            component.searchText.setValue('3');

            fixture.detectChanges();
            tick(component.debounceTimeInMs);
            flush();

            expect(component).toBeTruthy();
            expect(component.deviceGroupForm.getRawValue()).toEqual(exampleGroup);
            expect(component.selectableForm.value).toEqual(helperScenario4.options);
            expect(component.selectedForm.value).toEqual([
                {
                    id: 'device:id-1',
                    local_id: 'local-device-id-1',
                    name: 'device1',
                },
                {
                    id: 'device:id-2',
                    local_id: 'local-device-id-2',
                    name: 'device2',
                },
            ]);
            expect(component.capabilities.value).toEqual(
                component.sortCapabilities([
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                        function_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
                        function_name: 'getSomething',
                        function_description: 'measure something',
                        device_class_name: '',
                        aspect_name: 'temperature',
                    },
                    {
                        interaction: 'request',
                        function_id: 'function:id-2',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                        function_type: 'https://senergy.infai.org/ontology/ControllingFunction',
                        function_name: 'setSomething',
                        function_description: 'control something',
                        device_class_name: 'controller-type',
                        aspect_name: '',
                    },
                ]),
            );
        }),
    );
});
