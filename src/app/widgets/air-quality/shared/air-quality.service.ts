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

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {MeasurementModel} from './air-quality.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AirQualityEditDialogComponent} from '../dialog/air-quality-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportColumnsModel, ChartsExportModel} from '../../charts/export/shared/charts-export.model';

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
        dialogConfig.minWidth = '700px';
        const editDialogRef = this.dialog.open(AirQualityEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    readData(measurement: MeasurementModel) {
        return new Observable<void>((observer) => {
            this.getData(measurement, false).subscribe((resp: ChartsExportModel) => {
                this.extractData(resp, measurement, false);
                if (measurement.has_outside) {
                    this.getData(measurement, true).subscribe((resp2: ChartsExportModel) => {
                        this.extractData(resp2, measurement, true);
                        observer.next();
                        observer.complete();
                    });
                } else {
                    observer.next();
                    observer.complete();
                }
            });
        });
    }

    private extractData(influxData: ChartsExportModel, measurement: MeasurementModel, outside: boolean) {
        if (influxData === undefined || influxData.results === undefined || influxData.results.length === 0
            || influxData.results[0].series === undefined || influxData.results[0].series.length === 0) {
            console.error('Got empty results from Influx');
            return;
        }
        const series = influxData.results[0].series[0];
        if (outside) {
            if (measurement.outsideData && measurement.outsideData.column) {
                measurement.outsideData.value = this.getValue(measurement.outsideData.column.Name, series) as number;
            }
        } else {
            if (measurement.data && measurement.data.column) {
                measurement.data.value = this.getValue(measurement.data.column.Name, series) as number;
            }
        }
    }

    private getData(measurement: MeasurementModel, outside: boolean): Observable<ChartsExportModel> {
        const id = outside ?
            (measurement.outsideExport ? measurement.outsideExport.id : '') :
            (measurement.export ? measurement.export.id : '');
        return this.http.get<ChartsExportModel>(
            environment.influxAPIURL + '/measurement/' + id + '?limit=1').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as ChartsExportModel))
        );
    }

    private getValue(name: string, data: ChartsExportColumnsModel): (string | number) {
        try {
            const index = data.columns.indexOf(name);
            return data.values[0][index];
        } catch (e) {
            console.error('Could not extract value ' + name + '\n' + e);
            return '';
        }
    }

}

