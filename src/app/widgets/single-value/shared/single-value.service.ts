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
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ExportDataService} from '../../shared/export-data.service';
import {QueriesRequestElementInfluxModel, QueriesRequestElementTimescaleModel} from '../../shared/export-data.model';
import {environment} from '../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SingleValueService {
    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(SingleValueEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getValues(widget: WidgetModel, date?: Date): Observable<SingleValueModel[]> {
        return new Observable<SingleValueModel[]>((observer) => {
            const m = widget.properties.measurement;
            const name = widget.properties.vAxis ? widget.properties.vAxis.Name : '';
            if (m) {
                const requestPayload: QueriesRequestElementInfluxModel[] | QueriesRequestElementTimescaleModel[] = [{
                    columns: [
                        {
                            name,
                            math: widget.properties.math !== '' ? widget.properties.math : undefined,
                        },
                    ],
                }];
                if (date !== undefined) { // TODO
                    requestPayload[0].time = {
                        start: new Date(0).toISOString(),
                        end: date.toISOString(),
                    };
                }
                if (
                    widget.properties.group !== undefined &&
                    widget.properties.group.time !== '' &&
                    widget.properties.group.type !== undefined &&
                    widget.properties.group.type !== ''
                ) {
                    if (date !== undefined) { // TODO
                        requestPayload[0].time = {last: widget.properties.group.time};
                    }
                    requestPayload[0].columns[0].groupType = widget.properties.group.type;
                    requestPayload[0].groupTime = widget.properties.group.time;
                } else {
                    requestPayload[0].limit = 1;
                }

                const queryMultiple = function() {
                    if (date === undefined || requestPayload[0].time === undefined) {
                        return;
                    }
                    requestPayload[0].time.last = undefined;
                    requestPayload[0].time.start = new Date(0).toISOString();
                    requestPayload[0].time.end = date.toISOString();
                    requestPayload[0].limit = 10;

                    requestPayload.push(JSON.parse(JSON.stringify(requestPayload[0])));
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    requestPayload[1].time!.start = date.toISOString();
                    // eslint-disable-next-line
                    requestPayload[1].time!.end = '2099-01-01T00:00:00Z';
                    requestPayload[1].orderDirection = 'asc';
                };


                let o:  Observable<any[][]> | undefined;
                if (widget.properties.sourceType === 'export' || widget.properties.sourceType === undefined) { // undefined for legacy widgets
                    (requestPayload[0] as QueriesRequestElementInfluxModel).measurement = m.id;
                    (requestPayload[0] as QueriesRequestElementTimescaleModel).exportId = m.id;
                    switch (m.exportDatabaseId) {
                    case environment.exportDatabaseIdInternalTimescaleDb:
                        queryMultiple();
                        o = this.exportDataService.queryTimescale(requestPayload);
                        break;
                    case undefined:
                    case environment.influxAPIURL:
                        queryMultiple();
                        o = this.exportDataService.queryInflux(requestPayload as QueriesRequestElementInfluxModel[]);
                        break;
                    default:
                        console.error('cant load data of this export: not internal');
                        observer.complete();
                        return;
                    }
                }
                if (widget.properties.sourceType === 'device') {
                    (requestPayload[0] as QueriesRequestElementTimescaleModel).deviceId = widget.properties.device?.id;
                    (requestPayload[0] as QueriesRequestElementTimescaleModel).serviceId = widget.properties.service?.id;
                    queryMultiple();
                    o = this.exportDataService.queryTimescale(requestPayload);
                }

                o?.subscribe((pairList) => {
                    const res: SingleValueModel[] = [];
                    for (const pairs of pairList) {
                        for (const pair of pairs) {
                            let value: any = '';
                            let type = widget.properties.type || '';
                            let respDate = new Date(0);
                            if (pair.length === 0) {
                                type = 'String';
                                value = 'N/A';
                            } else {
                                value = pair[1];
                                respDate = new Date(pair[0]);
                            }
                            res.push({
                                type,
                                value,
                                date: respDate,
                            });
                        }
                    }
                    res.sort((a,b) => a.date.valueOf() - b.date.valueOf());
                    observer.next(res);
                    observer.complete();
                });
            }
        });
    }
}
