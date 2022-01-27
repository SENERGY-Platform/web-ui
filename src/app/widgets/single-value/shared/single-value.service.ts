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
import { SingleValueModel } from './single-value.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { SingleValueEditDialogComponent } from '../dialog/single-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import {DBTypeEnum, ExportDataService} from '../../shared/export-data.service';
import {
    LastValuesRequestElementInfluxModel,
    QueriesRequestElementInfluxModel,
    QueriesRequestElementTimescaleModel,
    TimeValuePairModel
} from '../../shared/export-data.model';

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

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
        };
        const editDialogRef = this.dialog.open(SingleValueEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getSingleValue(widget: WidgetModel): Observable<SingleValueModel> {
        return new Observable<SingleValueModel>((observer) => {
            const m = widget.properties.measurement;
            const name = widget.properties.vAxis ? widget.properties.vAxis.Name : '';
            if (m) {
                const requestPayload: QueriesRequestElementInfluxModel | QueriesRequestElementTimescaleModel = {
                    columns: [
                        {
                            name,
                            math: widget.properties.math !== '' ? widget.properties.math : undefined,
                        },
                    ],
                };
                if (
                    widget.properties.group !== undefined &&
                    widget.properties.group.time !== '' &&
                    widget.properties.group.type !== undefined &&
                    widget.properties.group.type !== ''
                ) {
                    requestPayload.time = { last: widget.properties.group.time };
                    requestPayload.columns[0].groupType = widget.properties.group.type;
                    requestPayload.groupTime = widget.properties.group.time;
                } else {
                    requestPayload.limit = 1;
                }


                let o:  Observable<any[][]> | undefined;
                if (widget.properties.sourceType === 'export') {
                    (requestPayload as QueriesRequestElementInfluxModel).measurement = m.id;
                    (requestPayload as QueriesRequestElementTimescaleModel).exportId = m.id;
                    switch (m.dbId) {
                    case DBTypeEnum.snrgyTimescale:
                        o = this.exportDataService.queryTimescale([requestPayload]);
                        break;
                    case undefined:
                    case DBTypeEnum.snrgyInflux:
                        o = this.exportDataService.queryInflux([requestPayload] as QueriesRequestElementInfluxModel[]);
                        break;
                    default:
                        console.error('cant load data of this export: not internal');
                        observer.complete();
                        return;
                    }
                }
                if (widget.properties.sourceType === 'device') {
                    (requestPayload as QueriesRequestElementTimescaleModel).deviceId = widget.properties.device?.id;
                    (requestPayload as QueriesRequestElementTimescaleModel).serviceId = widget.properties.service?.id;
                    o = this.exportDataService.queryTimescale([requestPayload]);
                }

                o?.subscribe((pairs) => {
                    pairs = pairs[0];
                    let value: any = '';
                    let type = widget.properties.type || '';
                    if (pairs.length === 0) {
                        type = 'String';
                        value = 'N/A';
                    } else {
                        value = pairs[0][1];
                    }
                    const svm: SingleValueModel = {
                        type,
                        value,
                    };
                    observer.next(svm);
                    observer.complete();
                });
            }
        });
    }
}
