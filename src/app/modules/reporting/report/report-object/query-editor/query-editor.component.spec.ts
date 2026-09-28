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
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { Observable, Subject, of } from 'rxjs';

import { QueryEditorComponent, combineAggregatedRows, foldSingleAspectCriteria } from './query-editor.component';
import { CoreModule } from '../../../../../core/core.module';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeAspectNodeModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel, DeviceTypeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceGroupCriteriaModel, DeviceGroupDisplayModel } from '../../../../devices/device-groups/shared/device-groups.model';
import { DeviceGroupsService } from '../../../../devices/device-groups/shared/device-groups.service';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
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
    /** Answers for single device types; any other id gets deviceType right away. */
    responses = new Map<string, Observable<DeviceTypeModel | null>>();

    getDeviceType(id: string): Observable<DeviceTypeModel | null> {
        this.requested.push(id);
        return this.responses.get(id) ?? of(deviceType);
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

class MockFunctionsService {
    getFunctions(): Observable<{ result: DeviceTypeFunctionModel[]; total: number }> {
        return of({ result: [{ id: 'f1', name: 'getTemperature', display_name: 'Temperature' }] as DeviceTypeFunctionModel[], total: 1 });
    }
}

class MockDeviceGroupsService {
    getAspectListByIds(): Observable<DeviceTypeAspectNodeModel[]> {
        return of([]);
    }

    getDeviceClassListByIds(): Observable<DeviceTypeDeviceClassModel[]> {
        return of([]);
    }
}

const criterion1 = { function_id: 'f1', aspect_id: 'a0', device_class_id: '', interaction: 'event' };
const criterion2 = { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: 'event' };

const T1 = '2024-01-01T00:00:00.000Z';
const T2 = '2024-01-01T00:01:00.000Z';

const deviceGroup = {
    id: 'g1', name: 'Group 1', image: '', device_ids: [], criteria: [criterion1, criterion2],
} as DeviceGroupDisplayModel;

const queryFormOf = (query: any, options: any = {}, valueType = 'float64'): DynamicFormGroup =>
    buildQueryForm({ query, queryOptions: options, valueType } as ReportObjectModel);

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
                MatButtonToggleModule,
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
                { provide: FunctionsService, useClass: MockFunctionsService },
                { provide: DeviceGroupsService, useClass: MockDeviceGroupsService },
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(QueryEditorComponent);
        component = fixture.componentInstance;
        component.allDevices = [device, otherDevice];
        component.allDeviceGroups = [deviceGroup];
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

    const swapForm = (form: DynamicFormGroup) => {
        const previous = component.form;
        component.form = form;
        component.ngOnChanges({ form: new SimpleChange(previous, form, false) });
    };

    // The report object view keeps this component when another object is selected, e.g. a fresh copy.
    it('should follow the form that replaced the previous one', () => {
        const original = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
        const copy = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
        component.form = original;
        component.ngOnInit();
        swapForm(copy);

        copy.controls['device'].setValue('d2');
        expect(copy.controls['service'].value).toBeNull();
        expect(copy.controls['path'].value).toBeNull();

        copy.controls['service'].setValue('s2');
        original.controls['device'].setValue('d2');
        expect(copy.controls['service'].value).toBe('s2');
        expect(component.servicePaths).toEqual(['root.other']);
    });

    it('should not show the device type of the previous form once it arrives late', () => {
        const pending = new Subject<DeviceTypeModel | null>();
        (TestBed.inject(DeviceTypeService) as unknown as MockDeviceTypeService).responses.set('dt1', pending);
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1' });
        component.ngOnInit();
        swapForm(queryFormOf({ deviceId: 'unknown' }));

        pending.next(deviceType);

        expect(component.deviceType.services).toEqual([]);
        expect(component.servicePaths).toEqual([]);
    });

    it('should not show a device type requested by a device change of the previous form', () => {
        const pending = new Subject<DeviceTypeModel | null>();
        (TestBed.inject(DeviceTypeService) as unknown as MockDeviceTypeService).responses.set('dt2', pending);
        component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1' });
        component.ngOnInit();
        component.control('device').setValue('d2');
        swapForm(queryFormOf({ deviceId: 'unknown' }));

        pending.next(deviceType);

        expect(component.deviceType.services).toEqual([]);
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

    it('should prepend the device to every row of a per-device group preview', () => {
        component.form = queryFormOf(
            { deviceGroupId: 'g1', columns: [{ criteria: criterion1 }] },
            { deviceGroupMode: 'per_device' },
            'array'
        );
        component.ngOnInit();
        exportDataService.response = [
            { deviceId: 'd1', data: [[[1, 'a']]] },
            { deviceId: 'd2', data: [[[2, 'b'], [3, 'c']]] },
        ];
        const open = spyOn(dialog, 'open');

        component.previewQuery();

        const config = open.calls.mostRecent().args[1] as any;
        expect(config.data.rows).toEqual([
            ['Device 1', 1, 'a'],
            ['Device 2', 2, 'b'],
            ['Device 2', 3, 'c'],
        ]);
    });

    it('should combine the response into one series for an aggregate group preview', () => {
        component.form = queryFormOf(
            { deviceGroupId: 'g1', columns: [{ criteria: criterion1 }], groupTime: '1h' },
            { aggregation: 'sum' }
        );
        component.ngOnInit();
        exportDataService.response = [
            { deviceId: 'd1', data: [[[T1, 2], [T2, 3]]] },
            { deviceId: 'd2', data: [[[T1, 4], [T2, 5]]] },
        ];
        const open = spyOn(dialog, 'open');

        component.previewQuery();

        const config = open.calls.mostRecent().args[1] as any;
        expect(config.data.rows).toEqual([[T1, 6], [T2, 8]]);
    });

    describe('device group source', () => {
        it('should clear the device fields when switching to a device group', () => {
            component.form = queryFormOf({ deviceId: 'd1', serviceId: 's1', columns: [{ name: 'root.value' }] });
            component.ngOnInit();

            component.control('source').setValue('group');

            expect(component.control('device').value).toBeNull();
            expect(component.control('service').value).toBeNull();
            expect(component.control('path').value).toBeNull();
        });

        it('should clear the device group fields when switching to a device', () => {
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion1 }] });
            component.ngOnInit();

            component.control('source').setValue('device');

            expect(component.control('deviceGroupId').value).toBeNull();
            expect(component.control('criteria').value).toBeNull();
        });

        it('should restore the criteria list and selection of a loaded group query', () => {
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion2 }] });

            component.ngOnInit();

            expect(component.groupCriteria).toEqual([criterion1, criterion2]);
            expect(component.control('criteria').value).toEqual(criterion2);
        });

        // The report component loads the device groups asynchronously, possibly after the object was selected.
        it('should restore the criteria once the device groups arrive after the form', () => {
            component.allDeviceGroups = [];
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion2 }] });
            component.ngOnInit();
            expect(component.groupCriteria).toEqual([]);

            component.allDeviceGroups = [deviceGroup];
            component.ngOnChanges({ allDeviceGroups: new SimpleChange([], [deviceGroup], false) });

            expect(component.groupCriteria).toEqual([criterion1, criterion2]);
            expect(component.control('criteria').value).toEqual(criterion2);
        });

        it('should not count the hidden sorting index of a group aggregate as an advanced field in use', () => {
            component.form = queryFormOf(
                { deviceGroupId: 'g1', columns: [{ criteria: criterion2 }], orderColumnIndex: 1 },
                { deviceGroupMode: 'aggregate' }
            );
            component.ngOnInit();

            expect(component.orderColumnIndexHidden).toBe(true);
            expect(component.advancedCount).toBe(0);
        });

        describe('generated device groups', () => {
            const generatedGroup = {
                id: 'g-dev', name: 'Device 1', image: '', device_ids: ['d1'], criteria: [criterion2], auto_generated_by_device: 'd1',
            } as DeviceGroupDisplayModel;

            it('should hide groups generated for single devices by default', () => {
                component.allDeviceGroups = [deviceGroup, generatedGroup];
                component.form = queryFormOf({ source: 'group' });
                component.ngOnInit();

                expect(component.deviceGroupOptions.map(g => g.id)).toEqual(['g1']);
            });

            it('should list them once asked for, and hide them again', () => {
                component.allDeviceGroups = [deviceGroup, generatedGroup];
                component.form = queryFormOf({});
                component.ngOnInit();

                component.setShowGeneratedGroups(true);
                expect(component.deviceGroupOptions.map(g => g.id)).toEqual(['g1', 'g-dev']);

                component.setShowGeneratedGroups(false);
                expect(component.deviceGroupOptions.map(g => g.id)).toEqual(['g1']);
            });

            // A saved report may use a generated group; hiding it would make the select look empty.
            it('should keep a selected generated group listed', () => {
                component.allDeviceGroups = [deviceGroup, generatedGroup];
                component.form = queryFormOf({ deviceGroupId: 'g-dev', columns: [{ criteria: criterion2 }] });
                component.ngOnInit();

                expect(component.deviceGroupOptions.map(g => g.id)).toEqual(['g1', 'g-dev']);
            });

            it('should filter groups that arrive after the form', () => {
                component.allDeviceGroups = [];
                component.form = queryFormOf({});
                component.ngOnInit();

                component.allDeviceGroups = [deviceGroup, generatedGroup];
                component.ngOnChanges({ allDeviceGroups: new SimpleChange([], component.allDeviceGroups, false) });

                expect(component.deviceGroupOptions.map(g => g.id)).toEqual(['g1']);
            });
        });

        it('should reset the criteria when the device group changes', () => {
            const otherGroup =
                { id: 'g2', name: 'Group 2', image: '', device_ids: [], criteria: [] } as DeviceGroupDisplayModel;
            component.allDeviceGroups = [deviceGroup, otherGroup];
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion2 }] });
            component.ngOnInit();

            component.control('deviceGroupId').setValue('g2');

            expect(component.groupCriteria).toEqual([]);
            expect(component.control('criteria').value).toBeNull();
        });

        it('should offer the per-device mode only for array objects', () => {
            component.form = queryFormOf({}, {}, 'array');
            component.valueType = 'array';
            expect(component.supportsPerDevice).toBe(true);

            component.form = queryFormOf({}, {}, 'float64');
            component.valueType = 'float64';
            expect(component.supportsPerDevice).toBe(false);
            expect(component.control('deviceGroupMode').value).toBe('aggregate');
        });

        it('should expand the advanced section when an aggregate query has neither a grouping time nor a limit of 1', () => {
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion2 }] });

            component.ngOnInit();

            expect(component.form.errors?.['aggregateGrouping']).toBeDefined();
            expect(component.showAdvanced).toBe(true);
        });

        it('should not expand the advanced section once a grouping time or a limit of 1 makes the query valid', () => {
            component.form = queryFormOf({ deviceGroupId: 'g1', columns: [{ criteria: criterion2 }], limit: 1 });

            component.ngOnInit();

            expect(component.form.errors?.['aggregateGrouping']).toBeUndefined();
            expect(component.showAdvanced).toBe(false);
        });
    });
});

