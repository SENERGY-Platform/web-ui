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

import {waitForAsync, ComponentFixture, TestBed, async} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {CoreModule} from '../../../../core/core.module';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatIconModule} from '@angular/material/icon';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {DeviceGroupsEditComponent} from './device-groups-edit.component';
import {DeviceGroupsService} from '../shared/device-groups.service';
import {DeviceGroupCriteriaModel, DeviceGroupHelperResultModel, DeviceGroupModel} from '../shared/device-groups.model';
import {DeviceInstancesBaseModel} from '../../device-instances/shared/device-instances.model';

describe('DeviceGroupsEditComponent', () => {
    let component: DeviceGroupsEditComponent;
    let fixture: ComponentFixture<DeviceGroupsEditComponent>;
    const deviceGroupsEdit = {path: 'devices/devicegroups/edit/:id', pathMatch: 'full', component: DeviceGroupsEditComponent, data: {header: 'Devices'}};

    const deviceGroupServiceSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);

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
                function_id: 'function:id-1',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            }
        ],
    };

    const knownDevices = [
        {
            id: 'device:id-1',
            local_id: 'local-device-id-1',
            name: 'device1'
        },
        {
            id: 'device:id-2',
            local_id: 'local-device-id-2',
            name: 'device2'
        },
        {
            id: 'device:id-3',
            local_id: 'local-device-id-3',
            name: 'device3'
        },
        {
            id: 'device:id-4',
            local_id: 'local-device-id-4',
            name: 'device4'
        },
        {
            id: 'device:id-5',
            local_id: 'local-device-id-5',
            name: 'device5'
        }
    ] as DeviceInstancesBaseModel[];

    const helperScenario1Result: DeviceGroupHelperResultModel = {
        criteria: [
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: 'aspect:id-1',
                device_class_id: '',
            },
            {
                interaction: 'request',
                function_id: 'function:id-1',
                aspect_id: '',
                device_class_id: 'device-class:id-1',
            }
        ],
        options: [
            {
                device: {
                    id: 'device:id-3',
                    local_id: 'local-device-id-3',
                    name: 'device3'
                },
                maintains_group_usability: true,
                removes_criteria: []
            },
            {
                device: {
                    id: 'device:id-4',
                    local_id: 'local-device-id-4',
                    name: 'device4'
                },
                maintains_group_usability: true,
                removes_criteria: [
                    {
                        interaction: 'request',
                        function_id: 'function:id-1',
                        aspect_id: 'aspect:id-1',
                        device_class_id: '',
                    }
                ]
            },
            {
                device: {
                    id: 'device:id-5',
                    local_id: 'local-device-id-5',
                    name: 'device5'
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
                        function_id: 'function:id-1',
                        aspect_id: '',
                        device_class_id: 'device-class:id-1',
                    }
                ]
            }
        ]
    };

    deviceGroupServiceSpy.getDeviceGroup.and.returnValue(of(exampleGroup as DeviceGroupModel));
    deviceGroupServiceSpy.getDeviceListByIds.and.callFake(function (ids: string[]) {
        const result: DeviceInstancesBaseModel[] = [];
        for (const id of ids) {
            for (const device of knownDevices) {
                if (id === device.id) {
                    result.push(device);
                }
            }
        }
        return of(result);
    });

    deviceGroupServiceSpy.useDeviceSelectionDeviceGroupHelper.and.callFake(function (currentDeviceIds: string[], search: string, limit: number, offset: number) {
        if (search === '' && currentDeviceIds.length === 2) {
            return of(helperScenario1Result);
        }
        throw new Error('unknown test scenario for useDeviceSelectionDeviceGroupHelper: ' + JSON.stringify([currentDeviceIds, search, limit, offset]));
    });


    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule.withRoutes([deviceGroupsEdit]), HttpClientTestingModule, MatSnackBarModule,
                MatFormFieldModule, MatSelectModule, MatIconModule, ReactiveFormsModule, MatInputModule],
            declarations: [
                DeviceGroupsEditComponent
            ],
            providers: [
                {
                    provide: ActivatedRoute, useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({'id': 'test-group:id'}),
                        }
                    }
                },
                {provide: DeviceGroupsService, useValue: deviceGroupServiceSpy}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceGroupsEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));


    it('should create the app', waitForAsync(() => {
        expect(component).toBeTruthy();
    }));

    it('should set id from path', waitForAsync(() => {
        expect(component.id).toBe('test-group:id');
    }));

    it('should set deviceGroupForm', waitForAsync(() => {
        expect(component.deviceGroupForm.getRawValue()).toEqual(exampleGroup);
    }));

    it('should set initial selectableForm', waitForAsync(() => {
        expect(component.selectableForm.value).toEqual(helperScenario1Result.options);
    }));

    it('should set initial selectedForm', waitForAsync(() => {
        expect(component.selectedForm.value).toEqual([
                {
                    id: 'device:id-1',
                    local_id: 'local-device-id-1',
                    name: 'device1'
                },
                {
                    id: 'device:id-2',
                    local_id: 'local-device-id-2',
                    name: 'device2'
                }
            ]);
    }));

});
