import { Component, Inject, OnInit } from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ListRulesComponent } from '../../../export/dialog/list-rules/list-rules.component';
import { ChartsExportConversion, ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';
import { DataSourceConfig } from '../../../shared/data-source-selector/data-source-selector.component';
import { DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})
export class OpenWindowEditComponent implements OnInit {
    form: any;
    ready = false;
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    dashboardId = '';
    widget: WidgetModel = {} as WidgetModel;
    dataSourceConfig?: DataSourceConfig;
    fieldOptions: ChartsExportVAxesModel[] = [];
    vAxesDataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    displayedColumns = ['exportName', 'valueName', 'valueAlias', 'conversions'];
    ruleConfigIsMissing = false;

    constructor(
      @Inject(MAT_DIALOG_DATA) data: {
        dashboardId: string;
        widget: WidgetModel;
        userHasUpdateNameAuthorization: boolean;
        userHasUpdatePropertiesAuthorization: boolean;
      },
      private dialogRef: MatDialogRef<OpenWindowEditComponent>,
      private dialog: MatDialog,
      private dashboardService: DashboardService
    ) {
        this.dashboardId = data.dashboardId;
        this.widget = data.widget;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit(): void {
        this.checkIfRulesAreConfigured();

        this.dataSourceConfig = {
            exports: this.widget.properties.windowExports,
            timeRange: this.widget.properties.windowTimeRange
        };

        this.form = new FormGroup({
            id: new FormControl(this.widget.id),
            name: new FormControl(this.widget.name, Validators.required),
            type: new FormControl(this.widget.type),
            properties: new FormGroup({
                windowExports: new FormControl(this.widget.properties.windowExports),
                windowTimeRange: new FormGroup({
                    type: new FormControl(this.widget.properties.windowTimeRange?.type),
                    time: new FormControl(this.widget.properties.windowTimeRange?.time),
                    level: new FormControl(this.widget.properties.windowTimeRange?.level),
                    end: new FormControl(this.widget.properties.windowTimeRange?.end),
                    start: new FormControl(this.widget.properties.windowTimeRange?.start)
                }),
                hAxisLabel: new FormControl(this.widget.properties.hAxisLabel),
                vAxisLabel: new FormControl(this.widget.properties.vAxisLabel),
                vAxes: new FormControl(this.widget.properties.vAxes)
            })
        });
        if(this.widget.properties.vAxes == null || this.widget.properties.vAxes?.length === 0) {
            this.setVAxes(this.widget.properties.windowExports || []);
        } else {
            this.vAxesDataSource.data = this.widget.properties.vAxes;
        }

        this.ready = true;
    }

    close() {
        this.dialogRef.close();
    }

    checkIfRulesAreConfigured() {
        const vAxes: ChartsExportVAxesModel[] = this.widget.properties.vAxes || [];
        this.ruleConfigIsMissing = false;
        vAxes.forEach(vAxis => {
            if(vAxis.conversions == null || vAxis.conversions.length === 0) {
                this.ruleConfigIsMissing = true;
            }
        });
    }

    updateName() {
        const newName = (this.form.get('name') as FormControl).value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties() {
        this.form.get('properties.vAxes').patchValue(this.vAxesDataSource.data);
        const newProperties = (this.form.get('properties') as FormControl).value;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], newProperties);
    }

    save() {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }

        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }

        forkJoin(obs).subscribe({
            next: (responses) => {
                const errorOccured = responses.find((response) => response.message !== 'OK');
                if(!errorOccured) {
                    this.dialogRef.close(this.form.value);
                }
            },
            error: (err) => {
                console.log(err);
            }
        });
    }

    dataSourceConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const props = this.form.controls.properties.controls;
        props.windowExports.patchValue(updatedDataSourceConfig.exports);
        props.windowTimeRange.controls.type.patchValue(updatedDataSourceConfig.timeRange?.type);
        props.windowTimeRange.controls.level.patchValue(updatedDataSourceConfig.timeRange?.level);
        props.windowTimeRange.controls.time.patchValue(updatedDataSourceConfig.timeRange?.time);
        props.windowTimeRange.controls.end.patchValue(updatedDataSourceConfig.timeRange?.end);
        props.windowTimeRange.controls.start.patchValue(updatedDataSourceConfig.timeRange?.start);

        this.fieldOptions = updatedDataSourceConfig.fields || [];

        this.setVAxes(updatedDataSourceConfig.exports || []);
    }


    setVAxes(exports: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        const vAxes: ChartsExportVAxesModel[] = [];

        exports.forEach(dataExport => {
            vAxes.push({
                exportName: dataExport.name,
                instanceId: dataExport.id,
                math: '',
                color: '',
                valueName: 'window-open',
                valueType: 'string',
                conversions: [{
                    from: 'false',
                    to: 'false',
                    color: '#097969',
                    alias: 'zu'
                }, {
                    from: 'true',
                    to: 'true',
                    color: '#C41E3A',
                    alias: 'offen'
                }]
            });
        });

        // Remove no longer existing
        for (let i = this.vAxesDataSource.data.length - 1; i >= 0; i--) {
            const axis = this.vAxesDataSource.data[i] as ChartsExportVAxesModel;
            const sameExportAxisExists = vAxes.some(
                (item: ChartsExportVAxesModel) =>
                    item.instanceId != null &&
                    item.instanceId === axis.instanceId &&
                    item.exportName === axis.exportName &&
                    item.valueName === axis.valueName &&
                    item.valueType === axis.valueType,
            );

            if (!sameExportAxisExists) {
                this.vAxesDataSource.data.splice(i);
            }
        }

        // Add not yet existing
        vAxes.forEach((axis) => {
            const sameExportValueExists = this.vAxesDataSource.data.some(
                (item: ChartsExportVAxesModel) =>
                    item.instanceId != null &&
                    item.instanceId === axis.instanceId &&
                    item.exportName === axis.exportName &&
                    item.valueName === axis.valueName &&
                    item.valueType === axis.valueType,
            );

            if (!sameExportValueExists) {
                this.vAxesDataSource.data.push(axis);
            }
        });
        this.vAxesDataSource.data = this.vAxesDataSource.data;
        console.log(this.vAxesDataSource)
    }

    listRules(element: ChartsExportVAxesModel) {
        const dialog = this.dialog.open(ListRulesComponent, {
            data: element.conversions || []
        });

        dialog.afterClosed().subscribe({
            next: (rules: ChartsExportConversion[]) => {
                if(rules != null) {
                    element.conversions = rules;
                    this.ruleConfigIsMissing = false;
                    if(rules.length === 0) {
                        this.ruleConfigIsMissing = true;
                    }
                } else {
                    this.ruleConfigIsMissing = true;
                }
            },
            error: (_) => {

            }
        });
    }
}
