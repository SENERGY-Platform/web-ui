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


import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { EMPTY, Observable, of, Subject } from 'rxjs';

import { AcControlComponent } from './ac-control.component';
import { AcControlElementModel } from './shared/ac-control.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceCommandResponseModel, DeviceCommandService } from '../../core/services/device-command.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DeviceInstancesService } from '../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceGroupsService } from '../../modules/devices/device-groups/shared/device-groups.service';
import { environment } from '../../../environments/environment';

describe('AcControlComponent command results', () => {
    let component: AcControlComponent;
    let runCommands: jasmine.Spy;
    let snackOpen: jasmine.Spy;

    const element = (value?: any): AcControlElementModel => ({ aspectId: 'a', functionId: 'f', serviceId: 's', value });
    const answer = (...codes: number[]): Observable<DeviceCommandResponseModel[]> => of(codes.map((code) => ({ status_code: code })));

    beforeEach(() => {
        runCommands = jasmine.createSpy('runCommands');
        snackOpen = jasmine.createSpy('open');
        TestBed.configureTestingModule({
            providers: [
                { provide: DashboardService, useValue: { initWidgetObservable: EMPTY } },
                { provide: DeviceCommandService, useValue: { runCommands } },
                { provide: MatDialog, useValue: {} },
                { provide: MatSnackBar, useValue: { open: snackOpen } },
                { provide: DeviceInstancesService, useValue: {} },
                { provide: DeviceTypeService, useValue: {} },
                { provide: DeviceGroupsService, useValue: {} },
            ],
        });
        component = TestBed.createComponent(AcControlComponent).componentInstance;
        component.widget = {
            id: 'w1',
            properties: {
                acControl: {
                    deviceId: 'd1',
                    minTarget: 10,
                    maxTarget: 30,
                    tempStep: 1,
                    getFanSpeedLevel: element(1),
                    setFanSpeedLevel: element(),
                    getTargetTemperature: [element(20), element(20)],
                    setTargetTemperature: [element(), element()],
                },
            },
        } as unknown as WidgetModel;
        localStorage.removeItem('w1_bufferTime');
        localStorage.removeItem('w1_bufferValue');
    });

    afterEach(() => {
        localStorage.removeItem('w1_bufferTime');
        localStorage.removeItem('w1_bufferValue');
    });

    const lastSnack = () => snackOpen.calls.mostRecent().args[0] as string;

    describe('runCommand', () => {
        it('shows the new value after a 200 answer', () => {
            runCommands.and.returnValue(answer(200));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(3);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('keeps the old value and names the action when the request failed ([])', () => {
            runCommands.and.returnValue(of([]));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(1);
            expect(lastSnack()).toContain('The command could not be sent to the device');
        });

        it('keeps the old value and names the action when the command answered with a non-200 status', () => {
            runCommands.and.returnValue(answer(500));
            component.runCommand(component.widget.properties.acControl?.setFanSpeedLevel, 3);
            expect(component.widget.properties.acControl?.getFanSpeedLevel?.value).toBe(1);
            expect(lastSnack()).toContain('The command could not be sent to the device');
        });
    });

    describe('setAllTargets', () => {
        it('shows and buffers the new target after only 200 answers', () => {
            runCommands.and.returnValue(answer(200, 200));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([24, 24]);
            expect(component.bufferedSetTemperature).toBe(24);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('keeps the old target and the buffer when the request failed ([])', () => {
            runCommands.and.returnValue(of([]));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([20, 20]);
            expect(component.bufferedSetTemperature).toBeNull();
            expect(lastSnack()).toContain('The target temperature could not be set');
        });

        it('keeps the old target when one of the commands answered with a non-200 status', () => {
            runCommands.and.returnValue(answer(200, 502));
            component.setAllTargets(24);
            expect(component.widget.properties.acControl?.getTargetTemperature?.map((e) => e.value)).toEqual([20, 20]);
            expect(component.bufferedSetTemperature).toBeNull();
            expect(lastSnack()).toContain('The target temperature could not be set');
        });
    });
});

describe('AcControlComponent', () => {
    const dashboardServiceSpy: Spy<DashboardService> = createSpyFromClass<DashboardService>(DashboardService);
    const deviceCommandServiceSpy: Spy<DeviceCommandService> = createSpyFromClass<DeviceCommandService>(DeviceCommandService);
    const deviceInstancesServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const deviceGroupsServiceSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);

    // the placeholders in environment.ts are the same string for every function and every aspect
    const ids = {getTemperatureFunctionId: 'get-temperature', setTemperatureFunctionId: 'set-temperature', aspectTargetId: 'target', aspectReadingId: 'reading'};
    let saved: Record<string, string> = {};

    /** A thermostat as the metadata migration of 2026-10-05 left it: setpoint and measurement on Get-Temperature. */
    const deviceType: any = {
        id: 'dt1',
        services: [
            {id: 'get-target', inputs: [], outputs: [{content_variable: {name: 'value', type: 'https://schema.org/Float', function_id: 'get-temperature', aspect_ids: ['target', 'air']}}]},
            {id: 'get-temperature', inputs: [], outputs: [{content_variable: {name: 'value', type: 'https://schema.org/Float', function_id: 'get-temperature', aspect_ids: ['air', 'reading']}}]},
            {id: 'set-target', inputs: [{content_variable: {name: 'temperature', type: 'https://schema.org/Float', function_id: 'set-temperature', aspect_ids: ['target', 'air']}}], outputs: []},
        ],
    };

    /** A widget saved before the aspect lists, naming functions that no longer exist. */
    function legacyWidget(): any {
        return {
            id: 'w1', name: 'thermostat', type: 'ac_control',
            properties: {acControl: {
                deviceId: 'device1', minTarget: 16, maxTarget: 26, tempStep: -1,
                getTargetTemperature: [{functionId: 'old-get-target-temperature', aspectId: 'air', serviceId: 'get-target'}],
                getTemperatureMeasurements: [{functionId: 'old-get-temperature', aspectId: 'air', serviceId: 'get-temperature'}],
                setTargetTemperature: [{functionId: 'old-set-target-temperature', aspectId: 'air', serviceId: 'set-target'}],
                getLocked: {functionId: 'old-get-lock-state', aspectId: 'air'},
            }},
        };
    }

    function create(widget: any, userHasUpdatePropertiesAuthorization: boolean): AcControlComponent {
        TestBed.configureTestingModule({
            providers: [
                {provide: DashboardService, useValue: dashboardServiceSpy},
                {provide: DeviceCommandService, useValue: deviceCommandServiceSpy},
                {provide: DeviceInstancesService, useValue: deviceInstancesServiceSpy},
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy},
                {provide: DeviceGroupsService, useValue: deviceGroupsServiceSpy},
                {provide: MatDialog, useValue: {}},
            ],
        });
        const component = TestBed.createComponent(AcControlComponent).componentInstance;
        component.dashboardId = 'dashboard1';
        component.widget = widget;
        component.userHasUpdatePropertiesAuthorization = userHasUpdatePropertiesAuthorization;
        return component;
    }

    beforeEach(() => {
        saved = {};
        Object.keys(ids).forEach(k => saved[k] = (environment as any)[k]);
        Object.assign(environment, ids);
        (dashboardServiceSpy as any).initWidgetObservable = new Subject<string>();
        dashboardServiceSpy.updateWidgetProperty.calls.reset();
        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({message: 'OK'}));
        deviceInstancesServiceSpy.getDeviceInstanceBaseModel.and.returnValue(of({id: 'device1', device_type_id: 'dt1'} as any));
        deviceTypeServiceSpy.getDeviceType.calls.reset();
        deviceTypeServiceSpy.getDeviceType.and.returnValue(of(deviceType));
        deviceCommandServiceSpy.runCommands.calls.reset();
        deviceCommandServiceSpy.runCommands.and.returnValue(of([]));
    });

    afterEach(() => Object.assign(environment, saved));

    it('derives a configuration saved before the aspect lists again and stores it', () => {
        const widget = legacyWidget();
        const component = create(widget, true);

        component.ngOnInit();

        const acControl = widget.properties.acControl;
        expect(acControl.deviceId).toBe('device1');
        expect(acControl.minTarget).toBe(16);
        expect(acControl.maxTarget).toBe(26);
        expect(acControl.getTargetTemperature.map((e: any) => [e.functionId, e.serviceId, e.aspectIds]))
            .toEqual([['get-temperature', 'get-target', ['target', 'air']]]);
        expect(acControl.getTemperatureMeasurements.map((e: any) => [e.functionId, e.serviceId, e.aspectIds]))
            .toEqual([['get-temperature', 'get-temperature', ['air', 'reading']]]);
        expect(acControl.setTargetTemperature.map((e: any) => [e.functionId, e.serviceId, e.aspectIds]))
            .toEqual([['set-temperature', 'set-target', ['target', 'air']]]);
        expect(acControl.getLocked).toBeUndefined();
        expect(dashboardServiceSpy.updateWidgetProperty).toHaveBeenCalledWith('dashboard1', 'w1', [], widget.properties);

        // the first reading already goes out with the migrated functions
        const commands = deviceCommandServiceSpy.runCommands.calls.mostRecent().args[0];
        expect(commands.map((c: any) => c.function_id)).toEqual(['get-temperature', 'get-temperature']);
        expect(commands.every((c: any) => c.aspect_ids !== undefined && c.aspect_id === undefined)).toBeTrue();
    });

    it('migrates without storing when the user may not change the widget', () => {
        const widget = legacyWidget();
        const component = create(widget, false);

        component.ngOnInit();

        expect(widget.properties.acControl.setTargetTemperature[0].functionId).toBe('set-temperature');
        expect(dashboardServiceSpy.updateWidgetProperty).not.toHaveBeenCalled();
    });

    it('leaves a current configuration alone', () => {
        const widget = legacyWidget();
        widget.properties.acControl = {
            deviceId: 'device1', minTarget: 16, maxTarget: 26, tempStep: 0.5,
            setTargetTemperature: [{functionId: 'set-temperature', aspectIds: ['target', 'air'], serviceId: 'set-target'}],
        };
        const component = create(widget, true);

        component.ngOnInit();

        expect(deviceTypeServiceSpy.getDeviceType).not.toHaveBeenCalled();
        expect(dashboardServiceSpy.updateWidgetProperty).not.toHaveBeenCalled();
    });

    it('does not store a migration that loses a role, but still uses it', () => {
        // the setpoint control lacks Target, as before the metadata migration of 2026-10-14
        deviceTypeServiceSpy.getDeviceType.and.returnValue(of({
            ...deviceType,
            services: deviceType.services.map((s: any) => s.id !== 'set-target' ? s : {
                ...s, inputs: [{content_variable: {...s.inputs[0].content_variable, aspect_ids: ['air']}}],
            }),
        }));
        const widget = legacyWidget();
        const component = create(widget, true);

        component.ngOnInit();

        expect(widget.properties.acControl.getTargetTemperature[0].functionId).toBe('get-temperature');
        expect(widget.properties.acControl.setTargetTemperature).toBeUndefined();
        expect(dashboardServiceSpy.updateWidgetProperty).not.toHaveBeenCalled();
    });

    it('migrates a device group configuration from the group\'s criteria', () => {
        deviceGroupsServiceSpy.getDeviceGroup.and.returnValue(of({id: 'group1', criteria: [
            {function_id: 'get-temperature', aspect_id: 'target', aspect_ids: ['target'], interaction: 'request'},
            {function_id: 'get-temperature', aspect_id: 'reading', aspect_ids: ['reading'], interaction: 'request'},
            {function_id: 'set-temperature', aspect_id: 'target', aspect_ids: ['target'], interaction: 'request'},
        ]} as any));
        const widget = legacyWidget();
        delete widget.properties.acControl.deviceId;
        widget.properties.acControl.deviceGroupId = 'group1';
        const component = create(widget, true);

        component.ngOnInit();

        const acControl = widget.properties.acControl;
        expect(acControl.deviceGroupId).toBe('group1');
        expect(acControl.setTargetTemperature.map((e: any) => e.aspectIds)).toEqual([['target']]);
        expect(acControl.getTemperatureMeasurements.map((e: any) => e.aspectIds)).toEqual([['reading']]);
        expect(dashboardServiceSpy.updateWidgetProperty).toHaveBeenCalled();
    });

    it('leaves the configuration unchanged when the device cannot be read', () => {
        deviceInstancesServiceSpy.getDeviceInstanceBaseModel.and.returnValue(of(null));
        const widget = legacyWidget();
        const component = create(widget, true);

        component.ngOnInit();

        expect(widget.properties.acControl.setTargetTemperature[0].functionId).toBe('old-set-target-temperature');
        expect(dashboardServiceSpy.updateWidgetProperty).not.toHaveBeenCalled();
    });
});
