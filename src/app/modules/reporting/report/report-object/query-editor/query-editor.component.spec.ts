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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { Observable, of } from 'rxjs';

import { QueryEditorComponent } from './query-editor.component';
import { CoreModule } from '../../../../../core/core.module';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ErrorHandlerService } from '../../../../../core/services/error-handler.service';
import { ExportDataService } from '../../../../../widgets/shared/export-data.service';
import { ReportObjectModel } from '../../../shared/reporting.model';
import { DynamicFormGroup, buildQueryForm } from '../../../shared/report-object-form';

const device = { id: 'd1', name: 'Device 1', display_name: 'Device 1', device_type_id: 'dt1' } as DeviceInstanceModel;
const otherDevice = { id: 'd2', name: 'Device 2', display_name: 'Device 2', device_type_id: 'dt2' } as DeviceInstanceModel;

const deviceType = {
    id: 'dt1',
    name: 'Device Type 1',
    services: [
        {
            id: 's1', name: 'Service 1',
            outputs: [{
                content_variable: {
                    name: 'root', type: 'https://schema.org/StructuredValue',
                    sub_content_variables: [
                        { name: 'value', type: 'https://schema.org/Float' },
                        { name: 'time', type: 'https://schema.org/Text' },
                    ]
                }
            }]
        },
        {
            id: 's2', name: 'Service 2',
            outputs: [{
                content_variable: {
                    name: 'root', type: 'https://schema.org/StructuredValue',
                    sub_content_variables: [{ name: 'other', type: 'https://schema.org/Float' }]
                }
            }]
        },
    ]
} as unknown as DeviceTypeModel;

class MockDeviceTypeService {
    requested: string[] = [];

    getDeviceType(id: string): Observable<DeviceTypeModel | null> {
        this.requested.push(id);
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

const queryFormOf = (query: any, options: any = {}): DynamicFormGroup =>
    buildQueryForm({ query, queryOptions: options } as ReportObjectModel);

describe('QueryEditorComponent', () => {
    let component: QueryEditorComponent;
    let fixture: ComponentFixture<QueryEditorComponent>;
    let exportDataService: MockExportDataService;
    let errorHandlerService: ErrorHandlerService;
    let dialog: MatDialog;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [QueryEditorComponent],
            imports: [
                CommonModule,
                CoreModule,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                MatDatepickerModule,
                MatNativeDateModule,
                MatTooltipModule,
                MatDialogModule,
                MatSnackBarModule,
                MtxSelectModule,
            ],
            providers: [
                { provide: DeviceTypeService, useClass: MockDeviceTypeService },
                { provide: ExportDataService, useClass: MockExportDataService },
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(QueryEditorComponent);
        component = fixture.componentInstance;
        component.allDevices = [device, otherDevice];
        exportDataService = TestBed.inject(ExportDataService) as unknown as MockExportDataService;
        errorHandlerService = TestBed.inject(ErrorHandlerService);
        dialog = TestBed.inject(MatDialog);
    }));

    it('should create', () => {
        component.form = queryFormOf({});
        expect(component).toBeTruthy();
    });

    it('should load the device type of the selected device and keep the path', () => {
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });

        component.ngOnInit();

        expect(component.deviceType.services.length).toBe(2);
        expect(component.servicePaths).toEqual(['root.value', 'root.time']);
        expect(component.control('path').value).toBe('root.value');
    });

    it('should reset the service when another device is selected', () => {
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
        component.ngOnInit();

        component.control('device').setValue('d2');

        expect(component.control('service').value).toBeNull();
        expect(component.control('path').value).toBeNull();
        expect(component.servicePaths).toEqual([]);
    });

    it('should drop a path that the new service does not provide', () => {
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
        component.ngOnInit();

        component.control('service').setValue('s2');

        expect(component.servicePaths).toEqual(['root.other']);
        expect(component.control('path').value).toBeNull();
    });

    it('should not load a device type for an unknown device', () => {
        component.form = queryFormOf({ deviceId: 'unknown' });

        component.ngOnInit();

        expect(component.deviceType.services).toEqual([]);
        expect((TestBed.inject(DeviceTypeService) as unknown as MockDeviceTypeService).requested).toEqual([]);
    });

    it('should collapse the advanced fields while none of them is in use', () => {
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });

        component.ngOnInit();

        expect(component.advancedCount).toBe(0);
        expect(component.showAdvanced).toBe(false);
    });

    it('should stay collapsed but count the advanced fields that are in use', () => {
        component.form = queryFormOf(
            { deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }], groupTime: '1d', orderColumnIndex: 0 },
            { resultKey: 2 }
        );

        component.ngOnInit();

        expect(component.advancedCount).toBe(4);
        expect(component.showAdvanced).toBe(false);
    });

    it('should render the advanced fields only when they are shown', () => {
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[formcontrolname=resultKey]')).toBeNull();

        component.showAdvanced = true;
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[formcontrolname=resultKey]')).not.toBeNull();
    });

    it('should apply the rolling dates to the preview only', () => {
        component.form = queryFormOf(
            { deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }], time: { start: '2020-01-15T10:00:00.000Z', end: '2020-01-20T10:00:00.000Z' } },
            { rollingStartDate: 'month', rollingEndDate: 'year' }
        );
        component.ngOnInit();
        spyOn(dialog, 'open');

        component.previewQuery();

        expect(component.control('start').value).toBe('2020-01-15T10:00:00.000Z');
        const sent = exportDataService.queries[0][0];
        expect(new Date(sent.time.start).getMonth()).toBe(new Date().getMonth());
        expect(new Date(sent.time.end).getFullYear()).toBe(new Date().getFullYear());
    });

    it('should send the dates unchanged without a rolling configuration', () => {
        component.form = queryFormOf({ time: { start: '2020-01-15T10:00:00.000Z' } });
        component.ngOnInit();
        spyOn(dialog, 'open');

        component.previewQuery();

        expect(exportDataService.queries[0][0].time.start).toBe('2020-01-15T10:00:00.000Z');
    });

    it('should pass the rows to the preview dialog', () => {
        component.form = queryFormOf({});
        component.ngOnInit();
        const open = spyOn(dialog, 'open');

        component.previewQuery();

        const config = open.calls.mostRecent().args[1] as any;
        expect(config.data.rows).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
        expect(component.previewRunning).toBe(false);
    });

    it('should show an error instead of an empty preview dialog', () => {
        component.form = queryFormOf({});
        component.ngOnInit();
        exportDataService.response = [{ data: [[]] }];
        const open = spyOn(dialog, 'open');
        const error = spyOn(errorHandlerService, 'showErrorInSnackBar');

        component.previewQuery();

        expect(open).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalled();
        expect(component.previewRunning).toBe(false);
    });
});
