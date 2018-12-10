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

import {AfterContentChecked, Component, OnInit} from '@angular/core';
import {ResponsiveService} from '../../core/services/responsive.service';
import {DashboardService} from './shared/dashboard.service';
import {DashboardModel} from './shared/dashboard.model';
import {WidgetModel} from './shared/dashboard-widget.model';
import {DashboardWidgetManipulationModel} from './shared/dashboard-widget-manipulation.model';
import {DashboardManipulationEnum} from './shared/dashboard-manipulation.enum';
import {DashboardManipulationModel} from './shared/dashboard-manipulation.model';
import {
    DisplayGrid,
    GridsterConfig, GridsterItem, GridsterItemComponentInterface,
    GridType,
} from 'angular-gridster2';

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
    styleUrls: ['./dashboard.component.scss'],
})

export class DashboardComponent implements OnInit {

    gridCols = 0;
    dashboards: DashboardModel[] = [];
    dashboardsRetrieved = false;
    activeTabIndex = 0;
    interval = 0;
    options!: GridsterConfig;

    constructor(private responsiveService: ResponsiveService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.initDragAndDrop();
        this.initGridCols();
        this.initDashboard();
        this.initWidgets();
    }

    initAllWidgets() {
        this.dashboardService.reloadAllWidgets();
        this.refreshAllWidgets();
    }

    refreshAllWidgets() {
        clearInterval(this.interval);
        const refreshTimeInMs = this.dashboards[this.activeTabIndex].refresh_time * 1000;
        if (refreshTimeInMs > 0) {
            this.interval = setInterval(() => this.dashboardService.reloadAllWidgets(), refreshTimeInMs);
        }
    }

    openAddDashboardDialog() {
        this.dashboardService.openNewDashboardDialog();
    }

    openDeleteDashboardDialog() {
        this.dashboardService.openDeleteDashboardDialog(this.dashboards[this.activeTabIndex].id);
    }

    openAddWidgetDialog() {
        this.dashboardService.openNewWidgetDialog(this.dashboards[this.activeTabIndex].id);
    }

    setTabIndex(index: number): void {
        this.activeTabIndex = index;
    }

    refreshTime(time: number): void {
        this.dashboards[this.activeTabIndex].refresh_time = time;
        this.dashboardService.updateDashboard(this.dashboards[this.activeTabIndex]).subscribe(() => {
            this.refreshAllWidgets();
        });
    }

    private initDragAndDrop() {
        this.initDragAndDropOptions();
        if (this.options.draggable) {
            this.options.draggable.stop = () => {
                setTimeout(() => {
                    let iterate = true;
                    this.dashboards[this.activeTabIndex].widgets.forEach((widget: WidgetModel, index: number) => {
                        if (iterate) {
                            if (widget.x !== undefined && widget.y !== undefined) {
                                const gridIndex = widget.x + widget.y * 4; /** todo */
                                if (gridIndex !== index) {
                                    const swap = this.dashboards[this.activeTabIndex].widgets[index];
                                    this.dashboards[this.activeTabIndex].widgets[index] = this.dashboards[this.activeTabIndex].widgets[gridIndex];
                                    this.dashboards[this.activeTabIndex].widgets[gridIndex] = swap;
                                    this.dashboardService.updateDashboard(this.dashboards[this.activeTabIndex]).subscribe();
                                    iterate = false;
                                }
                            }
                        }
                    });
                }, 0);
            };
        }
    }

    private initDragAndDropOptions() {
        this.options = {
            gridType: GridType.VerticalFixed,
            displayGrid: DisplayGrid.Always,
            fixedRowHeight: 280,
            margin: 16,
            minCols: 4, /** todo */
            maxCols: 4, /** todo */
            maxRows: 4, /** todo */
            setGridSize: true,
            pushItems: false,
            swap: true,
            draggable: {
                ignoreContentClass: 'gridster-item-content',
                ignoreContent: true,
                dragHandleClass: 'drag-handler',
                enabled: true
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

        this.dashboardService.dashboardObservable.subscribe((dashboardManipulationModel: DashboardManipulationModel) => {
            switch (dashboardManipulationModel.manipulation) {
                case DashboardManipulationEnum.Create: {
                    this.addDashboard(dashboardManipulationModel);
                    break;
                }
                case DashboardManipulationEnum.Delete: {
                    this.deleteDashboard(dashboardManipulationModel);
                    break;
                }
            }
        });
    }

    private deleteDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        this.dashboards.forEach((dashboard: DashboardModel, index: number) => {
            if (dashboard.id === dashboardManipulationModel.dashboardId) {
                if (this.activeTabIndex > (this.dashboards.length - 2)) {
                    this.activeTabIndex = this.dashboards.length - 2;
                }
                this.dashboards.splice(index, 1);
            }
        });
    }

    private addDashboard(dashboardManipulationModel: DashboardManipulationModel) {
        this.dashboards.push(dashboardManipulationModel.dashboard || {} as DashboardModel);
        this.activeTabIndex = this.dashboards.length - 1;
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initWidgets() {
        this.dashboardService.dashboardWidgetObservable.subscribe((widgetManipulationModel: DashboardWidgetManipulationModel) => {
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
                this.dashboards[this.activeTabIndex].widgets.splice(index, 1);
            }
        });
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
}

