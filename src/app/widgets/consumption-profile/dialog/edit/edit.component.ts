import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { concatMap, forkJoin, Observable, map } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ConsumptionProfileProperties } from '../../shared/consumption-profile.model';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class ConsumptionProfileEditComponent implements OnInit {
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: ['', Validators.required],
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ExportModel[] = [];
    ready = false;

    constructor(
    private dialogRef: MatDialogRef<ConsumptionProfileEditComponent>,
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
        this.exportService.getAvailableExports().pipe(
            concatMap((exports) => {
                this.exports = exports;
                return this.getWidgetData();
            })
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
                const exportElement = this.exports.find((availableExport) => availableExport.ID === this.widget.properties.consumptionProfile?.exportID);
                this.form.patchValue({
                    name: widget.name,
                    export: exportElement,
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
        const widgetProperties: ConsumptionProfileProperties = {
            exportID: this.form.get('export')?.value['ID'],
        };
        this.widget.properties.consumptionProfile = widgetProperties;

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

    displayFn(input?: ExportModel): string {
        return (input != null && input.Name != null) ? input.Name : '';
    }
}
