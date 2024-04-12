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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardNewDialogComponent } from '../dialogs/dashboard-new-dialog.component';
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DashboardModel } from './dashboard.model';
import { Observable, Subject } from 'rxjs';
import { DashboardResponseMessageModel } from './dashboard-response-message.model';
import { WidgetModel, WidgetUpdatePosition } from './dashboard-widget.model';
import { DashboardNewWidgetDialogComponent } from '../dialogs/dashboard-new-widget-dialog.component';
import { DashboardWidgetManipulationModel } from './dashboard-widget-manipulation.model';
import { DashboardManipulationModel } from './dashboard-manipulation.model';
import { DashboardManipulationEnum } from './dashboard-manipulation.enum';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DashboardEditDialogComponent } from '../dialogs/dashboard-edit-dialog.component';
import { AllowedMethods, PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    private animationDoneSubject = new Subject<string>();
    private dashboardSubject = new Subject<DashboardManipulationModel>();
    private widgetSubject = new Subject<DashboardWidgetManipulationModel>();

    dashboardObservable = this.dashboardSubject.asObservable();
    dashboardWidgetObservable = this.widgetSubject.asObservable();
    initWidgetObservable = this.animationDoneSubject.asObservable();

    dashboardAuthorizations: PermissionTestResponse;
    widgetAuthorizations: PermissionTestResponse;
    widgetNameAuthorizations: PermissionTestResponse;
    widgetPositionAuthorizations: PermissionTestResponse;
    widgetPropertiesAuthorizations: PermissionTestResponse;

    constructor(
        private dialog: MatDialog,
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private dialogsService: DialogsService,
        private ladonService: LadonService
    ) {
        this.dashboardAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.dashboardServiceUrl + '/dashboards');
        this.widgetAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.dashboardServiceUrl + '/widgets');
        this.widgetNameAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.dashboardServiceUrl + '/widgets/name');
        this.widgetPositionAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.dashboardServiceUrl + '/widgets/position');
        this.widgetPropertiesAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.dashboardServiceUrl + '/widgets/properties');
    }


    /** REST Services */

    getDashboards(): Observable<DashboardModel[]> {
        return this.http.get<DashboardModel[]>(environment.dashboardServiceUrl + '/dashboards').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', [])),
        );
    }

    createDashboard(dashboardName: string, index: number): Observable<DashboardModel> {
        const dash: DashboardModel = { name: dashboardName, id: '', user_id: '', widgets: [], refresh_time: 0, index };
        return this.http
            .post<DashboardModel>(environment.dashboardServiceUrl + '/dashboards', dash)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'createDashboard', {} as DashboardModel)));
    }

    deleteDashboard(dashboardId: string): Observable<DashboardResponseMessageModel> {
        return this.http
            .delete<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboards/' + dashboardId)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'deleteDashboard', { message: 'error delete' })));
    }

    updateDashboard(dashboard: DashboardModel): Observable<DashboardModel> {
        return this.http
            .put<DashboardModel>(environment.dashboardServiceUrl + '/dashboards/' + dashboard.id, dashboard)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateDashboard', {} as DashboardModel)));
    }

    getWidget(dashboardId: string, widgetId: string): Observable<WidgetModel> {
        return this.http
            .get<WidgetModel>(environment.dashboardServiceUrl + '/widgets/' + dashboardId + '/' + widgetId)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'getWidget', {} as WidgetModel)));
    }

    createWidget(dashboardId: string, widget: WidgetModel): Observable<WidgetModel> {
        return this.http
            .post<WidgetModel>(environment.dashboardServiceUrl + '/widgets/' + dashboardId, widget)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'createWidget', {} as WidgetModel)));
    }

    deleteWidget(dashboardId: string, widgetId: string): Observable<DashboardResponseMessageModel> {
        return this.http
            .delete<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/widgets/' + dashboardId + '/' + widgetId)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'deleteWidget', { message: 'error delete' })));
    }

    updateWidgetProperty(dashboardId: string, widgetId: string, pathToProperty: string[], newValue: any): Observable<DashboardResponseMessageModel> {
        let url = environment.dashboardServiceUrl + '/widgets/properties';
        if(pathToProperty.length > 0) {
            const pathToPropertyString = pathToProperty.join('.');
            url += pathToPropertyString;
        }
        return this.http
            .patch<DashboardResponseMessageModel>(url + '/' + dashboardId  + '/' + widgetId, newValue)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetProperty', { message: 'error update' })));
    }

    updateWidgetName(dashboardId: string, widgetId: string, name: any): Observable<DashboardResponseMessageModel> {
        return this.http
            .patch<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/widgets/name/' + dashboardId  + '/' + widgetId, name)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetName', { message: 'error update' })));
    }

    updateWidgetPosition(widgetPositions: WidgetUpdatePosition[]): Observable<DashboardResponseMessageModel> {
        return this.http
            .patch<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/widgets/positions', widgetPositions)
            .pipe(catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetPosition', { message: 'error update' })));
    }

    /** Dialog Services */

    openNewDashboardDialog(nextIndex: number): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DashboardNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((dashboardName: string) => {
            if (dashboardName !== undefined) {
                this.createDashboard(dashboardName, nextIndex).subscribe((dashboard: DashboardModel) => {
                    this.manipulateDashboard(DashboardManipulationEnum.Create, dashboard.id, dashboard);
                });
            }
        });
    }

    openNewWidgetDialog(dashboardId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DashboardNewWidgetDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.createWidget(dashboardId, widget).subscribe((widgetResp) => {
                    this.manipulateWidget(DashboardManipulationEnum.Create, widgetResp.id, widgetResp);
                });
            }
        });
    }

    openDeleteDashboardDialog(dashboardId: string): void {
        this.dialogsService
            .openDeleteDialog('dashboard')
            .afterClosed()
            .subscribe((deleteDashboard: boolean) => {
                if (deleteDashboard === true) {
                    this.deleteDashboard(dashboardId).subscribe(() => {
                        this.manipulateDashboard(DashboardManipulationEnum.Delete, dashboardId, null);
                    });
                }
            });
    }

    openEditDashboardDialog(dashboard: DashboardModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            dashboard: JSON.parse(JSON.stringify(dashboard)), // create copy of object
        };
        const editDialogRef = this.dialog.open(DashboardEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((editedDashoard: DashboardModel) => {
            if (editedDashoard !== undefined) {
                this.updateDashboard(editedDashoard).subscribe((dashboardResp) => {
                    this.manipulateDashboard(DashboardManipulationEnum.Update, dashboard.id, dashboardResp);
                });
            }
        });
    }

    /** Observable services */

    manipulateWidget(manipulation: DashboardManipulationEnum, widgetId: string, widget: WidgetModel | null) {
        this.widgetSubject.next({
            manipulation,
            widgetId,
            widget,
            reloadAfterZoom: true,
            initialWidgetData: null
        });
    }

    manipulateDashboard(manipulation: DashboardManipulationEnum, dashboardId: string, dashboard: DashboardModel | null) {
        this.dashboardSubject.next({ manipulation, dashboardId, dashboard });
    }

    zoomWidget(manipulation: DashboardManipulationEnum, widgetId: string, widget: WidgetModel | null, reloadAfterZoom: boolean, initialWidgetData: any) {
        this.widgetSubject.next({ manipulation, widgetId, widget, reloadAfterZoom, initialWidgetData});
    }

    reloadAllWidgets() {
        this.animationDoneSubject.next('reloadAll');
    }

    initWidget(widgetId: string) {
        this.animationDoneSubject.next(widgetId);
    }

    userHasDeleteDashboardAuthorization(): boolean {
        return this.dashboardAuthorizations['DELETE'];
    }

    userHasUpdateDashboardAuthorization(): boolean {
        return this.dashboardAuthorizations['PUT'];
    }

    userHasCreateDashboardAuthorization(): boolean {
        return this.dashboardAuthorizations['POST'];
    }

    userHasReadDashboardAuthorization(): boolean {
        return this.dashboardAuthorizations['GET'];
    }

    userHasDeleteWidgetAuthorization(): boolean {
        return this.widgetAuthorizations['DELETE'];
    }

    userHasUpdateWidgetPropertiesAuthorization(): boolean {
        return this.widgetPropertiesAuthorizations['PATCH'];
    }

    userHasCreateWidgetAuthorization(): boolean {
        return this.widgetAuthorizations['POST'];
    }

    userHasMoveWidgetAuthorization(): boolean {
        return this.widgetAuthorizations['PATCH'];
    }

    userHasUpdateWidgetNameAuthorization(): boolean {
        return this.widgetNameAuthorizations['PATCH'];
    }
}
