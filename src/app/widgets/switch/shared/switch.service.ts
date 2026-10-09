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

import { Injectable, inject } from '@angular/core';

import { SwitchEditDialogComponent } from '../dialogs/switch-edit-dialog.component';
import { environment } from '../../../../environments/environment';
import { forkJoin, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../modules/dashboard/shared/open-widget-edit-dialog';
import { catchError } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { SwitchPropertiesDeploymentsModel, SwitchPropertiesInstancesModel } from './switch-properties.model';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
    providedIn: 'root',
})
export class SwitchService {
    private dialog = inject(MatDialog);
    private http = inject(HttpClient);
    private dashboardService = inject(DashboardService);
    private errorHandlerService = inject(ErrorHandlerService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, SwitchEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        });
    }

    startMultipleDeployments(deployments: SwitchPropertiesDeploymentsModel[]): Observable<SwitchPropertiesInstancesModel[]> {
        const array: Observable<SwitchPropertiesInstancesModel>[] = [];
        deployments.forEach((deploy: SwitchPropertiesDeploymentsModel) => {
            array.push(
                this.http.get<SwitchPropertiesInstancesModel>(
                    environment.processServiceUrl + '/v2/deployments/' + encodeURIComponent(deploy.id) + '/start',
                ),
            );
        });

        return forkJoin(array);
    }

    stopMultipleDeployments(instances: SwitchPropertiesInstancesModel[]): Observable<string[]> {
        const array: Observable<string>[] = [];
        instances.forEach((instance: SwitchPropertiesInstancesModel) => {
            array.push(this.http.delete(environment.processServiceUrl + '/v2/process-instances/' + instance.id, { responseType: 'text' }));
        });

        return forkJoin(array).pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'stopMultipleDeployments', [])));
    }
}
