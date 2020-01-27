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
import {ChartsProcessInstancesService} from './shared/charts-process-instances.service';
import {ChartsModel} from '../../shared/charts.model';
import {ElementSizeService} from '../../../../core/services/element-size.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-charts-process-instances',
    templateUrl: './charts-process-instances.component.html',
    styleUrls: ['./charts-process-instances.component.css'],
})
export class ChartsProcessInstancesComponent implements OnInit, OnDestroy {

    processInstancesStatus = {} as ChartsModel;
    ready = false;
    destroy = new Subscription();

    private resizeTimeout = 0;

    @ViewChild('processInstancesStatusChart', {static: false}) processInstancesStatusChart!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    constructor(private chartsProcessInstancesService: ChartsProcessInstancesService,
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
        this.chartsProcessInstancesService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.chartsProcessInstancesService.getProcessInstancesStatus(this.widget.id).subscribe((processInstancesStatus: ChartsModel) => {
                    this.processInstancesStatus = processInstancesStatus;
                    this.ready = true;
                });
            }
        });
    }




    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id);
        if (this.processInstancesStatus.options !== undefined) {
            this.processInstancesStatus.options.height = element.height;
            this.processInstancesStatus.options.width = element.width;
            if (this.processInstancesStatus.options.chartArea) {
                this.processInstancesStatus.options.chartArea.height = element.heightPercentage;
                this.processInstancesStatus.options.chartArea.width = element.widthPercentage;
            }
            if (this.processInstancesStatus.dataTable[0].length > 0 ) {
                this.processInstancesStatusChart.draw();
            }
        }
    }
}
