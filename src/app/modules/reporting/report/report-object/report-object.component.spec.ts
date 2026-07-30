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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { ReportObjectComponent } from './report-object.component';
import { ReportObjectModel } from '../../shared/reporting.model';
import { CoreModule } from '../../../../core/core.module';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceInstanceModel } from '../../../devices/device-instances/shared/device-instances.model';
import { ExportDataService } from '../../../../widgets/shared/export-data.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

const device = { id: 'd1', name: 'Device 1', display_name: 'Device 1', device_type_id: 'dt1' } as DeviceInstanceModel;

const deviceType = {
    id: 'dt1',
    name: 'Device Type 1',
    services: [
        {
            id: 's1',
            name: 'Service 1',
            outputs: [{
                content_variable: {
                    name: 'root',
                    type: 'https://schema.org/StructuredValue',
                    sub_content_variables: [
                        { name: 'value', type: 'https://schema.org/Float' },
                        { name: 'time', type: 'https://schema.org/Text' },
                    ]
                }
            }]
        },
        {
            id: 's2',
            name: 'Service 2',
            outputs: [{
                content_variable: {
                    name: 'root',
                    type: 'https://schema.org/StructuredValue',
                    sub_content_variables: [
                        { name: 'other', type: 'https://schema.org/Float' },
                    ]
                }
            }]
        },
    ]
} as unknown as DeviceTypeModel;

class MockDeviceTypeService {
    getDeviceType(_id: string): Observable<DeviceTypeModel | null> {
        return of(deviceType);
    }
}

class MockExportDataService {
    response: any[] = [{ data: [[[1, 'a'], [2, 'b'], [3, 'c']]] }];
    queries: any[] = [];

    queryTimescaleV2(query: any[]): Observable<any> {
        this.queries.push(query);
        return of(this.response);
    }
}

const queryObject = (): ReportObjectModel => ({
    name: 'value',
    valueType: 'float64',
    value: undefined,
    fields: undefined,
    children: undefined,
    length: undefined,
    query: {
        columns: [{ name: 'root.value', groupType: undefined }],
        time: { start: '2020-01-15T10:00:00.000Z', end: '2020-01-20T10:00:00.000Z' },
        deviceId: 'd1',
        serviceId: 's1',
        groupTime: '30months',
    },
    queryOptions: {
        rollingStartDate: undefined,
        rollingEndDate: undefined,
        startOffset: undefined,
        endOffset: undefined,
        resultObject: undefined,
        resultKey: undefined,
    },
});