describe('foldSingleAspectCriteria', () => {
    it('should skip criteria with more than one aspect and fold a lone aspect into aspect_id', () => {
        const criteria = [
            // aspect_id not set yet, exactly one aspect_ids entry -> folded
            { function_id: 'f1', aspect_id: '', aspect_ids: ['a1'], device_class_id: '', interaction: 'event' },
            // several aspects -> the reporting-service cannot act on this, so it is skipped entirely
            { function_id: 'f2', aspect_id: 'a2', aspect_ids: ['a2', 'a3'], device_class_id: '', interaction: 'event' },
            { function_id: 'f3', aspect_id: '', aspect_ids: ['a4', 'a5'], device_class_id: '', interaction: 'event' },
            // no aspect_ids at all (older group) -> kept unchanged
            { function_id: 'f4', aspect_id: 'a6', device_class_id: '', interaction: 'event' },
        ] as unknown as DeviceGroupCriteriaModel[];

        const result = foldSingleAspectCriteria(criteria);

        expect(result).toEqual([
            { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: 'event' },
            { function_id: 'f4', aspect_id: 'a6', device_class_id: '', interaction: 'event' },
        ]);
    });

    // DeviceGroupFilterCriteriaValid in the timescale-wrapper requires an aspect, so such a report could never run.
    it('should skip criteria without any aspect', () => {
        const criteria = [
            { function_id: 'f1', aspect_id: '', device_class_id: 'dc1', interaction: 'request' },
            { function_id: 'f2', aspect_id: '', aspect_ids: [], device_class_id: '', interaction: 'event' },
        ] as unknown as DeviceGroupCriteriaModel[];

        expect(foldSingleAspectCriteria(criteria)).toEqual([]);
    });

    it('should offer criteria that fold into the same one only once', () => {
        const criteria = [
            { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: 'event' },
            { function_id: 'f1', aspect_id: '', aspect_ids: ['a1'], device_class_id: '', interaction: 'event' },
        ] as unknown as DeviceGroupCriteriaModel[];

        expect(foldSingleAspectCriteria(criteria)).toEqual([
            { function_id: 'f1', aspect_id: 'a1', device_class_id: '', interaction: 'event' },
        ]);
    });
});

