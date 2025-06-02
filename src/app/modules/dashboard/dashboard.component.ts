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

import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DashboardService } from './shared/dashboard.service';
import { DashboardModel } from './shared/dashboard.model';
import { WidgetModel, WidgetUpdatePosition } from './shared/dashboard-widget.model';
import { DashboardWidgetManipulationModel } from './shared/dashboard-widget-manipulation.model';
import { DashboardManipulationEnum } from './shared/dashboard-manipulation.enum';
import { DashboardManipulationModel } from './shared/dashboard-manipulation.model';
import { catchError, forkJoin, Observable, of, Subscription } from 'rxjs';
import { DashboardTypesEnum, dashboardTypesEnumFromString, resizable } from './shared/dashboard-types.enum';
import { DeviceStatusService } from '../../widgets/device-status/shared/device-status.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogsService } from '../../core/services/dialogs.service';
import { ProcessSchedulerService } from '../../widgets/process-scheduler/shared/process-scheduler.service';
import { DataTableService } from '../../widgets/data-table/shared/data-table.service';
import { AirQualityService } from '../../widgets/air-quality/shared/air-quality.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabGroup } from '@angular/material/tabs';
import { ChartsService } from '../../widgets/charts/shared/charts.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { elementCB, GridstackComponent } from 'gridstack/dist/angular';
import { GridStack } from 'gridstack';

