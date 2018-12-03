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

import {Component, OnInit} from '@angular/core';
import {ResponsiveService} from '../../core/services/responsive.service';
import {DashboardService} from './shared/dashboard.service';
import {DashboardModel} from './shared/dashboard.model';
import {WidgetModel} from './shared/dashboard-widget.model';

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
    disableAnimation = false;
    showWidgets = false;

    constructor(private responsiveService: ResponsiveService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initDashboard();
    }

    initDashboard() {
        this.dashboardService.initDashboard();
        this.dashboardService.currentDashboards.subscribe((dashboards: DashboardModel[]) => {
                this.disableAnimation = true;
                this.dashboards = dashboards;
                this.dashboardsRetrieved = true;
            }
        );
        this.addWidgets();
    }

    animationDone() {
        this.showWidgets = true;
        this.dashboardService.animationFinished();
        this.disableAnimation = false;
    }

    addDashboard() {
        this.dashboardService.openNewDashboardDialog();
    }

    deleteDashboard() {
        this.dashboardService.openDeleteDashboardDialog(this.dashboards[this.activeTabIndex].id);
    }

    addWidget() {
        this.dashboardService.openNewWidgetDialog(this.dashboards[this.activeTabIndex].id);
    }

    setTabIndex(index: number): void {
        this.showWidgets = false;
        this.activeTabIndex = index;
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private addWidgets() {
        this.dashboardService.addedWidgetObservable.subscribe((widget: WidgetModel) => {
            if (this.dashboards[this.activeTabIndex].widgets) {
                this.dashboards[this.activeTabIndex].widgets.push(widget);
            } else {
                this.dashboards[this.activeTabIndex].widgets = [widget];
            }
            setTimeout(() => this.dashboardService.initWidget(widget.id), 0);
        });
    }

}