describe('ReportObjectComponent', () => {
    let component: ReportObjectComponent;
    let fixture: ComponentFixture<ReportObjectComponent>;
    let exportDataService: MockExportDataService;
    let errorHandlerService: ErrorHandlerService;
    let dialog: MatDialog;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportObjectComponent],
            imports: [
                CommonModule,
                CoreModule,
                FormsModule,
                NoopAnimationsModule,
                MatIconModule,
                MatDialogModule,
                MatSnackBarModule,
            ],
            providers: [
                { provide: DeviceTypeService, useClass: MockDeviceTypeService },
                { provide: ExportDataService, useClass: MockExportDataService },
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ReportObjectComponent);
        component = fixture.componentInstance;
        exportDataService = TestBed.inject(ExportDataService) as unknown as MockExportDataService;
        errorHandlerService = TestBed.inject(ErrorHandlerService);
        dialog = TestBed.inject(MatDialog);
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should detect the query input type and split the time values', () => {
        component.data = queryObject();
        component.data.query!.time!.last = '7d';

        component.ngOnInit();

        expect(component.inputType).toBe('query');
        expect(component.groupingTime).toEqual({ number: '30', unit: 'months' });
        expect(component.timeframe).toEqual({ number: '7', unit: 'd' });
    });

    it('should not fail on time values without a number', () => {
        component.data = queryObject();
        component.data.query!.groupTime = 'months';

        component.ngOnInit();

        expect(component.groupingTime).toEqual({ number: '', unit: '' });
    });

    it('should add missing query defaults', () => {
        component.data = queryObject();
        component.data.query!.columns = [];
        component.data.queryOptions = undefined;

        component.ngOnInit();

        expect(component.data.query!.columns.length).toBe(1);
        expect(component.data.queryOptions).toBeDefined();
    });

    it('should keep the stored query untouched when previewing rolling dates', () => {
        component.data = queryObject();
        component.data.queryOptions!.rollingStartDate = 'month';
        component.data.queryOptions!.rollingEndDate = 'year';
        component.ngOnInit();
        spyOn(dialog, 'open');

        component.previewQuery();

        expect(component.data.query!.time!.start).toBe('2020-01-15T10:00:00.000Z');
        expect(component.data.query!.time!.end).toBe('2020-01-20T10:00:00.000Z');

        const sent = exportDataService.queries[0][0];
        expect(new Date(sent.time.start).getMonth()).toBe(new Date().getMonth());
        expect(new Date(sent.time.end).getFullYear()).toBe(new Date().getFullYear());
    });

    it('should send the dates unchanged without a rolling configuration', () => {
        component.data = queryObject();
        component.ngOnInit();
        spyOn(dialog, 'open');

        component.previewQuery();

        const sent = exportDataService.queries[0][0];
        expect(sent.time.start).toBe('2020-01-15T10:00:00.000Z');
        expect(sent.time.end).toBe('2020-01-20T10:00:00.000Z');
    });

    it('should group the preview result by column', () => {
        component.data = queryObject();
        component.ngOnInit();
        const open = spyOn(dialog, 'open');

        component.previewQuery();

        expect(open).toHaveBeenCalled();
        const config = open.calls.mostRecent().args[1] as any;
        expect(config.data.dataCount).toBe(3);
        expect(config.data.jsonData).toEqual({ 'Key 0': [1, 2, 3], 'Key 1': ['a', 'b', 'c'] });
        expect(component.previewRunning).toBe(false);
    });

    it('should show an error instead of an empty preview dialog', () => {
        component.data = queryObject();
        component.ngOnInit();
        exportDataService.response = [{ data: [[]] }];
        const open = spyOn(dialog, 'open');
        const error = spyOn(errorHandlerService, 'showErrorInSnackBar');

        component.previewQuery();

        expect(open).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalled();
        expect(component.previewRunning).toBe(false);
    });

    it('should restore device and service of a stored query without clearing the path', () => {
        component.data = queryObject();
        component.ngOnInit();
        component.allDevices = [device];

        component.ngOnChanges({ allDevices: new SimpleChange([], [device], true) });

        expect(component.queryDevice).toBe(device);
        expect(component.queryService.id).toBe('s1');
        expect(component.queryServicePaths).toEqual(['root.value', 'root.time']);
        expect(component.data.query!.columns[0].name).toBe('root.value');
    });

    it('should reset service and path when another device is selected', () => {
        component.data = queryObject();
        component.ngOnInit();

        component.queryDeviceChanged({ ...device, id: 'd2' } as DeviceInstanceModel).subscribe();

        expect(component.data.query!.deviceId).toBe('d2');
        expect(component.data.query!.serviceId).toBe('');
        expect(component.data.query!.columns[0].name).toBeUndefined();
    });

    it('should drop a path that the new service does not provide', () => {
        component.data = queryObject();
        component.ngOnInit();

        component.queryServiceChanged(deviceType.services[1]);

        expect(component.data.query!.serviceId).toBe('s2');
        expect(component.queryServicePaths).toEqual(['root.other']);
        expect(component.data.query!.columns[0].name).toBeUndefined();
    });

    it('should keep a path that the new service provides as well', () => {
        component.data = queryObject();
        component.ngOnInit();

        component.queryServiceChanged(deviceType.services[0]);

        expect(component.data.query!.columns[0].name).toBe('root.value');
    });

    it('should keep the query configuration when switching the input type', () => {
        component.data = queryObject();
        component.ngOnInit();
        const query = component.data.query;

        component.inputType = 'devices';
        component.changeInputType();
        expect(component.data.query).toBeUndefined();
        expect(component.data.deviceQuery).toBeDefined();

        component.inputType = 'query';
        component.changeInputType();
        expect(component.data.query).toBe(query);
        expect(component.data.deviceQuery).toBeUndefined();
    });

    it('should copy an array item deeply and count the children', () => {
        component.data = {
            name: 'list', valueType: 'array', length: 1, value: undefined, fields: undefined,
            children: { '0': { name: 'item', valueType: 'string', value: 'a' } as ReportObjectModel },
        } as ReportObjectModel;

        component.addItem('0');

        expect(Object.keys(component.data.children!)).toEqual(['0', '1']);
        expect(component.data.length).toBe(2);
        expect(component.data.children!['1']).not.toBe(component.data.children!['0']);
        expect(component.data.children!['1'].value).toBe('a');
    });

    it('should remove an array item and count the children', () => {
        component.data = {
            name: 'list', valueType: 'array', length: 2, value: undefined, fields: undefined,
            children: {
                '0': { name: 'item', valueType: 'string' } as ReportObjectModel,
                '1': { name: 'item', valueType: 'string' } as ReportObjectModel,
            },
        } as ReportObjectModel;

        component.removeItem('0');

        expect(Object.keys(component.data.children!)).toEqual(['1']);
        expect(component.data.length).toBe(1);
    });

    it('should remember new values of the device query without duplicates', () => {
        component.data = { name: 'x', valueType: 'string', deviceQuery: { last: '90d' } } as ReportObjectModel;

        component.ngOnInit();
        expect(component.inputType).toBe('devices');
        expect(component.deviceQueryLastValues).toContain('90d');

        component.addDeviceQueryLastValue()('90d');
        expect(component.deviceQueryLastValues.filter((v: string) => v === '90d').length).toBe(1);

        expect(component.addDeviceQueryLastValue()('180d')).toBe('180d');
        expect(component.deviceQueryLastValues).toContain('180d');
    });
});
