/*
 * Copyright 2026 InfAI (CC SES)
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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl } from '@angular/forms';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { AcControlEditDialogComponent } from './ac-control-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { environment } from '../../../../environments/environment';

describe('AcControlEditDialogComponent', () => {
    let component: AcControlEditDialogComponent;
    let fixture: ComponentFixture<AcControlEditDialogComponent>;

    const dashboardServiceSpy: Spy<DashboardService> = createSpyFromClass<DashboardService>(DashboardService);
    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const deviceInstancesServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const deviceGroupsServiceSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);

    function init(widget: any) {
        deviceInstancesServiceSpy.getDeviceSelectionsFull.and.returnValue(of([]));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                {provide: DashboardService, useValue: dashboardServiceSpy},
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy},
                {provide: DeviceInstancesService, useValue: deviceInstancesServiceSpy},
                {provide: DeviceGroupsService, useValue: deviceGroupsServiceSpy},
                {provide: MatDialogRef, useValue: {close: jasmine.createSpy('close')}},
                {provide: MAT_DIALOG_DATA, useValue: {
                    widget,
                    dashboardId: 'dashboard1',
                    userHasUpdateNameAuthorization: true,
                    userHasUpdatePropertiesAuthorization: true,
                }},
            ],
        });
        fixture = TestBed.createComponent(AcControlEditDialogComponent);
        component = fixture.componentInstance;
    }

    /** A device type with one service reading temperature through a content variable carrying the given aspects. */
    function deviceTypeWithAspects(aspectIds: string[]): any {
        return {
            id: 'dt1',
            name: 'thermostat',
            device_class_id: 'urn:infai:ses:device-class:thermostat',
            services: [
                {
                    id: 'service1',
                    local_id: 'service1',
                    name: 'getTemperature',
                    description: '',
                    protocol_id: '',
                    interaction: 'event',
                    inputs: [],
                    outputs: [
                        {
                            id: 'content1',
                            content_variable: {
                                id: 'cv1',
                                name: 'temperature',
                                type: 'https://schema.org/Float',
                                function_id: environment.getTemperatureFunctionId,
                                aspect_ids: aspectIds,
                                serialization_options: [],
                                is_void: false,
                            },
                            content_variable_raw: '',
                            serialization: '',
                            protocol_segment_id: '',
                        },
                    ],
                },
            ],
        };
    }

    it(
        'turns a content variable with several aspects into one measurement, using the alphabetically first as alias',
        (done) => {
            const widget: any = {id: 'w1', name: 'ac', type: 'ac_control', properties: {}};
            init(widget);
            deviceTypeServiceSpy.getDeviceType.and.returnValue(of(deviceTypeWithAspects(['room', 'air'])));
            dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({message: 'OK'}));
            component.form = new FormBuilder().group({
                name: ['ac'], selectable: new FormControl<string | null | undefined>('device1'), minTarget: [15], maxTarget: [30],
            });
            component.selectables = [{device: {id: 'device1', device_type_id: 'dt1'} as any}];

            component.updateACProperties().subscribe(() => {
                const measurements = widget.properties.acControl?.getTemperatureMeasurements;
                expect(measurements?.length).toBe(1);
                expect(measurements?.[0].aspectId).toBe('air');
                done();
            });
        },
    );
});
