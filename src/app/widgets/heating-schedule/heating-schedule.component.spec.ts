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
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { HeatingScheduleComponent } from './heating-schedule.component';
import { HeatingScheduleService } from './shared/heating-schedule.service';

describe('HeatingScheduleComponent', () => {
    let component: HeatingScheduleComponent;
    let fixture: ComponentFixture<HeatingScheduleComponent>;
    let instances: jasmine.SpyObj<SmartServiceInstanceService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let init: Subject<string>;

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
        await TestBed.configureTestingModule({
            imports: [HeatingScheduleComponent],
            providers: [
                { provide: SmartServiceInstanceService, useValue: instances },
                { provide: HeatingScheduleService, useValue: jasmine.createSpyObj('HeatingScheduleService', ['openEditDialog']) },
                { provide: MatDialog, useValue: dialog },
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
        expect(fixture.nativeElement.querySelectorAll('.bar').length).toBe(7);
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
        expect(fixture.nativeElement.querySelectorAll('.bar').length).toBe(14);
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

        const devices: HTMLElement = fixture.nativeElement.querySelectorAll('.zone-devices')[1];
        expect(devices.textContent).toBe('Ta, Tc, Td and 1 more');
        expect(devices.title).toBe('Ta, Tc, Td, Te');
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
});
