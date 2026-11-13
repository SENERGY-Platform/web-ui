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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { DeviceCommandService } from 'src/app/core/services/device-command.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { HeatingScheduleComponent } from './heating-schedule.component';
import { AIR_ASPECT, BATTERY_FUNCTION, READING_ASPECT, TARGET_ASPECT, TEMPERATURE_FUNCTION } from './shared/heating-schedule.details';
import { HeatingScheduleService } from './shared/heating-schedule.service';
import { WARMUP_COLUMNS, WarmupConfig, ZoneWarmup, parseWarmupRow } from './shared/heating-schedule.warmup';
import { HeatingWarmupService } from './shared/heating-schedule.warmup.service';

describe('HeatingScheduleComponent', () => {
    let component: HeatingScheduleComponent;
    let fixture: ComponentFixture<HeatingScheduleComponent>;
    let instances: jasmine.SpyObj<SmartServiceInstanceService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let init: Subject<string>;
    let devices: jasmine.SpyObj<DeviceInstancesService>;
    let deviceTypes: jasmine.SpyObj<DeviceTypeService>;
    let commands: jasmine.SpyObj<DeviceCommandService>;
    let warmup: jasmine.SpyObj<HeatingWarmupService>;

    const configuredWidget = { id: 'w1', name: 'Heating', type: 'heating_schedule', properties: { heatingSchedule: { instanceId: 'inst-1' } } } as unknown as WidgetModel;
    const schedule = '{"windows":[{"weekdays":[0,1,2,3,4,5,6],"from":"00:00","to":"00:00","temperature":21}]}';

    const option = (id: string, label: string) => JSON.stringify({ device_selection: { device_id: id, service_id: null, path: null }, label });
    const thermostats = JSON.stringify([option('urn:a', 'Hall'), option('urn:b', 'Bath'), option('urn:c', 'Kitchen')]);
    const zonesSchedule = '{"zones":[{"name":"Bath","devices":["urn:b"],"windows":[{"weekdays":[0,1,2,3,4,5,6],"from":"00:00","to":"00:00","temperature":24}],"setback":19},{"name":"Rest","windows":[]}]}';

    const instanceWith = (scheduleText: string, setback: unknown, thermostatsValue = '[]'): SmartServiceInstanceModel => ({
        id: 'inst-1',
        name: 'Home',
        release_id: 'rel-1',
        parameters: [
            { id: 'thermostats', value: thermostatsValue, label: 'Thermostats' },
            { id: 'schedule', value: scheduleText, label: 'Schedule' },
            { id: 'setback', value: setback, label: 'Setback' },
        ],
    } as unknown as SmartServiceInstanceModel);

    beforeEach(async () => {
        init = new Subject<string>();
        instances = jasmine.createSpyObj<SmartServiceInstanceService>('SmartServiceInstanceService', ['getInstance']);
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        devices = jasmine.createSpyObj<DeviceInstancesService>('DeviceInstancesService', ['getDeviceListByIds']);
        deviceTypes = jasmine.createSpyObj<DeviceTypeService>('DeviceTypeService', ['getDeviceTypeListByIds']);
        commands = jasmine.createSpyObj<DeviceCommandService>('DeviceCommandService', ['runCommands']);
        devices.getDeviceListByIds.and.returnValue(of([]));
        deviceTypes.getDeviceTypeListByIds.and.returnValue(of([]));
        commands.runCommands.and.returnValue(of([]));
        warmup = jasmine.createSpyObj<HeatingWarmupService>('HeatingWarmupService', ['config', 'newestRows']);
        warmup.config.and.returnValue(of(null));
        warmup.newestRows.and.returnValue(of([]));
        await TestBed.configureTestingModule({
            imports: [HeatingScheduleComponent],
            providers: [
                { provide: SmartServiceInstanceService, useValue: instances },
                { provide: HeatingScheduleService, useValue: jasmine.createSpyObj('HeatingScheduleService', ['openEditDialog']) },
                { provide: MatDialog, useValue: dialog },
                { provide: DeviceInstancesService, useValue: devices },
                { provide: DeviceTypeService, useValue: deviceTypes },
                { provide: DeviceCommandService, useValue: commands },
                { provide: HeatingWarmupService, useValue: warmup },
                { provide: DashboardService, useValue: { initWidgetObservable: init.asObservable() } },
            ],
        })
            .overrideComponent(HeatingScheduleComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
            .compileComponents();

        fixture = TestBed.createComponent(HeatingScheduleComponent);
        component = fixture.componentInstance;
    });

    it('asks to configure the widget and does not load without an instance', () => {
        component.widget = { id: 'w1', name: 'x', type: 'heating_schedule', properties: {} } as unknown as WidgetModel;
        fixture.detectChanges();
        init.next('reloadAll');
        fixture.detectChanges();

        expect(instances.getInstance).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('Please configure widget!');
    });

    it('loads the configured instance and shows the current target and seven week rows', () => {
        instances.getInstance.and.returnValue(of(instanceWith(schedule, 17)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(instances.getInstance).toHaveBeenCalledWith('inst-1');
        expect(fixture.nativeElement.querySelector('.current').textContent).toContain('21 °C');
        expect(fixture.nativeElement.querySelector('.next')).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('.week .bar').length).toBe(7);
        expect(fixture.nativeElement.querySelector('.edit-schedule')).not.toBeNull();
    });

    it('shows one block per zone with its thermostats, its own target and its own week', () => {
        instances.getInstance.and.returnValue(of(instanceWith(zonesSchedule, 17, thermostats)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        const zones: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.zone'));
        expect(zones.length).toBe(2);
        expect(zones[0].querySelector('.zone-name')!.textContent).toBe('Bath');
        expect(zones[0].querySelector('.zone-devices')!.textContent).toBe('Bath');
        expect(zones[0].querySelector('.current')!.textContent).toContain('24 °C');
        expect(zones[1].querySelector('.zone-name')!.textContent).toBe('Rest');
        expect(zones[1].querySelector('.zone-devices')!.textContent).toBe('Hall, Kitchen');
        expect(zones[1].querySelector('.current')!.textContent).toContain('17 °C');
        expect(fixture.nativeElement.querySelectorAll('.week .bar').length).toBe(0);
        zones.forEach((zone) => (zone.querySelector('.week-toggle') as HTMLElement).click());
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.week .bar').length).toBe(14);
    });

    it('leaves a zone without a selected thermostat out and shows a legacy plan without a zone name', () => {
        const gone = '{"zones":[{"name":"Weg","devices":["urn:x"],"windows":[]},{"name":"Da","devices":["urn:a"],"windows":[]}]}';
        instances.getInstance.and.returnValue(of(instanceWith(gone, 17, thermostats)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();
        expect(Array.from(fixture.nativeElement.querySelectorAll('.zone-name')).map((element) => (element as HTMLElement).textContent)).toEqual(['Da']);

        instances.getInstance.and.returnValue(of(instanceWith(schedule, 17, thermostats)));
        init.next('w1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.zone').length).toBe(1);
        expect(fixture.nativeElement.querySelector('.zone-name')).toBeNull();
    });

    it('shortens a long thermostat list and keeps the full one as title', () => {
        const many = JSON.stringify(['a', 'b', 'c', 'd', 'e'].map((id) => option('urn:' + id, 'T' + id)));
        instances.getInstance.and.returnValue(of(instanceWith(zonesSchedule, 17, many)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        const shown: HTMLElement = fixture.nativeElement.querySelectorAll('.zone-devices')[1];
        expect(shown.textContent).toBe('Ta, Tc, Td and 1 more');
        expect(shown.title).toBe('Ta, Tc, Td, Te');
    });

    it('shows a resolution error of the smart service and offers no editor', () => {
        const twice = '{"zones":[{"name":"X","devices":["urn:a"],"windows":[]},{"name":"Y","devices":["urn:a"],"windows":[]}]}';
        instances.getInstance.and.returnValue(of(instanceWith(twice, 17, thermostats)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('cannot be read');
        expect(fixture.nativeElement.textContent).toContain('Hall');
        expect(fixture.nativeElement.querySelector('.zone')).toBeNull();
        expect(fixture.nativeElement.querySelector('.edit-schedule')).toBeNull();
    });

    it('shows the raw text next to a resolution error', () => {
        const twice = '{"zones":[{"name":"X","devices":["urn:a"],"windows":[]},{"name":"Y","devices":["urn:a"],"windows":[]}]}';
        instances.getInstance.and.returnValue(of(instanceWith(twice, 17, thermostats)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.raw').textContent).toBe(twice);
    });

    it('hands the stored zones, the setback and the thermostats to the editor', () => {
        instances.getInstance.and.returnValue(of(instanceWith(zonesSchedule, 17, thermostats)));
        dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');

        component.editSchedule();

        const data = dialog.open.calls.mostRecent().args[1]!.data as { zones: { name: string; devices: string[] | null }[]; setback: number; thermostats: { label: string }[] };
        expect(data.zones.map((zone) => [zone.name, zone.devices])).toEqual([['Bath', ['urn:b']], ['Rest', null]]);
        expect(data.setback).toBe(17);
        expect(data.thermostats.map((thermostat) => thermostat.label)).toEqual(['Hall', 'Bath', 'Kitchen']);
    });

    it('shows a failed load as an error and offers no editor', () => {
        instances.getInstance.and.returnValue(throwError(() => new Error('boom')));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('reloadAll');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('The heating schedule could not be loaded.');
        expect(fixture.nativeElement.querySelector('.edit-schedule')).toBeNull();
    });

    it('shows a stored plan it cannot read with its raw text instead of overwriting it', () => {
        instances.getInstance.and.returnValue(of(instanceWith('not json', 17)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('reloadAll');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('cannot be read');
        expect(fixture.nativeElement.querySelector('.raw').textContent).toContain('not json');
        expect(fixture.nativeElement.querySelector('.edit-schedule')).toBeNull();
    });

    it('offers the editor only with the administrate permission', () => {
        const withRights = (administrate: boolean) => ({ ...instanceWith(schedule, 17), permissions_info: { shared: false, permissions: { administrate, execute: true, read: true, write: true } } } as SmartServiceInstanceModel);
        component.widget = configuredWidget;
        fixture.detectChanges();

        instances.getInstance.and.returnValue(of(withRights(true)));
        init.next('w1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.edit-schedule')).not.toBeNull();

        instances.getInstance.and.returnValue(of(withRights(false)));
        init.next('w1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.edit-schedule')).toBeNull();
    });

    it('drops the raw text of an unreadable plan when the next load fails', () => {
        component.widget = configuredWidget;
        fixture.detectChanges();
        instances.getInstance.and.returnValue(of(instanceWith('not json', 17)));
        init.next('w1');
        fixture.detectChanges();
        instances.getInstance.and.returnValue(throwError(() => new Error('boom')));
        init.next('w1');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.raw')).toBeNull();
    });

    it('says why the editor is not offered for a window it cannot show', () => {
        instances.getInstance.and.returnValue(of(instanceWith('{"windows":[{"from":"24:00","to":"06:00","temperature":20}]}', 17)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('cannot show window 1');
        expect(fixture.nativeElement.querySelector('.edit-schedule')).toBeNull();
    });

    it('names the zone of a window the editor cannot show', () => {
        const stored = '{"zones":[{"name":"Bath","windows":[{"from":"24:00","to":"06:00","temperature":20}]}]}';
        instances.getInstance.and.returnValue(of(instanceWith(stored, 17, thermostats)));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('cannot show window 1 of zone Bath');
    });

    it('reloads after the editor saved', () => {
        instances.getInstance.and.returnValue(of(instanceWith(schedule, 17)));
        dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        instances.getInstance.calls.reset();

        component.editSchedule();

        expect(dialog.open).toHaveBeenCalled();
        expect(instances.getInstance).toHaveBeenCalledWith('inst-1');
    });

    describe('details', () => {
        const type = (id: string, ...variables: unknown[]) => ({
            id,
            services: [{ id: 's-' + id, outputs: variables.map((content_variable) => ({ content_variable })) }],
        });
        const variable = (function_id: string, aspect_ids: string[]) => ({ function_id, aspect_ids, is_void: false, serialization_options: [] });
        const constant = (temperature: number) => '{"windows":[{"weekdays":[0,1,2,3,4,5,6],"from":"00:00","to":"00:00","temperature":' + temperature + '}]}';

        /** Hall has room, set point and battery; the commands are answered in this order. */
        function deviceValues(room: number, setPoint: number, battery: number): void {
            devices.getDeviceListByIds.and.returnValue(of([{ id: 'urn:a', device_type_id: 'dt' }] as unknown as DeviceInstanceModel[]));
            deviceTypes.getDeviceTypeListByIds.and.returnValue(of([type('dt',
                variable(TEMPERATURE_FUNCTION, [AIR_ASPECT, READING_ASPECT]), variable(TEMPERATURE_FUNCTION, [TARGET_ASPECT]), variable(BATTERY_FUNCTION, ['urn:aspect:device'])) as unknown as DeviceTypeModel]));
            commands.runCommands.and.returnValue(of([room, setPoint, battery].map((message) => ({ status_code: 200, message }))));
        }

        function load(scheduleText: string, instanceOverrides: Partial<SmartServiceInstanceModel> = {}): void {
            instances.getInstance.and.returnValue(of({ ...instanceWith(scheduleText, 17, JSON.stringify([option('urn:a', 'Hall')])), ready: true, ...instanceOverrides } as SmartServiceInstanceModel));
            component.widget = configuredWidget;
            fixture.detectChanges();
            init.next('w1');
            fixture.detectChanges();
        }

        const text = (selector: string) => fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? null;

        it('shows the instance status as error, starting or running', () => {
            load(constant(21), { error: 'The service failed' });
            expect(text('.status-error')).toBe('The service failed');

            load(constant(21), { ready: false });
            expect(text('.status-starting')).toBe('Starting');
            expect(fixture.nativeElement.querySelector('.status-error')).toBeNull();

            load(constant(21));
            expect(text('.status-running')).toBe('Running');
        });

        it('shows the measured value big with the planned target beside it', () => {
            deviceValues(21.3, 24, 80);
            load(constant(24));

            expect(text('.current')).toBe('21.3 °C');
            expect(text('.target')).toBe('target 24 °C');
            expect(fixture.nativeElement.querySelector('.batteries')).toBeNull();
            expect(fixture.nativeElement.querySelector('.manual')).toBeNull();
        });

        it('keeps the planned target big without a room value and shows no error for missing values', () => {
            devices.getDeviceListByIds.and.returnValue(of([{ id: 'urn:a', device_type_id: 'dt' }] as unknown as DeviceInstanceModel[]));
            deviceTypes.getDeviceTypeListByIds.and.returnValue(of([type('dt', variable(TEMPERATURE_FUNCTION, [TARGET_ASPECT])) as unknown as DeviceTypeModel]));
            commands.runCommands.and.returnValue(of([{ status_code: 200, message: 24 }]));
            load(constant(24));

            expect(text('.current')).toBe('24 °C');
            expect(fixture.nativeElement.querySelector('.target')).toBeNull();
            expect(fixture.nativeElement.querySelector('.message.error')).toBeNull();
        });

        it('shows the widget as before when the device lookup or the batch fails', () => {
            devices.getDeviceListByIds.and.returnValue(throwError(() => new Error('lookup')));
            load(constant(24));
            expect(text('.current')).toBe('24 °C');

            devices.getDeviceListByIds.and.returnValue(of([{ id: 'urn:a', device_type_id: 'dt' }] as unknown as DeviceInstanceModel[]));
            deviceTypes.getDeviceTypeListByIds.and.returnValue(of([type('dt', variable(TEMPERATURE_FUNCTION, [AIR_ASPECT, READING_ASPECT])) as unknown as DeviceTypeModel]));
            commands.runCommands.and.returnValue(of([]));
            init.next('w1');
            fixture.detectChanges();
            expect(text('.current')).toBe('24 °C');
        });

        it('names a thermostat with a low battery', () => {
            deviceValues(21, 24, 12);
            load(constant(24));

            expect(text('.battery')).toContain('Hall 12 %');
        });

        it('warns about a manual override without a next switch', () => {
            deviceValues(21, 23, 80);
            load(constant(24));

            expect(text('.manual')).toBe('Manual 23 °C');
        });

        it('expands the week of a single zone and collapses it with several, and the toggle switches it', () => {
            load(constant(21));
            expect(fixture.nativeElement.querySelectorAll('.week .bar').length).toBe(7);
            expect(fixture.nativeElement.querySelector('.week-toggle').getAttribute('aria-label')).toBe('Hide week');
            expect(fixture.nativeElement.querySelectorAll('.week .now-marker').length).toBe(1);
            expect(fixture.nativeElement.querySelectorAll('.bar-today .now-marker').length).toBe(1);

            (fixture.nativeElement.querySelector('.week-toggle') as HTMLElement).click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.week')).toBeNull();
            expect(fixture.nativeElement.querySelector('.week-toggle').getAttribute('aria-label')).toBe('Show week');
        });

        it('shows the legend of the colour scale', () => {
            load(constant(21));

            expect(text('.legend')).toContain('16 °C');
            expect(text('.legend')).toContain('22 °C');
        });

        describe('warm-up', () => {
            const config: WarmupConfig = { exportId: 'exp-1', mode: 'plan' };
            const WARMUP_NOW = Date.UTC(2026, 10, 10, 3, 0);

            const row = (values: Partial<Record<typeof WARMUP_COLUMNS[number], unknown>>): ZoneWarmup =>
                parseWarmupRow(['2026-11-10T02:30:00Z', ...WARMUP_COLUMNS.map((name) => values[name] ?? null)]);

            const modelRow = row({
                warmup_minutes: 35, next_start: '2026-11-10T05:00:00Z', next_target: 21, next_lead_minutes: 35,
                windows: JSON.stringify([{ start: '2026-11-10T05:00:00Z', target: 21, outdoor: 3, lead_minutes: 35 }]),
                measure_station: '{"id":"4","name":"Leipzig","distance_km":12.3}', forecast_station: null, a: 1.5, b: 0.1, episodes: 5,
            });

            beforeEach(() => {
                jasmine.clock().install();
                jasmine.clock().mockDate(new Date(WARMUP_NOW));
            });

            afterEach(() => jasmine.clock().uninstall());

            it('shows the warm-up lines, the hatch and the stations when the instance has a warm-up export', () => {
                warmup.config.and.returnValue(of(config));
                warmup.newestRows.and.returnValue(of([modelRow]));
                load(constant(21));

                expect(warmup.newestRows).toHaveBeenCalledWith('exp-1', [0]);
                expect(text('.warming')).toBe('Warming up to 21 °C, about 35 min left');
                expect(text('.window-text')).toBe('Heats from 05:25 for 21 °C at 06:00');
                expect(fixture.nativeElement.querySelector('.learning')).toBeNull();
                expect(fixture.nativeElement.querySelectorAll('.bar-today .hatch').length).toBe(1);
                expect(fixture.nativeElement.querySelectorAll('.week .hatch').length).toBe(1);
                expect(text('.stations')).toBe('Outdoor: Leipzig (12.3 km)');
            });

            it('reads the row of the plan position when an earlier zone has no thermostat left', () => {
                const gone = '{"name":"Gone","devices":["urn:x"],"windows":[]}';
                const bath = '{"name":"Bath","devices":["urn:a"],"windows":[{"weekdays":[0,1,2,3,4,5,6],"from":"00:00","to":"00:00","temperature":21}]}';
                warmup.config.and.returnValue(of(config));
                warmup.newestRows.and.returnValue(of([modelRow]));
                load('{"zones":[' + gone + ',' + bath + ']}');

                expect(warmup.newestRows).toHaveBeenCalledWith('exp-1', [1]);
                expect(fixture.nativeElement.querySelectorAll('.zone').length).toBe(1);
                expect(text('.warming')).toBe('Warming up to 21 °C, about 35 min left');
            });

            it('shows the learning line for a zone without a row and keeps the rest as it was', () => {
                warmup.config.and.returnValue(of(config));
                warmup.newestRows.and.returnValue(of([null]));
                load(constant(21));

                expect(text('.learning')).toBe('Learning the warm-up time');
                expect(fixture.nativeElement.querySelector('.warming')).toBeNull();
                expect(fixture.nativeElement.querySelector('.hatch')).toBeNull();
                expect(fixture.nativeElement.querySelector('.stations')).toBeNull();
            });

            it('shows nothing of it for an instance without a warm-up export', () => {
                load(constant(21));

                expect(warmup.newestRows).not.toHaveBeenCalled();
                for (const selector of ['.warming', '.window-text', '.learning', '.hatch', '.stations']) {
                    expect(fixture.nativeElement.querySelector(selector)).withContext(selector).toBeNull();
                }
            });
        });
    });
});
