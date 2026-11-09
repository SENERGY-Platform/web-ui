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
import { of } from 'rxjs';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceExtendedParameterModel } from 'src/app/modules/smart-services/releases/shared/release.model';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { HeatingScheduleService } from './heating-schedule.service';

describe('HeatingScheduleService.saveSchedule', () => {
    let service: HeatingScheduleService;
    let releases: jasmine.SpyObj<SmartServiceReleasesService>;
    let instances: jasmine.SpyObj<SmartServiceInstanceService>;

    /** the stored shape: one JSON text holding a list of JSON-text option values */
    const thermostats = '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:c14a6d2e-243a-4c7a-a879-68e1dca1e187\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"CT Thermostat\\"}"]';
    const otherThermostats = '["{\\"device_selection\\":{\\"device_id\\":\\"urn:infai:ses:device:other\\",\\"service_id\\":null,\\"path\\":null},\\"label\\":\\"Other\\"}"]';
    const instanceOf = (thermostatsValue: string) => ({
        id: 'inst-1',
        release_id: 'rel-1',
        parameters: [
            { id: 'thermostats', value: thermostatsValue, label: 'Thermostats' },
            { id: 'schedule', value: '{"windows":[]}', label: 'Schedule' },
            { id: 'setback', value: 17, label: 'Setback' },
        ],
    } as unknown as SmartServiceInstanceModel);
    const instance = instanceOf(thermostats);

    const released = (id: string, label: string, extra: Partial<SmartServiceExtendedParameterModel>): SmartServiceExtendedParameterModel => ({
        id, label, value: null, type: 'https://schema.org/Text', multiple: false, optional: false, options: [], ...extra,
    } as unknown as SmartServiceExtendedParameterModel);

    const releaseParameters = (): SmartServiceExtendedParameterModel[] => [
        released('thermostats', 'Thermostats', {
            multiple: true,
            options: [{ label: 'CT Thermostat', value: JSON.parse(thermostats)[0] }] as never,
        }),
        released('schedule', 'Schedule', {}),
        released('setback', 'Setback', { type: 'https://schema.org/Integer' }),
    ];

    beforeEach(() => {
        releases = jasmine.createSpyObj<SmartServiceReleasesService>('SmartServiceReleasesService', ['getReleaseParameters']);
        instances = jasmine.createSpyObj<SmartServiceInstanceService>('SmartServiceInstanceService', ['getInstance', 'updateInstanceParameters']);
        instances.getInstance.and.returnValue(of(instance));
        TestBed.configureTestingModule({
            providers: [
                HeatingScheduleService,
                { provide: SmartServiceReleasesService, useValue: releases },
                { provide: SmartServiceInstanceService, useValue: instances },
                { provide: MatDialog, useValue: {} },
                { provide: DashboardService, useValue: {} },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
            ],
        });
        service = TestBed.inject(HeatingScheduleService);
    });

    it('sends every parameter without a release id, keeps the thermostats as they are and replaces schedule and setback', () => {
        releases.getReleaseParameters.and.returnValue(of(releaseParameters()));
        instances.updateInstanceParameters.and.returnValue(of(instance));
        const schedule = '{"windows":[{"weekdays":[0],"from":"06:00","to":"08:00","temperature":20.5}]}';
        let result: boolean | undefined;

        service.saveSchedule('inst-1', schedule, 16).subscribe((saved) => (result = saved));

        expect(result).toBeTrue();
        expect(instances.updateInstanceParameters).toHaveBeenCalledOnceWith('inst-1', [
            { id: 'thermostats', value: thermostats, label: 'Thermostats' },
            { id: 'schedule', value: schedule, label: 'Schedule' },
            { id: 'setback', value: 16, label: 'Setback' },
        ]);
    });

    it('merges into the instance as it is when saving, not as the widget loaded it', () => {
        instances.getInstance.and.returnValue(of(instanceOf(otherThermostats)));
        releases.getReleaseParameters.and.returnValue(of(releaseParameters()));
        instances.updateInstanceParameters.and.returnValue(of(instance));

        service.saveSchedule('inst-1', '{"windows":[]}', 17).subscribe();

        expect(instances.getInstance).toHaveBeenCalledWith('inst-1');
        const sent = instances.updateInstanceParameters.calls.mostRecent().args[1];
        expect(sent.find((parameter) => parameter.id === 'thermostats')?.value).toBe(otherThermostats);
    });

    it('writes nothing when the instance cannot be read again', () => {
        instances.getInstance.and.returnValue(of(null));
        let result: boolean | undefined;

        service.saveSchedule('inst-1', '{"windows":[]}', 17).subscribe((saved) => (result = saved));

        expect(result).toBeFalse();
        expect(instances.updateInstanceParameters).not.toHaveBeenCalled();
    });

    it('writes nothing when the release parameters cannot be loaded', () => {
        releases.getReleaseParameters.and.returnValue(of(null));
        let result: boolean | undefined;

        service.saveSchedule('inst-1', '{"windows":[]}', 17).subscribe((saved) => (result = saved));

        expect(result).toBeFalse();
        expect(instances.updateInstanceParameters).not.toHaveBeenCalled();
    });

    it('reports a failed write as not saved', () => {
        releases.getReleaseParameters.and.returnValue(of(releaseParameters()));
        instances.updateInstanceParameters.and.returnValue(of(null));
        let result: boolean | undefined;

        service.saveSchedule('inst-1', '{"windows":[]}', 17).subscribe((saved) => (result = saved));

        expect(result).toBeFalse();
    });
});
