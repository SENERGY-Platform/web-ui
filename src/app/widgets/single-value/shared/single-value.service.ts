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
import {SingleValueModel} from './single-value.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {SingleValueEditDialogComponent} from '../dialog/single-value-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportModel} from '../../charts/export/shared/charts-export.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ChartsExportRequestPayloadModel} from '../../charts/export/shared/charts-export-request-payload.model';

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
            const m = widget.properties.measurement;
            const name = widget.properties.vAxis ? widget.properties.vAxis.Name : '';
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
                    queries: [{id: m.id, fields: [{name: name, math: widget.properties.math || ''}]}],
                    limit: 1
                };

                this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).subscribe(model => {
                    const values = model.results[0].series[0].values;
                    let value: any = '';
                    let type = widget.properties.type || '';
                    if (values.length === 0) {
                        type = 'String';
                        value = 'N/A';
                    } else {
                        value = values[0][1];
                    }
                    const svm: SingleValueModel = {
                        type: type,
                        value: value
                    };
                    observer.next(svm);
                    observer.complete();
                });
            }
        });
    }
}

