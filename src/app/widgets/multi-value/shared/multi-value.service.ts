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

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MultiValueMeasurement } from './multi-value.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { MultiValueEditDialogComponent } from '../dialog/multi-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LastValuesRequestElementModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';

@Injectable({
    providedIn: 'root',
})
export class MultiValueService {
    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
        };
        dialogConfig.minWidth = '675px';
        const editDialogRef = this.dialog.open(MultiValueEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getValues(widget: WidgetModel): Observable<WidgetModel> {
        return new Observable<WidgetModel>((observer) => {
            if (widget.properties.multivaluemeasurements) {
                const requestPayload: LastValuesRequestElementModel[] = [];
                const measurements = widget.properties.multivaluemeasurements;
                measurements.forEach((measurement: MultiValueMeasurement) => {
                    requestPayload.push({
                        measurement: measurement.export.id,
                        columnName: measurement.column.Name,
                        math: measurement.math,
                    });
                });
                this.exportDataService.getLastValues(requestPayload).subscribe((pairs) => {
                    measurements.forEach((_, i) => {
                        measurements[i].data = pairs[i].value;
                        if (measurements[i].data == null && measurements[i].data !== 0 && measurements[i].type !== 'Boolean') {
                            measurements[i].data = 'N/A';
                            /* Act like a String if no value found, prevents piping.
                             * Also remove unit because 'N/A %' is weird.
                             * This doesn't change the actual configuration,
                             * because the widget is never written to the dashboard service
                             */
                            measurements[i].unit = '';
                            measurements[i].type = 'String';
                        }
                        if (measurements[i].type === 'Boolean' && measurements[i].data == null) {
                            measurements[i].data = 'False';
                        }
                        measurements[i].time = '' + pairs[i].time;
                    });
                    observer.next(widget);
                    observer.complete();
                });
            }
        });
    }
}
