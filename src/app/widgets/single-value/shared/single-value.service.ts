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
import {SingleValueModel} from './single-value.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {SingleValueEditDialogComponent} from '../dialog/single-value-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportModel} from '../../charts/export/shared/charts-export.model';

@Injectable({
    providedIn: 'root'
})
export class SingleValueService {

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
        const editDialogRef = this.dialog.open(SingleValueEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getSingleValue(widget: WidgetModel): Observable<SingleValueModel> { // .
        return new Observable<SingleValueModel>((observer) => {
            this.getData(widget.properties.measurement ? widget.properties.measurement.id : '').
            subscribe((resp: ChartsExportModel) => {
                try {
                    const singleValueModel = this.extractData(resp, widget.properties.vAxis);
                    observer.next(singleValueModel);
                } catch (e) {
                    observer.error(e);
                }
                observer.complete();
            });
        });
    }

    private extractData(data: ChartsExportModel, vAxis: any): SingleValueModel {
        const name = vAxis.Name || '';
        const valueIndex = data.results[0].series[0].columns.indexOf(name);
        const model: SingleValueModel = {value: 0};
        model.value = data.results[0].series[0].values[0][valueIndex];
        return model;
    }

    private getData(id: string): Observable<ChartsExportModel> {
        return this.http.get<ChartsExportModel>(environment.influxAPIURL + '/measurement/' + id + '?limit=1').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as ChartsExportModel))
        );
    }

}