describe('combineAggregatedRows', () => {
    it('should sum the values of every element by timestamp', () => {
        const elementRows = [[[T1, 2], [T2, 3]], [[T1, 4], [T2, 5]]];

        expect(combineAggregatedRows(elementRows, 'sum', true, undefined, undefined))
            .toEqual([[T1, 6], [T2, 8]]);
    });

    it('should average the values of every element by timestamp', () => {
        const elementRows = [[[T1, 2], [T2, 3]], [[T1, 4], [T2, 5]]];

        expect(combineAggregatedRows(elementRows, 'mean', true, undefined, undefined))
            .toEqual([[T1, 3], [T2, 4]]);
    });

    it('should union rows from all elements regardless of their input order', () => {
        // device A reports T2 before T1, device B only has T1 - the union still comes out sorted by time
        const elementRows = [[[T2, 1], [T1, 2]], [[T1, 3]]];

        expect(combineAggregatedRows(elementRows, 'sum', true, undefined, undefined))
            .toEqual([[T1, 5], [T2, 1]]);
    });

    it('should sort descending when orderDirection is desc', () => {
        const elementRows = [[[T1, 2], [T2, 3]], [[T1, 4], [T2, 5]]];

        expect(combineAggregatedRows(elementRows, 'sum', true, undefined, 'desc'))
            .toEqual([[T2, 8], [T1, 6]]);
    });

    it('should re-apply the limit to the combined union', () => {
        const elementRows = [[[T1, 2], [T2, 3]], [[T1, 4], [T2, 5]]];

        expect(combineAggregatedRows(elementRows, 'sum', true, 1, undefined))
            .toEqual([[T1, 6]]);
    });

    it('should merge by row position when there is no grouping time', () => {
        // each device answers with its single latest row (limit 1), reported at its own timestamp
        const elementRows = [[[T1, 10]], [[T2, 20]]];

        expect(combineAggregatedRows(elementRows, 'mean', false, 1, undefined))
            .toEqual([[T1, 15]]);
    });

    it('should ignore nil values and leave a row null when every element is nil', () => {
        const elementRows = [[[T1, 5], [T2, null]], [[T1, null], [T2, null]]];

        expect(combineAggregatedRows(elementRows, 'sum', true, undefined, undefined))
            .toEqual([[T1, 5], [T2, null]]);
    });
});
