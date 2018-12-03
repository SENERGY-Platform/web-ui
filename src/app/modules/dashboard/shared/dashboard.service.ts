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
import {DashboardNewDialogComponent} from '../dialogs/dashboard-new-dialog.component';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {catchError, map} from 'rxjs/internal/operators';
import {environment} from '../../../../environments/environment';
import {DashboardModel} from './dashboard.model';
import {Observable, Subject} from 'rxjs';
import {DashboardDeleteDialogComponent} from '../dialogs/dashboard-delete-dialog.component';
import {DashboardResponseMessageModel} from './dashboard-response-message.model';
import {WidgetModel} from './dashboard-widget.model';
import {DashboardNewWidgetDialogComponent} from '../dialogs/dashboard-new-widget-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {


    private animationDoneSubject = new Subject<string>();
    private dashSubject = new Subject<DashboardModel[]>();
    private widgetSubject = new Subject<WidgetModel>();

    currentDashboards = this.dashSubject.asObservable();
    addedWidgetObservable = this.widgetSubject.asObservable();
    initWidgetObservable = this.animationDoneSubject.asObservable();


    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    initDashboard() {
        this.getDashboards().subscribe((dash: DashboardModel[]) => {
            this.dashSubject.next(dash);
        });
    }

    getDashboards(): Observable<DashboardModel[]> {
        return this.http.get<DashboardModel[]>
        (environment.dashboardServiceUrl + '/dashboards').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', [])));
    }

    createDashboard(dashboardName: string): Observable<DashboardResponseMessageModel> {
        const dash: DashboardModel = {name: dashboardName, id: '', user_id: '', widgets: []};
        return this.http.put<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboard', dash).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', {message: 'error create'})));
    }

    deleteDashboard(dashboardId: string): Observable<DashboardResponseMessageModel> {
        return this.http.delete<DashboardResponseMessageModel>(environment.dashboardServiceUrl + '/dashboard/' + dashboardId).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'getDashboards', {message: 'error delete'})));
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


    openNewDashboardDialog(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DashboardNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((dashboardName: string) => {
            if (dashboardName !== undefined) {
                this.createDashboard(dashboardName).subscribe(() => {
                    this.initDashboard();
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
                    this.addWidgetToDashboard(widgetResp);
                });
            }
        });
    }

    addWidgetToDashboard(widget: WidgetModel): void {
        this.widgetSubject.next(widget);
    }

    openDeleteDashboardDialog(dashboardId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DashboardDeleteDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deleteDashboard: boolean) => {
            if (deleteDashboard === true) {
                this.deleteDashboard(dashboardId).subscribe(() => {
                    this.initDashboard();
                });
            }
        });
    }

    animationFinished() {
        this.animationDoneSubject.next('reloadAll');
    }

    initWidget(widgetId: string) {
        this.animationDoneSubject.next(widgetId);
    }

}
