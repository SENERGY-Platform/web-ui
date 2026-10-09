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

import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { concatMap, Observable, throwError, of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from 'src/app/modules/dashboard/shared/open-widget-edit-dialog';
import { LastValuesRequestElementInfluxModel, LastValuesRequestElementTimescaleModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { PVLoadRecommendationEditComponent } from '../dialog/edit/edit.component';
import { PVLoadRecommendationResult } from './recommendation.model';

@Injectable({
    providedIn: 'root'
})
export class PvLoadService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private errorHandlerService = inject(ErrorHandlerService);
    private exportDataService = inject(ExportDataService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, PVLoadRecommendationEditComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        }, { minWidth: '450px' });
    }

    getPVLoadRecommendation(exportID: string): Observable<PVLoadRecommendationResult> {
        const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'activate_device',
        });

        return this.exportDataService.getLastValuesTimescale(requestPayload).pipe(
            concatMap((pairs) => {
                if (pairs.length !== 1) {
                    return throwError(() => new Error('Data does not match expected schema'));
                }

                if(pairs[0].value == null) {
                    return throwError(() => new Error('Result is null'));
                }

                const model: PVLoadRecommendationResult = JSON.parse(pairs[0].value as string) as PVLoadRecommendationResult;
                return of(model);
            })
        );
    }
}
