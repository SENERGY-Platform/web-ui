/*
 * Copyright 2025 InfAI (CC SES)
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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { LastValuesRequestElementInfluxModel, LastValuesRequestElementTimescaleModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { ConsumptionProfileEditComponent } from '../dialog/edit/edit.component';
import { ConsumptionProfileResponse } from './consumption-profile.model';

@Injectable({
    providedIn: 'root'
})
export class ConsumptionProfileService {

    constructor(
      private exportDataService: ExportDataService,
      private dialog: MatDialog,
      private dashboardService: DashboardService,
    ) { }

    getLatestConsumptionProfileOutput(exportID: string): Observable<ConsumptionProfileResponse> {
        const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'value',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'type',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'last_consumptions',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'time_window',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'time',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'initial_phase',
        });

        return this.exportDataService.getLastValuesTimescale(requestPayload).pipe(
            map((pairs) => {
                if (pairs.length !== 6) {
                    throw new Error('not enough data in response');
                }

                if(pairs[0].value == null) {
                    throw new Error('not enough data in response');
                }

                const lastConsumptionsStr = pairs[2].value as string;
                let lastConsumptions: any = [];
                if(lastConsumptionsStr !== '') {
                    lastConsumptions = JSON.parse(lastConsumptionsStr) as any[][];
                }

                const model: ConsumptionProfileResponse = {
                    value: pairs[0].value as boolean,
                    type: pairs[1].value as string,
                    last_consumptions: lastConsumptions,
                    time_window: pairs[3].value as any,
                    timestamp: new Date(pairs[4].value as string) as Date,
                    initial_phase: pairs[5].value as string
                };
                return model;
            })
        );
    }


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '450px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(ConsumptionProfileEditComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }
}
