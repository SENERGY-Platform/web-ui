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

import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {GoogleChartComponent} from 'ng2-google-charts';
import {ChartsModel} from '../../shared/charts.model';
import {ElementSizeService} from '../../../../core/services/element-size.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {ChartsProcessDeploymentsService} from './shared/charts-process-deployments.service';

@Component({
    selector: 'senergy-charts-process-deployments',
    templateUrl: './charts-process-deployments.component.html',
    styleUrls: ['./charts-process-deployments.component.css'],
})
export class ChartsProcessDeploymentsComponent implements OnInit, OnDestroy {

    processDeploymentsHistory = {} as ChartsModel;
    ready = false;
    destroy = new Subscription();

    private resizeTimeout = 0;

    @ViewChild('processDeploymentsHistoryChart', {static: false}) processDeploymentsHistoryChart!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
                this.resizeTimeout = 0;
            }, 300);
        }
    }

    constructor(private chartsProcessDeploymentsService: ChartsProcessDeploymentsService,
                private elementSizeService: ElementSizeService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.getProcessInstances();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.chartsProcessDeploymentsService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.chartsProcessDeploymentsService.getProcessDeploymentHistory(this.widget.id).subscribe(
                    (processDeploymentsHistory: ChartsModel) => {
                    this.processDeploymentsHistory = processDeploymentsHistory;
                    this.ready = true;
                });
            }
        });
    }


    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id);
        if (this.processDeploymentsHistory.options !== undefined) {
            this.processDeploymentsHistory.options.height = element.height;
            this.processDeploymentsHistory.options.width = element.width;
            if (this.processDeploymentsHistory.options.chartArea) {
                this.processDeploymentsHistory.options.chartArea.height = element.heightPercentage;
                this.processDeploymentsHistory.options.chartArea.width = element.widthPercentage;
            }
            if (this.processDeploymentsHistory.dataTable[0].length > 0 ) {
                this.processDeploymentsHistoryChart.draw();
            }
        }
    }
}
