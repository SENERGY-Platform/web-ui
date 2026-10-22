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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { provideAppCharts } from '../../../../core/charts/provide-app-charts';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { ExportDataService } from '../../../../widgets/shared/export-data.service';
import { DeviceTypeModel, DeviceTypeServiceModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { DeviceInstancesServiceDialogComponent } from './device-instances-service-dialog.component';

describe('DeviceInstancesServiceDialogComponent', () => {
    let fixture: ComponentFixture<DeviceInstancesServiceDialogComponent>;
    let component: DeviceInstancesServiceDialogComponent;
    let exportData: Spy<ExportDataService>;
    let instances: Spy<DeviceInstancesService>;
    let authorization: Spy<AuthorizationService>;
    let dialogRef: Spy<MatDialogRef<DeviceInstancesServiceDialogComponent>>;
    let fetchSpy: jasmine.Spy;
    let clicked: HTMLAnchorElement[];

    let device: DeviceInstanceModel;
    const services = [
        { id: 'urn:service:a', name: 'Energy', description: 'Energy readings' },
        { id: 'urn:service:b', name: 'Status', description: '' },
    ] as unknown as DeviceTypeServiceModel[];
    const lastValueElements = [
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'value.total' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'value.power' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'state' },
    ];
    const lastValues = [
        { time: '2026-03-01T10:00:00Z', value: 12.5 },
        { time: '2026-03-01T10:00:00Z', value: null },
        { time: '2026-03-01T09:00:00Z', value: 'ok' },
    ];

    function create(options: { history?: boolean; canEdit?: boolean; elements?: typeof lastValueElements; counts?: number[]; values?: typeof lastValues } = {}) {
        exportData = createSpyFromClass(ExportDataService);
        instances = createSpyFromClass(DeviceInstancesService);
        authorization = createSpyFromClass(AuthorizationService);
        dialogRef = createSpyFromClass(MatDialogRef<DeviceInstancesServiceDialogComponent>);
        exportData.getLastValuesTimescale.and.returnValue(of((options.values ?? lastValues) as never));
        exportData.getTimescaleDataAvailability.and.returnValue(of([
            { serviceId: 'urn:service:a' }, { serviceId: 'urn:service:a', groupType: 'mean', groupTime: '1h' },
        ] as never));
        instances.userHasReadAuthorizationConnectionLog.and.returnValue(options.history ?? true);
        instances.getDeviceHistoryV2.and.returnValue(of({ states: [{ time: '2026-03-01T08:00:00Z', connected: true }] } as never));
        instances.convertToShortId.and.returnValue('short');
        authorization.userIsDeveloper.and.returnValue(true);
        authorization.getToken.and.resolveTo('Bearer tok');

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, DeviceInstancesServiceDialogComponent],
            providers: [
                provideAppCharts(),
                provideNativeDateAdapter(),
                { provide: ExportDataService, useValue: exportData },
                { provide: DeviceInstancesService, useValue: instances },
                { provide: AuthorizationService, useValue: authorization },
                { provide: ErrorHandlerService, useValue: createSpyFromClass(ErrorHandlerService) },
                { provide: MatDialogRef, useValue: dialogRef },
                {
                    provide: MAT_DIALOG_DATA, useValue: {
                        device, services, lastValueElements: options.elements ?? lastValueElements, serviceOutputCounts: options.counts ?? [2, 1], canEdit: options.canEdit ?? false,
                        deviceType: { id: 'dt1', services } as unknown as DeviceTypeModel,
                        descriptions: [['total', 'power'], ['state']],
                        units: [['kWh', ''], ['']],
                    }
                },
            ],
        });
        fixture = TestBed.createComponent(DeviceInstancesServiceDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        device = {
            id: 'urn:device:1', local_id: 'local-1', name: 'meter', display_name: 'Meter', device_type_id: 'dt1',
            device_type_name: 'Smart meter', connection_state: 'online', attributes: [],
        } as unknown as DeviceInstanceModel;
        fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response('secret42'));
        clicked = [];
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
            clicked.push(this);
        });
    });

    it('makes exactly the three requests of the dialog when it opens, and no download request', () => {
        create();

        expect(exportData.getLastValuesTimescale).toHaveBeenCalledOnceWith(lastValueElements);
        expect(exportData.getTimescaleDataAvailability).toHaveBeenCalledOnceWith(device.id);
        expect(instances.getDeviceHistoryV2).toHaveBeenCalledOnceWith({ id: device.id, range: '168h' });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not load the connection history without the right', () => {
        create({ history: false });

        expect(instances.getDeviceHistoryV2).not.toHaveBeenCalled();
    });

    it('requests the last values again on refresh with the same elements', () => {
        create();
        component.refresh();

        expect(exportData.getLastValuesTimescale).toHaveBeenCalledTimes(2);
        expect(exportData.getLastValuesTimescale.calls.mostRecent().args).toEqual([lastValueElements]);
        expect(component.lastValueArray.map(s => s.map(v => v.request.columnName))).toEqual([['value.total', 'value.power'], ['state']]);
    });

    it('prepares a download of the chosen service with the format and date range, and downloads the secret url', async () => {
        create();
        component.timeControl.get('from')?.setValue(new Date('2026-03-01T00:00:00Z'));
        component.timeControl.get('to')?.setValue(new Date('2026-03-03T00:00:00Z'));
        component.availabilityControl.setValue({ groupType: 'mean', groupTime: '1h' });

        await component.download(new Event('click'), 0);

        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toBe(environment.timescaleAPIURL + '/prepare-download');
        expect(init.method).toBe('POST');
        expect(init.headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
        expect(JSON.parse(init.body as string)).toEqual({
            serviceId: 'urn:service:a',
            deviceId: device.id,
            columns: [{ name: 'value.total', groupType: 'mean' }, { name: 'value.power', groupType: 'mean' }],
            time: { start: '2026-03-01T00:00:00.000Z', end: '2026-03-04T00:00:00.000Z' },
            groupTime: '1h',
        });
        expect(clicked.length).toBe(1);
        expect(clicked[0].href).toBe(environment.timescaleAPIDownloadURL + '/download/secret42');
        expect(clicked[0].download).toBe('Energy-2026-03-01T00:00:00.000Z-2026-03-04T00:00:00.000Z.csv');
    });

    it('closes with edit when Edit is chosen, and offers Edit only with canEdit', () => {
        create({ canEdit: true });
        const edit = (Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button')) as HTMLButtonElement[])
            .find(b => b.textContent?.includes('Edit'));
        edit?.click();

        expect(dialogRef.close).toHaveBeenCalledOnceWith('edit');

        TestBed.resetTestingModule();
        create({ canEdit: false });
        expect(fixture.nativeElement.querySelector('mat-dialog-actions').textContent).not.toContain('Edit');
    });

    it('shows the name, the connection state, the values and the history without opening anything', () => {
        create();
        const el = fixture.nativeElement as HTMLElement;
        const tiles = Array.from(el.querySelectorAll('.tile')).map(t => t.textContent?.replace(/\s+/g, ' ').trim());

        expect(el.querySelector('senergy-dialog-header')?.textContent).toContain('Meter');
        expect(el.querySelector('.status-chip.online')?.textContent).toBe('Online');
        expect(tiles.length).toBe(3);
        expect(tiles[0]).toContain('value.total');
        expect(tiles[0]).toContain('12.5 kWh');
        expect(tiles[1]).toContain('N/A');
        expect(tiles[2]).toContain('ok');
        expect(el.querySelector('.values-block')?.textContent).toContain('Current values');
        expect(el.querySelector('timeline-chart')).not.toBeNull();
        expect(el.querySelector('.values-block')?.nextElementSibling?.textContent).toContain('Connection history');
    });

    it('keeps the ids and the services behind two collapsed sections', () => {
        create();
        const folds = Array.from(fixture.nativeElement.querySelectorAll('details.fold')) as HTMLDetailsElement[];

        expect(folds.map(f => f.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['expand_more Services 2', 'expand_more Details']);
        expect(folds.every(f => !f.open)).toBeTrue();
        expect(folds[0].textContent).toContain('Energy readings');
        expect(folds[1].textContent).toContain('urn:device:1');
        expect(fixture.nativeElement.querySelectorAll('details.fold button.copy').length).toBeGreaterThan(0);
    });

    it('names the service only on tiles whose field name another service also has', () => {
        const elements = [
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'state' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'state' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'level' },
        ];
        create({ elements, counts: [1, 2], values: [lastValues[2], lastValues[2], lastValues[0]] });

        expect(component.tiles.map(t => [t.field, t.serviceName, t.showService])).toEqual([
            ['state', 'Energy', true], ['state', 'Status', true], ['level', 'Status', false],
        ]);
        expect(Array.from(fixture.nativeElement.querySelectorAll('.tile-service')).map(e => (e as HTMLElement).textContent)).toEqual(['Energy', 'Status']);
    });

    it('says in one line which services have no values, and does not list them as tiles', () => {
        create({ elements: lastValueElements.slice(0, 2), counts: [2, 0], values: lastValues.slice(0, 2) });

        expect(fixture.nativeElement.querySelector('.without-data').textContent).toContain('No values from Status');
        expect(fixture.nativeElement.querySelectorAll('.tile').length).toBe(2);
    });

    it('shows the unit only where the characteristic gives one', () => {
        create();

        expect(component.tiles.map(t => t.unit)).toEqual(['kWh', '', '']);
    });

    it('shows one line instead of an empty grid for a device without data', () => {
        create({ elements: [], counts: [0, 0], values: [] });

        expect(fixture.nativeElement.querySelector('.tiles')).toBeNull();
        expect(fixture.nativeElement.querySelector('.values-block').textContent).toContain('No service of this device provides values.');
    });

    it('marks offline, inactive and unknown devices with the chip classes of the device list', () => {
        create();
        const chip = () => fixture.nativeElement.querySelector('senergy-dialog-header .status-chip') as HTMLElement;
        const classes = () => ['online', 'failed', 'hollow', 'muted'].filter(c => chip().classList.contains(c));

        expect(classes()).toEqual(['online']);
        component.device.connection_state = 'offline';
        fixture.detectChanges();
        expect([chip().textContent, classes()]).toEqual(['Offline', ['failed']]);
        component.device.connection_state = '';
        fixture.detectChanges();
        expect([chip().textContent, classes()]).toEqual(['Unknown', ['muted']]);
        component.device.attributes = [{ key: 'inactive', value: 'true', origin: 'web-ui' }];
        fixture.detectChanges();
        expect([chip().textContent, classes()]).toEqual(['Inactive', ['hollow', 'muted']]);
    });

    it('opens the download options of one service inline without a request, and only one at a time', () => {
        create();
        const requests = () => exportData.getLastValuesTimescale.calls.count() + exportData.getTimescaleDataAvailability.calls.count()
            + instances.getDeviceHistoryV2.calls.count() + fetchSpy.calls.count();
        const before = requests();

        component.toggleDownload(0);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.download').length).toBe(1);
        component.toggleDownload(1);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.download').length).toBe(1);
        component.toggleDownload(1);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.download').length).toBe(0);
        expect(requests()).toBe(before);
    });

    it('sends raw data without a group type or time when the raw format is chosen', async () => {
        create();
        component.timeControl.get('from')?.setValue(new Date('2026-03-01T00:00:00Z'));
        component.timeControl.get('to')?.setValue(new Date('2026-03-01T00:00:00Z'));

        await component.download(new Event('click'), 1);

        const body = JSON.parse((fetchSpy.calls.mostRecent().args[1] as RequestInit).body as string);
        expect(body.serviceId).toBe('urn:service:b');
        expect(body.columns).toEqual([{ name: 'state' }]);
        expect(body.groupTime).toBeUndefined();
    });
});
