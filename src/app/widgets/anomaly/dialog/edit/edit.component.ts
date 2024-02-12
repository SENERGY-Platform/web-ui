import { Component, Inject } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, Observable, map } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportModel, ExportResponseModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ChartsExportMeasurementModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class EditComponent {
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: [''],
        export: ['']
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ChartsExportMeasurementModel[] = [];
    ready = false;

    constructor(
    private dialogRef: MatDialogRef<EditComponent>,
    private exportService: ExportService,
    private dashboardService: DashboardService,
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

    ngOnInit() {
        const obs = [this.getWidgetData(), this.getAvailableExports()];
        forkJoin(obs).subscribe({
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
                this.form.patchValue({
                    name: widget.name,
                    export: widget.properties.measurement,
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
        this.widget.properties.measurement = this.form.get('export')?.value;

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
                        if (
                            exportModel.ID !== undefined &&
                  exportModel.Name !== undefined //&&
                  //EnergyPredictionRequirementsService.exportHasRequiredValues(exportModel.Values)
                        ) {
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

}
