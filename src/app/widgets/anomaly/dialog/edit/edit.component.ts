import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DeviceInstancesModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { ExportModel, ExportResponseModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { DataSourceConfig } from 'src/app/widgets/charts/shared/data-source-selector/data-source-selector.component';

const visualizationTypeLine =  {
    id: 'device',
    name: 'Line'
};

const visualizationTypeTimeline = {
    id: 'timeline',
    name: 'Timeline'
};

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class EditComponent implements OnInit {
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: [''],
        export: [''],
        showDebug: [false],
        deviceValueConfig: this.formBuilder.group({
            exports: [''],
            fields: ['']
        }),
        visualizationType: [visualizationTypeLine],
        timeRangeConfig: this.formBuilder.group({
            timeRange: this.formBuilder.group({
                type: [''],
                time: [''],
                level: [''],
                start: [''],
                end: ['']
            })
        }),
        showFrequencyAnomalies: [false]
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ChartsExportMeasurementModel[] = [];
    ready = false;
    devices: DeviceInstancesModel[] = [];
    errorOccured = false;
    visualizationTypes = [visualizationTypeTimeline, visualizationTypeLine];

    constructor(
    private dialogRef: MatDialogRef<EditComponent>,
    private exportService: ExportService,
    private dashboardService: DashboardService,
    private deviceRepoService: DeviceInstancesService,
    private formBuilder: UntypedFormBuilder,
    @Inject(MAT_DIALOG_DATA) data: {
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
    },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    close(): void {
        this.dialogRef.close(this.widget);
    }

    loadDevices() {
        return this.deviceRepoService.loadDeviceInstances(9999, 0, undefined, undefined, undefined, undefined, undefined, undefined, undefined).pipe(
            map((devices) => {
                this.devices = devices.result;
            })
        );
    }

    ngOnInit() {
        const obs = [this.getAvailableExports(), this.loadDevices()];
        forkJoin(obs).pipe(
            concatMap((_) => this.getWidgetData())
        ).subscribe({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
            }
        });
    }

    getWidgetData(): Observable<WidgetModel> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
                this.widget = widget;

                //const filterDevices: DeviceInstancesModel[] = this.devices.filter(device => this.widget.properties.anomalyDetection?.filterDeviceIds.includes(device.id))

                const exportElement = this.exports.find((availableExport) => this.widget.properties.anomalyDetection?.export === availableExport.id);

                let showDebug = widget.properties.anomalyDetection?.showDebug;
                if(showDebug == null) {
                    showDebug = false;
                }

                let visualizationType = this.visualizationTypes.find((visType => widget.properties.anomalyDetection?.visualizationType === visType.id));
                if(visualizationType == null) {
                    visualizationType = visualizationTypeLine;
                }

                const showFrequencyAnomalies = widget.properties.anomalyDetection?.showFrequencyAnomalies;

                this.form.patchValue({
                    name: widget.name,
                    export: exportElement,
                    showDebug,
                    deviceValueConfig: widget.properties.anomalyDetection?.deviceValueConfig,
                    timeRangeConfig: widget.properties.anomalyDetection?.timeRangeConfig,
                    visualizationType,
                    showFrequencyAnomalies
                });

                return widget;
            })
        );
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName =  this.form.get('name')?.value;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.anomalyDetection = {
            export: this.form.controls.export?.value?.['id'],
            showDebug: this.form.controls.showDebug?.value,
            timelineConfig: {
                vAxisLabel: '',
                hAxisLabel: '',
            },
            timeRangeConfig: this.form.controls.timeRangeConfig?.value,
            deviceValueConfig: this.form.controls.deviceValueConfig?.value,
            visualizationType: this.form.controls.visualizationType.value['id'],
            showFrequencyAnomalies: this.form.controls.showFrequencyAnomalies.value
        };

        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }
        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    getAvailableExports(): Observable<ExportResponseModel | null> {
        return this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).pipe(
            map((exports: ExportResponseModel | null) => {
                if (exports !== null) {
                    exports.instances?.forEach((exportModel: ExportModel) => {
                        //EnergyPredictionRequirementsService.exportHasRequiredValues(exportModel.Values)
                        if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                            this.exports.push({ id: exportModel.ID, name: exportModel.Name, values: exportModel.Values, exportDatabaseId: exportModel.ExportDatabaseID });
                        }
                    });
                }
                return exports;
            })
        );
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    updateFormControl(controlName: string, value: any, formKey: string) {
        const control = this.form.get(formKey + controlName);
        if(control != null) {
            control.patchValue(value);
        }
    }

    timeRangeConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const timelineKey = 'timeRangeConfig.timeRange.';
        this.updateFormControl('type', updatedDataSourceConfig.timeRange?.type, timelineKey);
        this.updateFormControl('level', updatedDataSourceConfig.timeRange?.level, timelineKey);
        this.updateFormControl('time', updatedDataSourceConfig.timeRange?.time, timelineKey);
        this.updateFormControl('end', updatedDataSourceConfig.timeRange?.end, timelineKey);
        this.updateFormControl('start', updatedDataSourceConfig.timeRange?.start, timelineKey);
    }

    deviceValuesConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const formKey = 'deviceValueConfig.';
        if(updatedDataSourceConfig.fields !== undefined && updatedDataSourceConfig.fields?.length > 0) {
            this.updateFormControl('fields', updatedDataSourceConfig.fields, formKey);
            this.updateFormControl('exports', updatedDataSourceConfig.exports, formKey);
        }
    }
}
