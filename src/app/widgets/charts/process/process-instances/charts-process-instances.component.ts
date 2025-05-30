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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { GoogleChartComponent } from 'ng2-google-charts';
import { ChartsProcessInstancesService } from './shared/charts-process-instances.service';
import { ChartsModel } from '../../shared/charts.model';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { ChartsService } from '../../shared/charts.service';

@Component({
    selector: 'senergy-charts-process-instances',
    templateUrl: './charts-process-instances.component.html',
    styleUrls: ['./charts-process-instances.component.css'],
})
export class ChartsProcessInstancesComponent implements OnInit, OnDestroy, AfterViewInit {
    processInstancesStatus = {} as ChartsModel;
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    @ViewChild('processInstancesStatusChart', { static: false }) processInstancesStatusChart!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;


    resizeTimeout: any;
    ngAfterViewInit(): void {
        // use this hook, to get the resize sizes from the correct widget
        const ro = new ResizeObserver((_ => {
            // debouncing redraws due to many resize calls
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
            }, 30);
        }));
        ro.observe(this.el.nativeElement);
    }

    constructor(
        private chartsService: ChartsService,
        private chartsProcessInstancesService: ChartsProcessInstancesService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private el: ElementRef,
    ) { }

    ngOnInit() {
        this.getProcessInstances();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.chartsService.releaseResources(this.processInstancesStatusChart);
    }

    edit() {
        this.chartsProcessInstancesService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.chartsProcessInstancesService
                    .getProcessInstancesStatus(this.widget.id)
                    .subscribe((processInstancesStatus: ChartsModel) => {
                        this.processInstancesStatus = processInstancesStatus;
                        setTimeout(() => this.processInstancesStatusChart?.draw(), 500);
                        this.ready = true;
                        this.refreshing = false;
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
            if (this.processInstancesStatus.dataTable[0].length > 0) {
                this.processInstancesStatusChart.draw();
            }
        }
    }
}
