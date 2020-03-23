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
import {EnergyPredictionColumnModel, EnergyPredictionModel} from './energy-prediction.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {EnergyPredictionEditDialogComponent} from '../dialog/energy-prediction-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportModel} from '../../charts/export/shared/charts-export.model';
import {ChartsExportRequestPayloadModel} from '../../charts/export/shared/charts-export-request-payload.model';

@Injectable({
    providedIn: 'root'
})
export class EnergyPredictionService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService,
                private http: HttpClient) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '450px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(EnergyPredictionEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getPrediction(widget: WidgetModel): Observable<EnergyPredictionModel> { // .
        return new Observable<EnergyPredictionModel>((observer) => {
            const m = widget.properties.measurement;
            const columns = widget.properties.columns || {} as EnergyPredictionColumnModel;
            if (m) {
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
                    queries: [{id: m.id, fields: []}],
                    limit: 1
                };

                const fields = [];
                if (columns.prediction) {
                    fields.push({name: columns.prediction, math: widget.properties.math || ''});
                }
                if (columns.predictionTotal) {
                    fields.push({name: columns.predictionTotal, math: widget.properties.math || ''});
                }
                if (columns.timestamp) {
                    fields.push({name: columns.timestamp, math: ''});
                }

                requestPayload.queries[0].fields = fields;

                this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).subscribe(data => {
                    observer.next(this.extractData(data, widget));
                    observer.complete();
                });
            }
        });
    }

    private extractData(data: ChartsExportModel, widget: WidgetModel): EnergyPredictionModel {
        const model: EnergyPredictionModel = {prediction: 0, predictionTotal: 0, timestamp: ''};
        if (data === undefined || data.results === undefined || data.results.length === 0
            || data.results[0].series === undefined || data.results[0].series.length === 0) {
            console.log('Got empty results for EnergyPrediction');
            return model;
        }
        const series = data.results[0].series[0];
        const id = widget.properties.measurement ? widget.properties.measurement.id : '';
        try {
            const valueName = id + '.' + (widget.properties.columns ? widget.properties.columns.prediction : '');
            const predictionIndex = series.columns.indexOf(valueName);
            model.prediction = series.values[0][predictionIndex] as number;
        } catch (e) {
            console.error('Could not extract Prediction value: ' + e);
        }

        try {
            const valueName = id + '.' + (widget.properties.columns ? widget.properties.columns.predictionTotal : '');
            const predictionIndex = series.columns.indexOf(valueName);
            model.predictionTotal = series.values[0][predictionIndex] as number;
        } catch (e) {
            console.error('Could not extract total prediction value: ' + e);
        }

        try {
            const timestampName = id + '.' + (widget.properties.columns ? widget.properties.columns.timestamp : '');
            const timestampIndex = series.columns.indexOf(timestampName);
            model.timestamp = series.values[0][timestampIndex] as string;
        } catch (e) {
            console.error('Could not extract Timestamp value: ' + e);
        }
        return model;
    }

    private getData(id: string): Observable<ChartsExportModel> {
        return this.http.get<ChartsExportModel>(environment.influxAPIURL + '/measurement/' + id + '?limit=1').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as ChartsExportModel))
        );
    }

}

