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
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardNewDialogComponent} from '../dialogs/dashboard-new-dialog.component';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {catchError, map} from 'rxjs/internal/operators';
import {environment} from '../../../../environments/environment';
import {DashboardModel} from './dashboard.model';
import {Observable, Subject} from 'rxjs';
import {DashboardResponseMessageModel} from './dashboard-response-message.model';
import {WidgetModel} from './dashboard-widget.model';
import {DashboardNewWidgetDialogComponent} from '../dialogs/dashboard-new-widget-dialog.component';
import {DashboardWidgetManipulationModel} from './dashboard-widget-manipulation.model';
import {DashboardManipulationModel} from './dashboard-manipulation.model';
import {DashboardManipulationEnum} from './dashboard-manipulation.enum';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DashboardEditDialogComponent} from '../dialogs/dashboard-edit-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {


    private animationDoneSubject = new Subject<string>();
    private dashboardSubject = new Subject<DashboardManipulationModel>();
    private widgetSubject = new Subject<DashboardWidgetManipulationModel>();

    dashboardObservable = this.dashboardSubject.asObservable();
    dashboardWidgetObservable = this.widgetSubject.asObservable();
    initWidgetObservable = this.animationDoneSubject.asObservable();


    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialogsService: DialogsService) {
    }

    /** REST Services */

    getDashboards(): Observable<DashboardModel[]> {
        return this.http.get<DashboardModel[]>
        (environment.dashboardServiceUrl + '/dashboards').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', [])));
    }

    createDashboard(dashboardName: string): Observable<DashboardModel> {
        const dash: DashboardModel = {name: dashboardName, id: '', user_id: '', widgets: [], refresh_time: 0};
        return this.http.put<DashboardModel>(environment.dashboardServiceUrl + '/dashboard', dash).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', {} as DashboardModel)));
    }

    deleteDashboard(dashboardId: string): Observable<DashboardResponseMessageModel> {
        return this.http.delete<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboard/' + dashboardId).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', {message: 'error delete'})));
    }

    updateDashboard(dashboard: DashboardModel): Observable<DashboardModel> {
        return this.http.post<DashboardModel>(environment.dashboardServiceUrl + '/dashboard', dashboard).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', {} as DashboardModel)));
    }

    getWidget(dashboardId: string, widgetId: string): Observable<WidgetModel> {
        return this.http.get<WidgetModel>
        (environment.dashboardServiceUrl + '/dashboard/' + dashboardId + '/widget/' + widgetId).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getWidget', {} as WidgetModel)));
    }

    createWidget(dashboardId: string, widget: WidgetModel): Observable<WidgetModel> {
        return this.http.put<WidgetModel>(environment.dashboardServiceUrl + '/dashboard/' + dashboardId + '/widget', widget).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'createWidget', {} as WidgetModel)));
    }

    deleteWidget(dashboardId: string, widgetId: string): Observable<DashboardResponseMessageModel> {
        return this.http.delete<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboard/' + dashboardId + '/widget/' + widgetId).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'deleteWidget', {message: 'error delete'})));
    }

    updateWidget(dashboardId: string, widget: WidgetModel): Observable<DashboardResponseMessageModel> {
        return this.http.post<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboard/' + dashboardId + '/widget', widget).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidget', {message: 'error update'})));
    }

    /** Dialog Services */

    openNewDashboardDialog(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DashboardNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((dashboardName: string) => {
            if (dashboardName !== undefined) {
                this.createDashboard(dashboardName).subscribe((dashboard: DashboardModel) => {
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
        this.dialogsService.openDeleteDialog('dashboard').afterClosed().subscribe((deleteDashboard: boolean) => {
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
            dashboard: JSON.parse(JSON.stringify(dashboard))         // create copy of object
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
        this.widgetSubject.next({manipulation: manipulation, widgetId: widgetId, widget: widget});
    }

    manipulateDashboard(manipulation: DashboardManipulationEnum, dashboardId: string, dashboard: DashboardModel | null) {
        this.dashboardSubject.next({manipulation: manipulation, dashboardId: dashboardId, dashboard: dashboard});
    }

    zoomWidget(manipulation: DashboardManipulationEnum, widgetId: string, widget: WidgetModel | null) {
        this.widgetSubject.next({manipulation: manipulation, widgetId: widgetId, widget: widget});
    }

    reloadAllWidgets() {
        this.animationDoneSubject.next('reloadAll');
    }

    initWidget(widgetId: string) {
        this.animationDoneSubject.next(widgetId);
    }

}
