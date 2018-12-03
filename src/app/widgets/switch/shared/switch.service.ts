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
import {MatDialog, MatDialogConfig} from '@angular/material';

import {SwitchEditDialogComponent} from '../dialogs/switch-edit-dialog.component';
import {environment} from '../../../../environments/environment';
import {forkJoin, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {catchError} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {SwitchPropertiesDeploymentsModel, SwitchPropertiesInstancesModel} from './switch-properties.model';
import {DashboardWidgetManipulationEnum} from '../../../modules/dashboard/shared/dashboard-widget-manipulation.model';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';

@Injectable({
    providedIn: 'root'
})
export class SwitchService {

    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        // dialogConfig.autoFocus = true;
        dialogConfig.disableClose = false;
        // dialogConfig.minWidth = '800px';
        // dialogConfig.minHeight = '600px';
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(SwitchEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardWidgetManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    startMultipleDeployments(deployments: SwitchPropertiesDeploymentsModel[]): Observable<SwitchPropertiesInstancesModel[]> {

        const array: Observable<SwitchPropertiesInstancesModel>[] = [];
        deployments.forEach((deploy: SwitchPropertiesDeploymentsModel) => {
            array.push(this.http.get<SwitchPropertiesInstancesModel>(environment.processServiceUrl +
                '/process-definition/' + encodeURIComponent(deploy.id) + '/start/id'));
        });

        return forkJoin(array);
    }

    stopMultipleDeployments(instances: SwitchPropertiesInstancesModel[]): Observable<string[]> {

        const array: Observable<string>[] = [];
        instances.forEach((instance: SwitchPropertiesInstancesModel) => {
            array.push(this.http.delete(environment.processServiceUrl +
                '/process-instance/' + instance.id, {responseType: 'text'}));
        });

        return forkJoin(array).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'stopMultipleDeployments', []))
        );
    }

}

