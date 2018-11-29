/*
 * Copyright 2018 InfAI (CC SES)
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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/internal/operators';
import {ExportService} from '../../../../modules/data/export/shared/export.service';
import {ExportModel} from '../../../../modules/data/export/shared/export.model';

@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {

    formControl = new FormControl('');
    exports: ExportModel[] = [];
    filteredExports: Observable<ExportModel[]> = new Observable();

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {}};

    constructor(private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
        });
    }

    initDeployments() {
        this.exportService.getExports().subscribe((exports: (ExportModel[] | null)) => {
            if (exports !== null) {
                this.exports = exports;
                this.filteredExports = this.formControl.valueChanges
                    .pipe(
                        startWith<string | ExportModel>(''),
                        map(value => typeof value === 'string' ? value : value.Name),
                        map(name => name ? this._filter(name) : this.exports.slice())
                    );
            }
        });
    }


    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.formControl.value) {
            this.widget.properties.measurementName = this.formControl.value.Name;
            this.widget.properties.measurementId = this.formControl.value.ID;
        }
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(true);
            }
        });
    }

    private _filter(value: string): ExportModel[] {
        const filterValue = value.toLowerCase();
        return this.exports.filter(option => {
            if (option.Name) {
                return option.Name.toLowerCase().indexOf(filterValue) === 0;
            }
            return false;
        });
    }

    displayFn(input?: ExportModel): string | undefined {
        return input ? input.Name : undefined;
    }

}
