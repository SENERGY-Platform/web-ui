/*
 * Copyright 2020 InfAI (CC SES)
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

import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel, ExportResponseModel, ExportValueModel} from '../../../modules/exports/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
    DeviceInstancesModel,
    DeviceInstancesPermSearchModel
} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentVariableModel,
    DeviceTypeServiceModel
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';

@Component({
    templateUrl: './single-value-edit-dialog.component.html',
    styleUrls: ['./single-value-edit-dialog.component.css'],
})
export class SingleValueEditDialogComponent implements OnInit {
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    vAxisValues: ExportValueModel[] = [];
    disableSave = false;
    groupTypes = [
        'mean',
        'sum',
        'count',
        'median',
        'min',
        'max',
        'first',
        'last',
        'difference-first',
        'difference-last',
        'difference-min',
        'difference-max',
        'difference-count',
        'difference-mean',
        'difference-sum',
        'difference-median',
    ];

    devices: DeviceInstancesModel[] = [];
    services: DeviceTypeServiceModel[] = [];
    paths: { Name: string }[] = [];

    form = this.fb.group({
        vAxis: {},
        vAxisLabel: '',
        name: '',
        type: '',
        format: '',
        threshold: 128,
        math: '',
        measurement: '',
        group: this.fb.group({
            time: '',
            type: '',
        }),
        sourceType: '',
        device: {},
        service: {},
    });

    constructor(
        private dialogRef: MatDialogRef<SingleValueEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private fb: FormBuilder,
        private deviceTypeService: DeviceTypeService,
        private deviceInstancesService: DeviceInstancesService,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.form.get('measurement')?.valueChanges.subscribe(exp => {
            this.vAxisValues = exp?.values;
        });
        this.form.get('type')?.valueChanges.subscribe(v => {
            if (v === 'String') {
                this.form.patchValue({format: ''});
                this.form.get('format')?.disable();
            } else {
                this.form.get('format')?.enable();
            }
        });

        this.form.get('device')?.valueChanges.subscribe((device: DeviceInstancesPermSearchModel) => {
            this.paths = [];
            this.services = [];
            if (device === undefined || device == null) {
                return;
            }
            this.deviceTypeService.getDeviceType(device.device_type_id).subscribe(dt => {
                this.services = dt?.services.filter(service => service.outputs.length === 1) || [];
            });
        });

        this.form.get('service')?.valueChanges.subscribe((service: DeviceTypeServiceModel) => {
            this.paths = [];
            if (service === undefined || service == null) {
                return;
            }
            this.paths = this.deviceTypeService.getValuePaths(service.outputs[0].content_variable).map(x => {
                return {Name: x};
            });
        });
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.form.patchValue({
                vAxis: widget.properties.vAxis,
                vAxisLabel: widget.properties.vAxisLabel,
                name: widget.name,
                type: widget.properties.type,
                format: widget.properties.format,
                threshold: widget.properties.threshold,
                math: widget.properties.math,
                sourceType: this.widget.properties.sourceType || 'export',
                measurement: this.widget.properties.measurement,
                device: this.widget.properties.device,
                service: this.widget.properties.service,
            });
            this.form.get('group')?.patchValue({
                time: widget.properties.group?.time,
                type: widget.properties.group?.type,
            });

            this.initDeployments();
            this.initDevices();
        });
    }

    initDeployments() {
        this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).subscribe((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                exports.instances?.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exports.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values, exportDatabaseId: exportModel.ExportDatabaseID});
                    }
                });
            }
        });
    }

    initDevices() {
        this.deviceInstancesService.getDeviceInstances(10000, 0, 'name', 'asc').subscribe(devices => this.devices = devices);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.widget.properties.measurement = {
            id: this.form.get('measurement')?.value?.id,
            name: this.form.get('measurement')?.value?.name,
            values: this.form.get('measurement')?.value?.values,
            exportDatabaseId: this.form.get('measurement')?.value?.ExportDatabaseId,
        };
        this.widget.properties.vAxis = this.form.get('vAxis')?.value;
        this.widget.properties.vAxisLabel = this.form.get('vAxisLabel')?.value;
        this.widget.name = this.form.get('name')?.value;
        this.widget.properties.type = this.form.get('type')?.value;
        this.widget.properties.format = this.form.get('format')?.value;
        this.widget.properties.threshold = this.form.get('threshold')?.value;
        this.widget.properties.math = this.form.get('math')?.value;
        this.widget.properties.group = this.form.get('group')?.value;
        this.widget.properties.device = this.form.get('device')?.value;
        this.widget.properties.service = this.form.get('service')?.value;
        this.widget.properties.sourceType = this.form.get('sourceType')?.value;


        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

    compareValues(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    compareStrings(a: any, b: any) {
        return a === b;
    }

    compareIds(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.id === b.id;
    }

    compareNames(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.Name === b.Name;
    }
}
