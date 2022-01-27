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
import { EnergyPredictionColumnModel, EnergyPredictionModel } from './energy-prediction.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { EnergyPredictionEditDialogComponent } from '../dialog/energy-prediction-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { environment } from '../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { HttpClient } from '@angular/common/http';
import { ChartsExportModel } from '../../charts/export/shared/charts-export.model';
import { ChartsExportRequestPayloadModel } from '../../charts/export/shared/charts-export-request-payload.model';
import {DBTypeEnum, ExportDataService} from '../../shared/export-data.service';
import {
    LastValuesRequestElementInfluxModel,
    LastValuesRequestElementTimescaleModel,
    TimeValuePairModel
} from '../../shared/export-data.model';

@Injectable({
    providedIn: 'root',
})
export class EnergyPredictionService {
    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '450px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
        };
        const editDialogRef = this.dialog.open(EnergyPredictionEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getPrediction(widget: WidgetModel): Observable<EnergyPredictionModel> {
        return new Observable<EnergyPredictionModel>((observer) => {
            const m = widget.properties.measurement;
            const columns = widget.properties.columns || ({} as EnergyPredictionColumnModel);
            if (m) {
                const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

                requestPayload.push({
                    exportId: m.id,
                    measurement: m.id,
                    columnName: columns.prediction,
                    math: widget.properties.math,
                });
                requestPayload.push({
                    exportId: m.id,
                    measurement: m.id,
                    columnName: columns.predictionTotal,
                    math: widget.properties.math,
                });
                requestPayload.push({
                    exportId: m.id,
                    measurement: m.id,
                    columnName: columns.timestamp
                });

                let o:  Observable<TimeValuePairModel[]> | undefined;
                switch (m.dbId) {
                case DBTypeEnum.snrgyTimescale:
                    o = this.exportDataService.getLastValuesTimescale(requestPayload);
                    break;
                case undefined:
                case DBTypeEnum.snrgyInflux:
                    o = this.exportDataService.getLastValuesInflux(requestPayload as LastValuesRequestElementInfluxModel[]);
                    break;
                default:
                    console.error('cant load data of this export: not internal');
                    observer.complete();
                    return;
                }
                o.subscribe((pairs) => {
                    if (pairs.length !== 3) {
                        observer.error('incomplete result');
                        observer.complete();
                        return;
                    }
                    const model: EnergyPredictionModel = {
                        prediction: Number(pairs[0].value),
                        predictionTotal: Number(pairs[1].value),
                        timestamp: pairs[2].value as string,
                    };
                    observer.next(model);
                    observer.complete();
                });
            }
        });
    }
}
