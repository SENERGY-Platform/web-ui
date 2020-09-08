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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {ResponsiveService} from '../../core/services/responsive.service';
import {DashboardService} from './shared/dashboard.service';
import {DashboardModel} from './shared/dashboard.model';
import {WidgetModel} from './shared/dashboard-widget.model';
import {DashboardWidgetManipulationModel} from './shared/dashboard-widget-manipulation.model';
import {DashboardManipulationEnum} from './shared/dashboard-manipulation.enum';
import {DashboardManipulationModel} from './shared/dashboard-manipulation.model';
import {DisplayGrid, GridsterConfig, GridType} from 'angular-gridster2';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {DashboardTypesEnum} from './shared/dashboard-types.enum';
import {DeviceStatusService} from '../../widgets/device-status/shared/device-status.service';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {DialogsService} from '../../core/services/dialogs.service';
import {ProcessSchedulerService} from '../../widgets/process-scheduler/shared/process-scheduler.service';
import {DataTableService} from '../../widgets/data-table/shared/data-table.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 4],
    ['xl', 4],
]);

@Component({
    selector: 'senergy-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})

export class DashboardComponent implements OnInit, OnDestroy {

    gridCols = 0;
    dashboards: DashboardModel[] = [];
    dashboardsRetrieved = false;
    activeTabIndex = 0;
    interval = 0;
    options: GridsterConfig = {};
    zoomedWidgetIndex: number | null = null;
    dashWidgetSubscription = new Subscription;
    dashSubscription = new Subscription;
    inDragMode = false;
    dragModeDisabled = false;

    constructor(private responsiveService: ResponsiveService,
                private dashboardService: DashboardService,
                private dialogsService: DialogsService,
                private processSchedulerService: ProcessSchedulerService,
                private dataTableService: DataTableService,
                private deviceStatusService: DeviceStatusService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initDashboard();
        this.initWidgets();
    }

    ngOnDestroy(): void {
        this.dashWidgetSubscription.unsubscribe();
        this.dashSubscription.unsubscribe();
        clearInterval(this.interval);
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
        this.activeTabIndex = index;
        if (this.options.api === undefined) {
            this.initDragAndDropOptions();
            this.initDragAndDrop();
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
        this.initDragAndDropOptions();
        this.initDragAndDrop();
    }

    /**
     * Swaps dashboard position with left or right neighbor and updates indices of both dashboards
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

    private initDragAndDrop() {
        if (this.options.draggable) {
            this.options.draggable.stop = () => {
                setTimeout(() => {
                    let reorder = false;
                    let swapIndex1 = 0;
                    let swapIndex2 = 0;
                    this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
                        if (reorder === false) {
                            if (widget.x !== undefined && widget.y !== undefined) {
                                const gridIndex = widget.x + widget.y * this.gridCols;
                                if (gridIndex >= this.dashboards[this.activeTabIndex].widgets.length) {
                                    reorder = true;
                                }
                                if (gridIndex !== index) {
                                    swapIndex1 = gridIndex;
                                    swapIndex2 = index;
                                }
                            }
                        }
                    });
                    if (reorder) {
                        this.reorderWidgets();
                    } else {
                        const swap = this.dashboards[this.activeTabIndex].widgets[swapIndex1];
                        this.dashboards[this.activeTabIndex].widgets[swapIndex1] =
                            this.dashboards[this.activeTabIndex].widgets[swapIndex2];
                        this.dashboards[this.activeTabIndex].widgets[swapIndex2] = swap;
                        this.dashboardService.updateDashboard(this.dashboards[this.activeTabIndex]).subscribe();
                    }
                }, 0);
            };
        }
    }

    private initDragAndDropOptions() {
        this.options = {
            gridType: GridType.VerticalFixed,
            fixedRowHeight: 280,
            outerMarginBottom: 100,
            displayGrid: DisplayGrid.None,
            minCols: this.gridCols,
            maxCols: this.gridCols,
            disableWindowResize: false,
            scrollToNewItems: false,
            disableWarnings: true,
            ignoreMarginInRow: false,
            swap: true,
            pushItems: false,
            draggable: {
                ignoreContentClass: 'gridster-item-content',
                ignoreContent: true,
                dragHandleClass: 'drag-handler',
                enabled: this.inDragMode
            },
            resizable: {
                enabled: false
            },
        };
    }

    private initDashboard() {

        this.dashboardService.getDashboards().subscribe((dashboards: DashboardModel[]) => {
                this.dashboards = dashboards;
                this.dashboardsRetrieved = true;
            }
        );

        this.dashSubscription = this.dashboardService.dashboardObservable.subscribe((dashboardManipulationModel: DashboardManipulationModel) => {
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
        });
    }

    private deleteDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        const deletionIndex = this.dashboards.findIndex(dashboard => dashboard.id === dashboardManipulationModel.dashboardId);
        if (deletionIndex !== -1) {
            if (this.activeTabIndex > (this.dashboards.length - 2)) {
                this.activeTabIndex = this.dashboards.length - 2;
            }
            if (this.dashboards[deletionIndex].widgets !== undefined) {
                this.dashboards[deletionIndex].widgets.forEach(widget => this.cleanUp(widget));
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
        this.dashboards.push(dashboardManipulationModel.dashboard || {} as DashboardModel);
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
            this.dashboards[dashIndex] = dashboardManipulationModel.dashboard || {} as DashboardModel;
        }
    }

    private initGridCols(): void {

        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.initDragAndDropOptions();
        this.initDragAndDrop();
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
            this.reorderWidgets();
            if (this.gridCols < 2) {
                this.inDragMode = false;
                this.dragModeDisabled = true;
            } else {
                this.dragModeDisabled = false;
            }
        });
    }

    private reorderWidgets() {
        this.options.maxCols = this.gridCols;
        this.options.minCols = this.gridCols;
        if (this.dashboards[this.activeTabIndex] && this.dashboards[this.activeTabIndex].widgets !== undefined) {
            this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
                widget.x = index % this.gridCols;
                widget.y = Math.floor(index / this.gridCols);
            });
            if (this.options.api && this.options.api.optionsChanged && this.options.api.resize) {
                this.options.api.optionsChanged();
                this.options.api.resize();
            }
        }
    }

    private initWidgets() {
        this.dashWidgetSubscription = this.dashboardService.dashboardWidgetObservable.subscribe((widgetManipulationModel: DashboardWidgetManipulationModel) => {
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
        });
    }

    private updateWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
            if (widget.id === widgetManipulationModel.widgetId) {
                this.dashboards[this.activeTabIndex].widgets[index] = widgetManipulationModel.widget || {} as WidgetModel;
            }
        });
        this.refreshWidget(widgetManipulationModel);
    }

    private deleteWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
            if (widget.id === widgetManipulationModel.widgetId) {
                this.cleanUp(widget);
                this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
                this.reorderWidgets();
            }
        });
    }

    private cleanUp(widget: WidgetModel): void {
        switch (widget.type) {
            case DashboardTypesEnum.DeviceStatus:
                this.deviceStatusService.deleteElements(widget.properties.elements);
                break;
            case DashboardTypesEnum.ProcessScheduler:
                this.dialogsService.openDeleteDialog('schedules created by the widget ' + widget.name).afterClosed().subscribe(yes => {
                    if (yes === true) {
                        this.processSchedulerService.deleteSchedulesByWidget(widget.id).subscribe(() => null);
                    }
                });
                break;
            case DashboardTypesEnum.DataTable:
                this.dataTableService.deleteElements(widget.properties.dataTable?.elements);
                break;
        }
    }

    private addWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.dashboards[this.activeTabIndex].widgets) {
            this.dashboards[this.activeTabIndex].widgets.push(widgetManipulationModel.widget || {} as WidgetModel);
        } else {
            this.dashboards[this.activeTabIndex].widgets = [widgetManipulationModel.widget || {} as WidgetModel];
        }
        this.refreshWidget(widgetManipulationModel);
    }

    private refreshWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
    }

    private zoomWidget(widgetManipulationModel: DashboardWidgetManipulationModel) {
        if (this.zoomedWidgetIndex === null && widgetManipulationModel.widget) {
            this.zoomedWidgetIndex = this.dashboards[this.activeTabIndex].widgets.indexOf(widgetManipulationModel.widget);
            setTimeout(() => this.dashboardService.initWidget(widgetManipulationModel.widgetId), 0);
        } else {
            this.zoomedWidgetIndex = null;
            setTimeout(() => this.dashboardService.reloadAllWidgets(), 0);
        }
    }
}

