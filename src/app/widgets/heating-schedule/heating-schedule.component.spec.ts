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

    const instanceWith = (scheduleText: string, setback: unknown): SmartServiceInstanceModel => ({
        id: 'inst-1',
        name: 'Home',
        release_id: 'rel-1',
        parameters: [
            { id: 'thermostats', value: '[]', label: 'Thermostats' },
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
