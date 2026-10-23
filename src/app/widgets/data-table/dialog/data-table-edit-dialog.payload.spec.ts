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

import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import {
    DataTableAggregations,
    DataTableElementModel,
    DataTableElementTypesEnum,
    DataTableOrderEnum,
    DataTablePropertiesModel,
    ExportValueTypes,
} from '../shared/data-table.model';
import { DEVICE_GROUP_CRITERIA, configureDataTableDialogTestBed, DataTableDialogSpies } from './data-table-dialog-testbed.mock';
import { ExportModel } from '../../../modules/exports/shared/export.model';

/**
 * The properties the dialog sends are read by the data table widget on every dashboard. These specs pin the whole
 * request body for the cases that change which elements and status rules a table has.
 */
describe('DataTableEditDialogComponent saved widget', () => {
    let component: DataTableEditDialogComponent;
    let spies: DataTableDialogSpies;

    const criteria = DEVICE_GROUP_CRITERIA;

    const deviceElement: DataTableElementModel = {
        id: 'el-device',
        name: 'Temperature',
        valueType: ExportValueTypes.FLOAT,
        format: '1.1-1',
        exportId: null as unknown as string,
        exportValuePath: 'struct.Time',
        exportValueName: 'Time',
        exportCreatedByWidget: false,
        groupType: 'mean',
        groupTime: '1h',
        unit: '°C',
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE,
            device: { aspectId: 'aspectId', functionId: 'functionId', deviceId: 'deviceId', serviceId: 'service_1', requestDevice: false },
        },
    };

    const pipelineElement: DataTableElementModel = {
        id: 'el-pipeline',
        name: 'Power',
        valueType: ExportValueTypes.FLOAT,
        exportId: 'export-1',
        exportValuePath: 'analytics.opValueName',
        exportValueName: 'opValueName',
        exportCreatedByWidget: false,
        unit: 'W',
        elementDetails: {
            elementType: DataTableElementTypesEnum.PIPELINE,
            pipeline: { pipelineId: 'pipelineId', operatorId: 'operatorId' },
        },
    };

    const deviceGroupElement: DataTableElementModel = {
        id: 'el-group',
        name: 'Rooms',
        valueType: ExportValueTypes.FLOAT,
        exportId: 'null',
        exportValuePath: 'null',
        exportValueName: 'null',
        exportCreatedByWidget: false,
        unit: '°C',
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE_GROUP,
            deviceGroup: {
                deviceGroupId: 'dg1',
                deviceGroupCriteria: criteria,
                targetCharacteristic: 'ch1',
                deviceGroupAggregation: DataTableAggregations.Latest,
            },
        },
    };

    const rules = [
        { status: 'on', icon: 'power', color: '#00aa00' },
        { status: 'off', icon: 'power_off', color: '#aa0000' },
    ];

    function stored(elements: DataTableElementModel[], valuesPerElement = 2, convertRules = rules): WidgetModel {
        const dataTable: DataTablePropertiesModel = {
            name: 'Stored table',
            order: DataTableOrderEnum.ValueDesc,
            valueAlias: 'Reading',
            refreshTime: 30,
            valuesPerElement,
            elements,
            convertRules,
        } as unknown as DataTablePropertiesModel;
        return { id: 'widgetId-1', name: 'Stored table', type: 'data_table', properties: { dataTable, other: 'kept' } } as unknown as WidgetModel;
    }

    beforeEach(() => {
        spies = configureDataTableDialogTestBed();
    });

    function open(widget: WidgetModel): void {
        spies.dashboard.getWidget.and.returnValue(of(widget));
        const fixture = TestBed.createComponent(DataTableEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        flush();
    }

    function sent(): unknown {
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
        return spies.dashboard.updateWidgetProperty.calls.mostRecent().args[3];
    }

    const savedDevice = {
        id: 'el-device',
        name: 'Temperature',
        valueType: 'float',
        format: '1.1-1',
        exportValuePath: 'struct.Time',
        exportValueName: 'Time',
        exportCreatedByWidget: false,
        exportTagSelection: null,
        exportDbId: undefined,
        groupType: 'mean',
        groupTime: '1h',
        unit: '°C',
        warning: { enabled: false },
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE,
            device: {
                aspectId: 'aspectId',
                functionId: 'functionId',
                deviceId: 'deviceId',
                serviceId: 'service_1',
                deploymentId: null,
                requestDevice: false,
                scheduleId: null,
            },
        },
    };

    const savedPipeline = {
        id: 'el-pipeline',
        name: 'Power',
        valueType: 'float',
        format: null,
        exportId: 'export-1',
        exportValuePath: 'analytics.opValueName',
        exportValueName: 'opValueName',
        exportCreatedByWidget: false,
        exportTagSelection: null,
        exportDbId: undefined,
        groupType: null,
        groupTime: null,
        unit: 'W',
        warning: { enabled: false },
        elementDetails: {
            elementType: DataTableElementTypesEnum.PIPELINE,
            pipeline: { pipelineId: 'pipelineId', operatorId: 'operatorId' },
        },
    };

    const savedDeviceGroup = {
        id: 'el-group',
        name: 'Rooms',
        valueType: 'float',
        format: null,
        exportCreatedByWidget: false,
        exportTagSelection: null,
        exportDbId: undefined,
        groupType: null,
        groupTime: null,
        unit: '°C',
        warning: { enabled: false },
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE_GROUP,
            // disabled while more than one value per element is shown
            deviceGroup: { deviceGroupId: 'dg1', deviceGroupCriteria: criteria, targetCharacteristic: 'ch1' },
        },
    };

    const tableSettings = {
        name: 'Stored table',
        order: DataTableOrderEnum.ValueDesc,
        valueAlias: 'Reading',
        refreshTime: 30,
        valuesPerElement: 2,
    };

    it('saves an untouched table with the properties it loaded', fakeAsync(() => {
        open(stored([deviceElement, pipelineElement, deviceGroupElement]));

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: { ...tableSettings, elements: [savedDevice, savedPipeline, savedDeviceGroup], convertRules: rules },
        });
        expect(spies.exportService.startPipeline.calls.count()).toBe(0);
        expect(spies.engine.createDeployment.calls.count()).toBe(0);
    }));

    it('saves a table with one import element that has its export created', fakeAsync(() => {
        spies.helper.getPreloadedExportById.and.returnValue({ ExportDatabaseID: 'db' } as ExportModel);
        open(stored([]));
        const element = component.getElements().at(0);
        element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.IMPORT });
        element.controls.elementDetails.controls.import.patchValue({ typeId: 'type1', instanceId: 'inst1' });
        element.patchValue({ id: 'el-import', name: 'Imported', exportValuePath: 'value.v', exportCreatedByWidget: true });

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: {
                ...tableSettings,
                elements: [
                    {
                        id: 'el-import',
                        name: 'Imported',
                        valueType: 'float',
                        format: null,
                        exportId: 'created-export',
                        exportValuePath: 'value.v',
                        exportValueName: 'v',
                        exportCreatedByWidget: true,
                        exportTagSelection: null,
                        exportDbId: jasmine.any(String),
                        groupType: null,
                        groupTime: null,
                        unit: null,
                        warning: { enabled: false },
                        elementDetails: {
                            elementType: DataTableElementTypesEnum.IMPORT,
                            device: {},
                            import: { typeId: 'type1', instanceId: 'inst1' },
                        },
                    },
                ],
                convertRules: rules,
            },
        });
    }));

    it('saves a table with one device group element', fakeAsync(() => {
        open(stored([deviceGroupElement], 1));

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: {
                ...tableSettings,
                valuesPerElement: 1,
                elements: [
                    {
                        ...savedDeviceGroup,
                        elementDetails: {
                            elementType: DataTableElementTypesEnum.DEVICE_GROUP,
                            deviceGroup: {
                                deviceGroupId: 'dg1',
                                deviceGroupCriteria: criteria,
                                targetCharacteristic: 'ch1',
                                deviceGroupAggregation: DataTableAggregations.Latest,
                            },
                        },
                    },
                ],
                convertRules: rules,
            },
        });
    }));

    it('saves a table with one device element', fakeAsync(() => {
        open(stored([deviceElement]));

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: { ...tableSettings, elements: [savedDevice], convertRules: rules },
        });
    }));

    it('saves a table with one status rule added and one deleted', fakeAsync(() => {
        open(stored([deviceElement]));
        component.deleteConvertRule(0);
        component.addConvertRule();
        component.convertRulesControl.at(1).patchValue({ status: 'standby', icon: 'tv_off', color: '#888888' });

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: {
                ...tableSettings,
                elements: [savedDevice],
                convertRules: [rules[1], { status: 'standby', icon: 'tv_off', color: '#888888' }],
            },
        });
    }));

    it('saves a table without the element that was deleted', fakeAsync(() => {
        open(stored([deviceElement, pipelineElement]));
        component.removeTab(0);

        component.save();

        expect(sent()).toEqual({
            other: 'kept',
            dataTable: { ...tableSettings, elements: [savedPipeline], convertRules: rules },
        });
    }));
});
