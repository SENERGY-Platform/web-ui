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
import {MeasurementModel} from './air-quality.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AirQualityEditDialogComponent} from '../dialog/air-quality-edit-dialog.component';
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
export class AirQualityService {

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
            dashboardId: dashboardId
        };
        dialogConfig.minWidth = '750px';
        const editDialogRef = this.dialog.open(AirQualityEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    readAllData(widget: WidgetModel): Observable<MeasurementModel[]> {
        return new Observable<MeasurementModel[]>((observer) => {
            if (widget.properties.measurements) {
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

                const measurements = widget.properties.measurements;
                const array: ChartsExportRequestPayloadQueriesModel[] = [];
                const ids = new Map<string, number>();
                measurements.forEach((measurement: MeasurementModel, index) => {
                    if (measurement.is_enabled) {
                        const id = (measurement.export ? measurement.export.id : '');
                        const column = measurement.data.column ? measurement.data.column.Name : '';
                        const key = id + '.' + column;
                        if (ids.has(key)) {
                            console.error('AirQualityService: Can\'t use the same combination of export + column twice');
                        }
                        ids.set(key, index);
                        array.push({id: id, fields: [{name: column, math: measurement.math || ''}]});

                    }
                    if (measurement.has_outside) {
                        const id = (measurement.outsideExport ? measurement.outsideExport.id : '');
                        const column = measurement.outsideData.column ? measurement.outsideData.column.Name : '';
                        const key = id + '.' + column;
                        if (ids.has(key)) {
                            console.error('AirQualityService:  Can\'t use the same combination of export + column twice');
                        }
                        array.push({id: id, fields: [{name: column, math: measurement.outsideMath || ''}]});
                        ids.set(id + '.' + column, index);
                    }
                });
                requestPayload.queries = array;

                const myMeasurements = widget.properties.measurements || [];

                this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).subscribe(model => {
                    const columns = model.results[0].series[0].columns;
                    const values = model.results[0].series[0].values;
                    ids.forEach((idIndex, id) => {
                        const columnIndex = columns.findIndex(col => col === id);
                        values.forEach(val => {
                            if (val[columnIndex]) {
                                // Found the correct row for the column, but need to check if it belongs to inside or outside export
                                const m = myMeasurements[idIndex];
                                const value = Math.round(Number(val[columnIndex]) * 100) / 100; // two digits
                                const insideId = (m.export ? m.export.id : '') + '.' + (m.data.column ? m.data.column.Name : '');

                                if (insideId === id) {
                                    myMeasurements[idIndex].data.value = value;
                                } else {
                                    const outsideId = (m.outsideExport ? m.outsideExport.id : '') + '.'
                                        + (m.outsideData.column ? m.outsideData.column.Name : '');
                                    if (outsideId === id) {
                                        myMeasurements[idIndex].outsideData.value = value;
                                    }
                                }
                            }
                        });
                    });
                    observer.next(myMeasurements);
                    observer.complete();
                });
            }
        });
    }
}

