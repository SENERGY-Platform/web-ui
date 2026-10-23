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
import { DeviceInstancesServiceDialogComponent, formatValue, ValueMeta } from './device-instances-service-dialog.component';

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

    const meta = (hasAspect: boolean, aspectName = '', characteristicName = '', functionName = '', isTimestamp = false): ValueMeta =>
        ({ hasAspect, aspectName, characteristicName, functionName, isTimestamp });
    const defaultMeta = [[meta(true, 'Energy', 'kWh'), meta(false)], [meta(false)]];

    function create(options: { history?: boolean; canEdit?: boolean; elements?: typeof lastValueElements; counts?: number[]; values?: typeof lastValues; meta?: ValueMeta[][]; descriptions?: string[][]; developer?: boolean } = {}) {
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
        authorization.userIsDeveloper.and.returnValue(options.developer ?? true);
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
                        descriptions: options.descriptions ?? [['total', 'power'], ['state']],
                        units: [['kWh', ''], ['']],
                        valueMeta: options.meta ?? defaultMeta,
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
        expect(tiles.length).toBe(1);
        expect(tiles[0]).toContain('Energy');
        expect(tiles[0]).toContain('12.5 kWh');
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

    const rowTexts = () => Array.from(fixture.nativeElement.querySelectorAll('.services-fold tbody tr:not(.group-label)'))
        .map(r => Array.from((r as HTMLElement).querySelectorAll('td')).map(td => td.textContent?.trim()).join(' '));

    it('puts only values with an aspect on the tiles, and keeps every value with data in the services table', () => {
        create();
        const rows = rowTexts();

        expect(component.tiles.map(t => t.path)).toEqual(['value.total']);
        expect(fixture.nativeElement.querySelectorAll('.tile').length).toBe(1);
        expect(rows).toEqual(['Energy 12.5 kWh', 'state ok']);
    });

    it('labels a tile with the aspect name, else the characteristic name, else the last path segment', () => {
        const elements = [
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.temp' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.hum' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'm.co2' },
        ];
        create({ elements, counts: [2, 1], values: lastValues, meta: [[meta(true, 'Temperature', 'degC'), meta(true, '', 'Humidity')], [meta(true)]] });

        expect(component.tiles.map(t => t.label)).toEqual(['Temperature', 'Humidity', 'co2']);
    });

    it('adds the last path segment to equal labels, and the service where they still match', () => {
        const elements = [
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'x.in' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'x.out' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'y.out' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:b', columnName: 'level' },
        ];
        create({ elements, counts: [2, 2], values: [lastValues[0], lastValues[0], lastValues[0], lastValues[0]],
            meta: [[meta(true, 'Power'), meta(true, 'Power')], [meta(true, 'Power'), meta(true, 'Level')]] });

        expect(component.tiles.map(t => [t.label, t.showService])).toEqual([
            ['Power (in)', false], ['Power (out)', true], ['Power (out)', true], ['Level', false],
        ]);
        expect(Array.from(fixture.nativeElement.querySelectorAll('.tile-service')).map(e => (e as HTMLElement).textContent)).toEqual(['Energy', 'Status']);
    });

    const airLike = () => create({
        elements: [
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.temperature' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.pm10' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.pm1' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.timestamp' },
        ],
        counts: [4, 0],
        values: [
            { time: '2026-03-01T10:00:00Z', value: 21.108 }, { time: '2026-03-01T10:00:00Z', value: 0.160637 },
            { time: '2026-03-01T10:00:00Z', value: 1179 }, { time: '2026-03-01T10:00:00Z', value: 1772359200000 },
        ] as never,
        meta: [[
            meta(true, 'Air', 'Degree Celsius', 'Temperature'), meta(true, 'Air', 'ug/m3', 'Particle Concentration'),
            meta(true, 'Air', 'ug/m3', 'Particle Concentration'), meta(true, 'Air', 'Timestamp (Unix Milliseconds)', 'Timestamp', true),
        ], []],
    });

    it('labels a tile with its function before the aspect, so one shared aspect does not name every tile', () => {
        airLike();

        expect(component.tiles.map(t => t.label)).toEqual(['Temperature', 'Particle Concentration (pm10)', 'Particle Concentration (pm1)']);
    });

    it('tells equal function labels apart by their aspect when the aspects differ', () => {
        const elements = [
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'in.t' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'out.t' },
        ];
        create({ elements, counts: [2, 0], values: lastValues.slice(0, 2), meta: [[meta(true, 'Inside', '', 'Temperature'), meta(true, 'Outside', '', 'Temperature')], []] });

        expect(component.tiles.map(t => t.label)).toEqual(['Temperature (Inside)', 'Temperature (Outside)']);
    });

    it('leaves timestamps off the tiles but lists them in the services table', () => {
        airLike();

        expect(component.tiles.map(t => t.path)).not.toContain('m.timestamp');
        expect(component.serviceTables[0].otherRows.map(r => r.path)).toEqual(['m.timestamp']);
    });

    it('shows a time all tiles share once above the grid instead of on every tile', () => {
        airLike();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('.values-block h3')?.textContent).toContain('01.03.2026');
        expect(el.querySelectorAll('.tile-time').length).toBe(0);
    });

    it('keeps the time on each tile when the tiles do not share one', () => {
        create({ meta: [[meta(true, 'Energy'), meta(true, 'Power')], [meta(true, 'State')]] });

        expect(component.tilesTime).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('.tile-time').length).toBe(3);
    });

    it('rounds values on the tiles and keeps the raw value in the services table', () => {
        airLike();
        const tileValues = Array.from(fixture.nativeElement.querySelectorAll('.tile-value')).map(e => (e as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());

        expect(tileValues.map(v => v?.split(' ')[0])).toEqual(['21.11', '0.161', '1179']);
        expect(rowTexts()[0]).toContain('21.108');
    });

    it('formats numbers with a fraction and leaves everything else as it is', () => {
        expect([21.108, 0.160637, 1179, -3.14159, 'ok', true].map(v => formatValue(v as never))).toEqual(['21.11', '0.161', '1179', '-3.14', 'ok', 'true']);
    });

    it('keeps the path and the service name on a tile for its tooltip', () => {
        create();

        expect(component.tiles[0].path).toBe('value.total');
        expect(component.tiles[0].serviceName).toBe('Energy');
    });

    it('shows no value area and opens the services first for a device without any aspect value', () => {
        create({ meta: [[meta(false), meta(false)], [meta(false)]] });
        const content = fixture.nativeElement.querySelector('mat-dialog-content') as HTMLElement;
        const first = content.firstElementChild as HTMLDetailsElement;

        expect(fixture.nativeElement.querySelector('.values-block')).toBeNull();
        expect(fixture.nativeElement.querySelector('.tiles')).toBeNull();
        expect(first.classList.contains('services-fold')).toBeTrue();
        expect(first.open).toBeTrue();
        expect(first.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('keeps the services section collapsed below the tiles when there are aspect values', () => {
        create();
        const fold = fixture.nativeElement.querySelector('.services-fold') as HTMLDetailsElement;

        expect(fold.open).toBeFalse();
        expect(fixture.nativeElement.querySelector('mat-dialog-content').firstElementChild.classList.contains('values-block')).toBeTrue();
    });

    const airElements = [
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.temp_err' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.temperature' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.uptime' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.co2' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.dead' },
        { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'm.dead_aspect' },
    ];
    const airValues = [lastValues[0], lastValues[0], lastValues[0], lastValues[0], { time: null, value: null }, { time: null, value: null }];
    const airMeta = [[meta(false), meta(true, 'Temperature'), meta(false), meta(true, '', 'CO2'), meta(false), meta(true, 'Dust')]];
    const createAir = () => create({ elements: airElements, counts: [6, 0], values: airValues as never, meta: airMeta });
    const expandOthers = () => {
        (fixture.nativeElement.querySelector('.group-toggle') as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    it('folds the other fields under the aspect rows until asked for', () => {
        createAir();

        expect(rowTexts()).toEqual(['Temperature 12.5', 'CO2 12.5']);
        expect((fixture.nativeElement.querySelector('.group-toggle') as HTMLElement).textContent?.replace(/\s+/g, ' ').trim()).toBe('expand_more Other fields 2');
        expect(fixture.nativeElement.querySelector('.show-empty')).toBeNull();

        expandOthers();
        expect(rowTexts()).toEqual(['Temperature 12.5', 'CO2 12.5', 'temp_err 12.5 kWh', 'uptime 12.5']);
    });

    it('shows the fields of a service without aspect rows directly', () => {
        create({ meta: [[meta(false), meta(false)], [meta(false)]] });

        expect(fixture.nativeElement.querySelector('.group-toggle')).toBeNull();
        expect(rowTexts()).toEqual(['total 12.5 kWh', 'state ok']);
    });

    it('lists fields with an aspect first, labelled like the tiles, then the others by path without the shared prefix, in path order', () => {
        createAir();
        expandOthers();

        expect(rowTexts()).toEqual(['Temperature 12.5', 'CO2 12.5', 'temp_err 12.5 kWh', 'uptime 12.5']);
        expect(component.serviceTables[0].aspectRows.map(r => r.path)).toEqual(['m.temperature', 'm.co2']);
    });

    it('heads the rest with Other fields only when there are aspect rows above it', () => {
        createAir();
        const dividers = () => fixture.nativeElement.querySelectorAll('.services-fold tr.group-label').length;

        expect(dividers()).toBe(1);
        expect((fixture.nativeElement.querySelector('.services-fold tbody.others tr.group-label') as HTMLElement).textContent).toContain('Other fields');

        TestBed.resetTestingModule();
        create({ meta: [[meta(true, 'Energy'), meta(false)], [meta(false)]], elements: lastValueElements.slice(0, 1), counts: [1, 0], values: lastValues.slice(0, 1) });
        expect(dividers()).toBe(0);
    });

    it('hides fields without a value by default, offers how many, and shows them muted at the bottom on request', () => {
        createAir();
        expandOthers();
        const button = () => fixture.nativeElement.querySelector('.show-empty') as HTMLButtonElement;

        expect(button().textContent?.trim()).toBe('Show 2 empty fields');
        expect(component.hideEmpty).toBeTrue();
        expect(rowTexts().length).toBe(4);

        button().click();
        fixture.detectChanges();
        expect(rowTexts().slice(4)).toEqual(['Dust N/A', 'dead N/A']);
        expect(fixture.nativeElement.querySelectorAll('.services-fold tr.empty').length).toBe(2);
        expect(button().textContent?.trim()).toBe('Hide empty fields');
    });

    it('offers the service ID and the download as labelled buttons in the service header', () => {
        create();
        const actions = Array.from(fixture.nativeElement.querySelectorAll('.services-fold .service')[0].querySelectorAll('.service-actions button'))
            .map(b => (b as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());

        expect(actions).toEqual(['content_copy Copy ID', 'download Download']);
    });

    it('shows one No values line instead of an empty table for a service with only empty fields', () => {
        create({ elements: lastValueElements, counts: [2, 1], values: [lastValues[1], lastValues[1], lastValues[0]], meta: defaultMeta });
        const serviceEls = fixture.nativeElement.querySelectorAll('.services-fold .service') as NodeListOf<HTMLElement>;

        expect(serviceEls[0].querySelector('table')).toBeNull();
        expect(serviceEls[0].textContent).toContain('No values');
        expect(serviceEls[1].querySelector('table')).not.toBeNull();
    });

    it('has only a field and a value column and no description', () => {
        create();

        expect(fixture.nativeElement.querySelector('.services-fold th')).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('.services-fold tbody tr')[0].querySelectorAll('td').length).toBe(2);
        expect(fixture.nativeElement.querySelector('.services-fold').textContent).not.toContain('Description');
    });

    it('shows the newest time of a service once in its header', () => {
        create();

        expect(component.serviceTables[0].time).toBe('2026-03-01T10:00:00Z');
        expect(component.serviceTables[1].time).toBe('2026-03-01T09:00:00Z');
        expect(fixture.nativeElement.querySelector('.service-title').textContent).toContain('01.03.2026');
    });

    it('keeps the full path as the tooltip source of a row', () => {
        createAir();

        expect(component.serviceTables[0].otherRows[0].path).toBe('m.temp_err');
    });

    it('says in the service that it has no values, without a table', () => {
        create({ elements: lastValueElements.slice(0, 2), counts: [2, 0], values: lastValues.slice(0, 2) });
        const serviceEls = fixture.nativeElement.querySelectorAll('.services-fold .service') as NodeListOf<HTMLElement>;

        expect(serviceEls[1].textContent).toContain('No values');
        expect(serviceEls[1].querySelector('table')).toBeNull();
    });

    const detailsFacts = () => Array.from(fixture.nativeElement.querySelectorAll('details.fold')[1].querySelectorAll('.fact')) as HTMLElement[];

    it('copies the value of each Details row for a developer, and the rows are the same six', async () => {
        const write = jasmine.createSpy('writeText').and.resolveTo();
        spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: write } as unknown as Clipboard);
        create();
        const copied: Record<string, string> = {};
        for (const fact of detailsFacts()) {
            (fact.querySelector('button.copy') as HTMLButtonElement).click();
            copied[fact.querySelector('dt')?.textContent?.trim() ?? ''] = write.calls.mostRecent().args[0];
        }

        expect(copied).toEqual({
            'Device type': 'Smart meter', 'Local ID': 'local-1', 'Device ID': 'urn:device:1',
            'Short ID': 'short', 'Device type ID': 'dt1', 'Origin name': 'meter',
        });
    });

    it('lists the Details rows in a fixed order, ids on one line with the value as tooltip source', () => {
        create();
        const facts = detailsFacts();

        expect(facts.map(f => f.querySelector('dt')?.textContent?.trim())).toEqual(['Origin name', 'Device type', 'Local ID', 'Short ID', 'Device ID', 'Device type ID']);
        expect(facts.map(f => f.querySelector('.fact-value')?.classList.contains('mono'))).toEqual([false, false, true, true, true, true]);
        expect(facts[4].querySelector('.fact-value')?.textContent).toBe('urn:device:1');
    });

    it('lists the Details rows for everyone but offers the copy buttons only to a developer', () => {
        create({ developer: false });

        expect(detailsFacts().length).toBe(6);
        expect(fixture.nativeElement.querySelectorAll('details.fold button.copy').length).toBe(0);
    });

    it('shows the unit only where the characteristic gives one', () => {
        create({ meta: [[meta(true), meta(true)], [meta(true)]] });

        expect(component.tiles.map(t => t.unit)).toEqual(['kWh', '', '']);
    });

    it('shows no value area and no table for a device without data, with the services listed first', () => {
        create({ elements: [], counts: [0, 0], values: [], meta: [[], []] });

        expect(fixture.nativeElement.querySelector('.tiles')).toBeNull();
        expect(fixture.nativeElement.querySelector('.values-block')).toBeNull();
        expect(fixture.nativeElement.querySelector('mat-dialog-content').firstElementChild.classList.contains('services-fold')).toBeTrue();
        expect(fixture.nativeElement.querySelector('.services-fold table')).toBeNull();
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
