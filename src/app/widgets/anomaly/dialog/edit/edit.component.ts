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
import { ChartsExportMeasurementModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';

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
        showForAllDevices: [true],
        showDebug: [false],
        onlyDataWindows: [false],
        filterDevices: ['']
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ChartsExportMeasurementModel[] = [];
    ready = false;
    devices: DeviceInstancesModel[] = [];
    errorOccured = false;

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
                const filterDevices: DeviceInstancesModel[] = this.devices.filter(device => this.widget.properties.anomalyDetection?.filterDeviceIds.includes(device.id))
                const exportElement = this.exports.find((availableExport) => availableExport.id === this.widget.properties.anomalyDetection?.export);

                this.form.patchValue({
                    name: widget.name,
                    export: exportElement,
                    onlyDataWindows: widget.properties.anomalyDetection?.onlyDataWindows || false,
                    showDebug: widget.properties.anomalyDetection?.showDebug || false,
                    showForAllDevices: widget.properties.anomalyDetection?.showForAllDevices || true,
                    filterDevices: filterDevices || []
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
        const deviceIDs: string[] = [];
        this.form.get('filterDevices')?.value.forEach((device: DeviceInstancesModel) => {
            deviceIDs.push(device.id);
        });

        this.widget.properties.anomalyDetection = {
            export: this.form.get("export")?.value['id'],
            showForAllDevices: this.form.get("showForAllDevices")?.value,
            showDebug: this.form.get("showDebug")?.value,
            onlyDataWindows: this.form.get("onlyDataWindows")?.value,
            filterDeviceIds: deviceIDs
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

}
