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

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {MultiValueMeasurement} from './multi-value.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {MultiValueEditDialogComponent} from '../dialog/multi-value-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportModel} from '../../charts/export/shared/charts-export.model';
import {
    ChartsExportRequestPayloadModel,
    ChartsExportRequestPayloadQueriesModel
} from '../../charts/export/shared/charts-export-request-payload.model';

@Injectable({
    providedIn: 'root'
})
export class MultiValueService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService,
                private http: HttpClient) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
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
                const requestPayload: ChartsExportRequestPayloadModel = {
                    time: {
                        last: '500000w', // arbitrary high number
                        end: undefined,
                        start: undefined
                    },
                    group: {
                        type: undefined,
                        time: ''
                    },
                    queries: [],
                    limit: 1
                };

                const measurements = widget.properties.multivaluemeasurements;
                const array: ChartsExportRequestPayloadQueriesModel[] = [];
                measurements.forEach((measurement: MultiValueMeasurement) => {
                    if (array.length > 0 && array[array.length - 1].id === measurement.export.id) {
                        array[array.length - 1].fields.push({name: measurement.column.Name, math: measurement.math || ''});
                    } else {
                        array.push({id: measurement.export.id, fields: [{name: measurement.column.Name, math: measurement.math || ''}]});
                    }
                });
                requestPayload.queries = array;

                const ids: string[] = [];
                measurements.forEach(m => ids.push(m.export.id + '.' + m.column.Name));
                this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).subscribe(model => {
                    const columns = model.results[0].series[0].columns;
                    const values = model.results[0].series[0].values;
                    ids.forEach((id, idIndex) => {
                        const columnIndex = columns.findIndex(col => col === id);
                        values.forEach(val => {
                            if (val[columnIndex]) {
                                measurements[idIndex].data = val[columnIndex];
                            }
                        });
                        if (measurements[idIndex].data == null) {
                            measurements[idIndex].data = 'N/A';
                            /* Act like a String if no value found, prevents piping.
                             * Also remove unit because 'N/A %' is weird.
                             * This doesn't change the actual configuration,
                             * because the widget is never written to the dashboard service
                             */
                            measurements[idIndex].unit = '';
                            measurements[idIndex].type = 'String';
                        }
                    });
                    observer.next(widget);
                    observer.complete();
                });
        }});
    }
}