@Component({
    selector: 'senergy-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
    dashboards: DashboardModel[] = [];
    dashboardsRetrieved = false;
    activeTabIndex = 0;
    interval = 0;
    zoomedWidgetIndex: number | null = null;
    dashWidgetSubscription = new Subscription();
    dashSubscription = new Subscription();
    inDragMode = false;
    dragModeDisabled = false;
    dragging = false;
    mouseHoverHeaderIndex = -1;
    @ViewChild(MatTabGroup, { static: false }) matTabGroup!: MatTabGroup;

    // Authorization
    userHasUpdateDashboardAuthorization = false;
    userHasDeleteDashboardAuthorization = false;
    userHasCreateDashboardAuthorization = false;
    userHasUpdateWidgetPropertiesAuthorization = false;
    userHasDeleteWidgetAuthorization = false;
    userHasCreateWidgetAuthorization = false;
    userHasMoveWidgetAuthorization = false;
    userHasUpdateWidgetNameAuthorization = false;

    initialWidgetData: any;

    grid: GridStack | undefined;
    @ViewChild(GridstackComponent)
    set gridstackComponent(component: GridstackComponent | undefined) {
        if (component !== undefined) {
            this.grid = GridStack.init(undefined, component.el);
            this.grid?.compact();
            this.saveWidgetPositions();
        }
    }
    resizable = resizable;
    dashboardTypesEnumFromString = dashboardTypesEnumFromString;

    constructor(
        private dashboardService: DashboardService,
        private dialogsService: DialogsService,
        private processSchedulerService: ProcessSchedulerService,
        private dataTableService: DataTableService,
        private airQualityService: AirQualityService,
        private deviceStatusService: DeviceStatusService,
        private chartsService: ChartsService,
        private route: ActivatedRoute,
        private router: Router,
        private errorHandlerService: ErrorHandlerService,
        private cd: ChangeDetectorRef,
    ) { }

    ngOnInit() {
        this.initDashboard();
        this.initWidgets();
        this.checkAuthorization();
    }

    ngOnDestroy(): void {
        this.dashWidgetSubscription.unsubscribe();
        this.dashSubscription.unsubscribe();
        clearInterval(this.interval);
    }

    checkAuthorization() {
        this.userHasUpdateDashboardAuthorization = this.dashboardService.userHasUpdateDashboardAuthorization();
        this.userHasDeleteDashboardAuthorization = this.dashboardService.userHasDeleteDashboardAuthorization();
        this.userHasCreateDashboardAuthorization = this.dashboardService.userHasCreateDashboardAuthorization();

        this.userHasUpdateWidgetPropertiesAuthorization = this.dashboardService.userHasUpdateWidgetPropertiesAuthorization();
        this.userHasUpdateWidgetNameAuthorization = this.dashboardService.userHasUpdateWidgetNameAuthorization();

        this.userHasDeleteWidgetAuthorization = this.dashboardService.userHasDeleteWidgetAuthorization();
        this.userHasCreateWidgetAuthorization = this.dashboardService.userHasCreateWidgetAuthorization();
        this.userHasMoveWidgetAuthorization = this.dashboardService.userHasMoveWidgetAuthorization();
    }

    initAllWidgets() {
        this.dashboardService.reloadAllWidgets();
        this.refreshAllWidgets();
    }

    refreshAllWidgets() {
        clearInterval(this.interval);
        const refreshTimeInMs = this.dashboards[this.activeTabIndex]?.refresh_time * 1000;
        if (refreshTimeInMs > 0) {
            this.interval = window.setInterval(() => this.dashboardService.reloadAllWidgets(), refreshTimeInMs);
        }
    }

    openAddDashboardDialog() {
        this.dashboardService.openNewDashboardDialog(this.dashboards.length);
    }

    openDeleteDashboardDialog() {
        this.dashboardService.openDeleteDashboardDialog(this.dashboards[this.activeTabIndex].id);
    }

    openEditDashboardDialog() {
        this.dashboardService.openEditDashboardDialog(this.dashboards[this.activeTabIndex]);
    }

    openAddWidgetDialog() {
        this.dashboardService.openNewWidgetDialog(this.dashboards[this.activeTabIndex].id);
    }

    setTabIndex(index: number): void {
        this.zoomedWidgetIndex = null;
        if (this.activeTabIndex !== index) {
            this.activeTabIndex = index;
            this.navigate();
        }
    }

    refreshTime(time: number): void {
        this.dashboards[this.activeTabIndex].refresh_time = time;
        this.dashboardService.updateDashboard(this.dashboards[this.activeTabIndex]).subscribe(() => {
            this.refreshAllWidgets();
        });
    }

    toggleDragMode() {
        this.inDragMode = !this.inDragMode;
    }

    /**
     * Swaps dashboard position with left or right neighbor and updates indices of both dashboards
     *
     * @param moveLeft true -> swap with left neighbor, false -> swap with right neighbor
     */
    moveDashboard(moveLeft: boolean) {
        const newIndex = moveLeft ? this.activeTabIndex - 1 : this.activeTabIndex + 1;
        if (newIndex < 0 || newIndex > this.dashboards.length - 1) {
            console.error('Cant move dashboard to position ' + newIndex);
            return;
        }
        const observables: Observable<DashboardModel>[] = [];
        let dashboard = this.dashboards[this.activeTabIndex];
        dashboard.index = newIndex;
        observables.push(this.dashboardService.updateDashboard(dashboard));
        dashboard = this.dashboards[newIndex];
        dashboard.index = this.activeTabIndex;
        observables.push(this.dashboardService.updateDashboard(dashboard));
        forkJoin(observables).subscribe(() => {
            moveItemInArray(this.dashboards, this.activeTabIndex, newIndex);
            this.setTabIndex(newIndex);
        });
    }

    startDrag() {
        this.dragging = true;
    }

    stopDrag($event: elementCB) {
        this.dragging = false;
        if (this.moveWidgetToDashboardIfNeeded($event.el, $event.event)) {
            this.grid?.compact();
            return;
        }
        this.saveWidgetPositions();
    }

    saveWidgetPositions() {
        this.grid?.compact();
        const dashboard = this.dashboards[this.activeTabIndex];
        const widgetPositionUpdates: WidgetUpdatePosition[] = [];
        const nodes = this.grid?.engine.nodes;
        if (nodes === undefined) {
            return;
        }
        dashboard.widgets?.forEach(widget => {
            const node = nodes.find(n => n.el?.id === 'gridstack-item-' + widget.id);
            if (node === undefined) {
                return;
            }
            if ((node.x || 0) !== widget.x || (node.y || 0) !== widget.y || node.w !== widget.w || node.h !== widget.h) {
                widget.x = node.x || 0;
                widget.y = node.y || 0;
                widget.w = node.w;
                widget.h = node.h;
                widgetPositionUpdates.push({
                    id: widget.id,
                    x: widget.x,
                    y: widget.y,
                    w: widget.w,
                    h: widget.h,
                    dashboardDestination: dashboard.id,
                    dashboardOrigin: dashboard.id
                });
            }
        });

        if (widgetPositionUpdates.length > 0) {
            this.cd.detectChanges();
            this.dashboardService.updateWidgetPosition(widgetPositionUpdates).pipe(
                catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetPosition', { message: 'error update' }))
            ).subscribe();
        }

    }

    private initDashboard() {
        this.dashboardService.getDashboards().subscribe((dashboards: DashboardModel[]) => {
            this.dashboards = dashboards;
            this.dashboardsRetrieved = true;
            this.route.url.subscribe((url) => {
                const id = url[url.length - 1].toString();
                const idx = this.dashboards.findIndex((d) => d.id === id);
                if (idx === -1) {
                    this.setTabIndex(0);
                } else {
                    this.setTabIndex(idx);
                    const widgetId = this.route.snapshot.queryParams['zoomed_widget'];
                    if (widgetId) {
                        const widgetIndex = this.dashboards[idx].widgets?.findIndex(w => w.id === widgetId);
                        if (widgetIndex !== -1 && widgetIndex !== this.zoomedWidgetIndex) {
                            setTimeout(() => this.zoomWidget({ widgetId, widget: this.dashboards[idx].widgets[widgetIndex], manipulation: DashboardManipulationEnum.Zoom, reloadAfterZoom: true, initialWidgetData: null }), 0);
                        }
                    }
                }
            });
        });

        this.dashSubscription = this.dashboardService.dashboardObservable.subscribe(
            (dashboardManipulationModel: DashboardManipulationModel) => {
                switch (dashboardManipulationModel.manipulation) {
                    case DashboardManipulationEnum.Create: {
                        this.addDashboard(dashboardManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Delete: {
                        this.deleteDashboard(dashboardManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Update: {
                        this.updateDashboard(dashboardManipulationModel);
                        break;
                    }
                }
            },
        );
    }

    private deleteDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        const deletionIndex = this.dashboards.findIndex((dashboard) => dashboard.id === dashboardManipulationModel.dashboardId);
        if (deletionIndex !== -1) {
            if (this.activeTabIndex > this.dashboards.length - 2) {
                this.activeTabIndex = this.dashboards.length - 2;
            }
            if (this.dashboards[deletionIndex].widgets !== undefined) {
                this.dashboards[deletionIndex].widgets.forEach((widget) => this.cleanUp(widget));
            }
            const oldIndex = this.dashboards[deletionIndex].index;
            this.dashboards.splice(deletionIndex, 1);
            this.dashboards.forEach((dashboard: DashboardModel) => {
                if (dashboard.index > oldIndex) {
                    dashboard.index--;
                    // No update to backend needed, logic handled in backend too
                }
            });
        }
    }

    private addDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        this.dashboards.push(dashboardManipulationModel.dashboard || ({} as DashboardModel));
        this.activeTabIndex = this.dashboards.length - 1;
    }

    private updateDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        let dashIndex = -1;
        this.dashboards.forEach((dashboard: DashboardModel, index: number) => {
            if (dashboard.id === dashboardManipulationModel.dashboardId) {
                dashIndex = index;
            }
        });
        if (dashIndex > -1) {
            this.dashboards[dashIndex] = dashboardManipulationModel.dashboard || ({} as DashboardModel);
        }
    }

    private initWidgets() {
        this.dashWidgetSubscription = this.dashboardService.dashboardWidgetObservable.subscribe(
            (widgetManipulationModel: DashboardWidgetManipulationModel) => {
                switch (widgetManipulationModel.manipulation) {
                    case DashboardManipulationEnum.Create: {
                        this.addWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Delete: {
                        this.deleteWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Update: {
                        this.updateWidget(widgetManipulationModel);
                        break;
                    }
                    case DashboardManipulationEnum.Zoom: {
                        this.zoomWidget(widgetManipulationModel);
                        break;
                    }
                }
                this.cd.detectChanges();
                this.saveWidgetPositions();
            },
        );
    }

    private updateWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        const i = this.dashboards[this.activeTabIndex].widgets.findIndex(w => w.id === widgetManipulationModel.widgetId);
        if (i !== -1 && widgetManipulationModel.widget !== null) {
            const w = this.dashboards[this.activeTabIndex].widgets[i];
            w.name = widgetManipulationModel.widget.name;
            w.properties = widgetManipulationModel.widget.properties;
        }
        this.cd.detectChanges();
        this.refreshWidget(widgetManipulationModel);
    }

    private deleteWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
            if (widget.id === widgetManipulationModel.widgetId) {
                this.cleanUp(widget);
                this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
            }
        });
        this.grid?.removeWidget('gridstack-item-' + widgetManipulationModel.widgetId);
    }

    private cleanUp(widget: WidgetModel): void {
        switch (widget.type) {
            case DashboardTypesEnum.DeviceStatus:
                this.deviceStatusService.deleteElements(widget.properties.elements);
                break;
            case DashboardTypesEnum.ProcessScheduler:
                this.dialogsService
                    .openDeleteDialog('schedules created by the widget ' + widget.name)
                    .afterClosed()
                    .subscribe((yes) => {
                        if (yes === true) {
                            this.processSchedulerService.deleteSchedulesByWidget(widget.id).subscribe(() => null);
                        }
                    });
                break;
            case DashboardTypesEnum.DataTable:
                this.dataTableService.deleteElements(widget.properties.dataTable?.elements);
                break;
            case DashboardTypesEnum.AirQuality:
                this.airQualityService.cleanGeneratedContent(widget.properties);
                break;
            case DashboardTypesEnum.AcControl:
            case DashboardTypesEnum.ChartExport:
                this.chartsService.cleanup(widget);
                break;
        }
    }

    private addWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.dashboards[this.activeTabIndex].widgets) {
            this.dashboards[this.activeTabIndex].widgets.push(widgetManipulationModel.widget || ({} as WidgetModel));
        } else {
            this.dashboards[this.activeTabIndex].widgets = [widgetManipulationModel.widget || ({} as WidgetModel)];
        }
        this.refreshWidget(widgetManipulationModel);
    }

    private refreshWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
    }

    private zoomWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.zoomedWidgetIndex === null && widgetManipulationModel.widget) {
            this.zoomedWidgetIndex = this.dashboards[this.activeTabIndex].widgets.indexOf(widgetManipulationModel.widget);

            if (widgetManipulationModel.reloadAfterZoom === true) {
                setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
            } else {
                this.initialWidgetData = widgetManipulationModel.initialWidgetData;
            }
        } else {
            this.zoomedWidgetIndex = null;
            setTimeout(() => this.dashboardService.reloadAllWidgets(), 0);
        }
        this.navigate();
    }

    moveWidgetToDashboard(id: string, toIndex: number): Observable<any> {
        if (toIndex < 0 || toIndex > this.dashboards.length - 1) {
            console.error('Invalid index ' + toIndex);
            return of(null);
        }
        if (toIndex === this.activeTabIndex) {
            console.error('Invalid index ' + toIndex + '. Widget already on this dashboard.');
            return of(null);
        }
        const index = this.dashboards[this.activeTabIndex].widgets.findIndex((widget) => widget.id === id);
        if (index === -1) {
            console.error('Can\'t find widget with id ' + id + ' on current dashboard');
            return of(null);
        }
        const widgets = this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
        if (widgets.length !== 1) {
            console.error('Unexpected number of widgets spliced');
            return of(null);
        }
        if (this.dashboards[toIndex].widgets === undefined) {
            this.dashboards[toIndex].widgets = [];
        }
        let x = 0;
        let y = 0;
        this.dashboards[toIndex].widgets.forEach(element => {
            if ((element.y || 0) > y) {
                y = element.y || 0;
            }
            if ((element.x || 0) > y) {
                x = element.x || 0;
            }
        });
        widgets[0].x = x + 1;
        widgets[0].y = y + 1;
        const widgetPositionUpdates: WidgetUpdatePosition[] = [{
            id,
            x: widgets[0].x,
            y: widgets[0].y,
            w: widgets[0].w,
            h: widgets[0].h,
            dashboardDestination: this.dashboards[toIndex].id,
            dashboardOrigin: this.dashboards[this.activeTabIndex].id
        }];
        this.dashboards[toIndex].widgets.push(widgets[0]);
        return this.dashboardService.updateWidgetPosition(widgetPositionUpdates).pipe(
            catchError(this.errorHandlerService.handleError(DashboardService.name, 'updateWidgetPosition', { message: 'error update' }))
        );
    }
    private moveWidgetToDashboardIfNeeded(item: any, $event: any): boolean {
        const headers = this.matTabGroup._elementRef.nativeElement.children[0].children[1].children[0].children[0].children;
        for (let i = 0; i < headers.length - 1; i++) {
            // last index is new dashboard button
            const rect: DOMRect = headers[i].getBoundingClientRect();
            if (
                i !== this.activeTabIndex &&
                $event.clientX < rect.right &&
                $event.clientX > rect.left &&
                $event.clientY > rect.top &&
                $event.clientY < rect.bottom
            ) {
                this.moveWidgetToDashboard(item.id, i).subscribe();
                this.setTabIndex(i);
                this.cd.detectChanges();
                return true;
            }
        }
        return false;
    }


    mouseEnterHeader(i: number) {
        if (this.activeTabIndex !== i) {
            this.mouseHoverHeaderIndex = i;
        }
    }

    mouseLeaveHeader() {
        this.mouseHoverHeaderIndex = -1;
    }

    private navigate() {
        const url = '/dashboard/' + this.dashboards[this.activeTabIndex].id;
        if (this.zoomedWidgetIndex !== null) {
            this.router.navigate([url], { queryParams: { zoomed_widget: this.dashboards[this.activeTabIndex].widgets[this.zoomedWidgetIndex].id } });
        } else {
            this.router.navigateByUrl(url);
        }
    }

    trackById(_: number, x: { id: string }): string {
        return x.id;
    }
}
