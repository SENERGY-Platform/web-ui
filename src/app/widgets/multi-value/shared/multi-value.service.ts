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
import {MultiValueModel} from './multi-value.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {MultiValueEditDialogComponent} from '../dialog/multi-value-edit-dialog.component';
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
        dialogConfig.minWidth = '640px';
        const editDialogRef = this.dialog.open(MultiValueEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    private extractData(data: ChartsExportModel, column: any): (string | number) {
        const name = column.Name || '';
        const valueIndex = data.results[0].series[0].columns.indexOf(name);
        return data.results[0].series[0].values[0][valueIndex];
    }

    private getData(id: string): Observable<ChartsExportModel> {
        return this.http.get<ChartsExportModel>(environment.influxAPIURL + '/measurement/' + id + '?limit=1').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as ChartsExportModel))
        );
    }

    /**
     * Gets latest values for all exports defined in widget.properties.multivaluemeasurements
     * and makes sure to only request results once for each individual export.
     * @param widget
     * @return An Observable, which will receive a call for each export defined with its result
     * and index from the defining array
     */
    getValues(widget: WidgetModel): Observable<MultiValueModel> {
        return new Observable<MultiValueModel>((observer) => {
            if (widget.properties.multivaluemeasurements) {
                const measurements = widget.properties.multivaluemeasurements;
                const ids: string[] = [];

                // get unique ids
                measurements.forEach( m => {
                    if (!ids.includes(m.export.id)) {
                        ids.push(m.export.id);
                    }
                });

                ids.forEach(id => {
                    this.getData(id).subscribe(resp => {
                        const fits: number[] = [];
                        // reverse search
                        for (let i = 0; i < measurements.length; i++) {
                            if (measurements[i].export.id === id) {
                                fits.push(i);
                            }
                        }
                        fits.forEach(index => {
                            const result: MultiValueModel = {
                                index: index,
                                value: this.extractData(resp, measurements[index].column),
                            };
                            observer.next(result);
                        });
                    });
                });
            } else {
                observer.error('widget.properties.singlevaluemeasurements undefined');
            }
        });
    }
}

