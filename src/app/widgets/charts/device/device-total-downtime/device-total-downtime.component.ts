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
import { ChartsModel } from '../../shared/charts.model';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { DeviceTotalDowntimeService } from './shared/device-total-downtime.service';
import { ChartsService } from '../../shared/charts.service';

@Component({
    selector: 'senergy-device-total-downtime',
    templateUrl: './device-total-downtime.component.html',
    styleUrls: ['./device-total-downtime.component.css'],
})
export class DeviceTotalDowntimeComponent implements OnInit, OnDestroy, AfterViewInit {
    deviceTotalDowntime: ChartsModel | undefined;
    ready = false;
    refeshing = false;
    destroy = new Subscription();

    private resizeTimeout: any;

    @ViewChild('deviceTotalDowntimeChart', { static: false }) deviceTotalDowntimeChart!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngAfterViewInit() {
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
        private deviceDowntimeGatewayService: DeviceTotalDowntimeService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private el: ElementRef,
    ) {
    }

    ngOnInit() {
        this.getProcessInstances();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.chartsService.releaseResources(this.deviceTotalDowntimeChart);
    }

    edit() {
        this.deviceDowntimeGatewayService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refeshing = true;
                this.deviceDowntimeGatewayService.getTotalDowntime(this.widget.id).subscribe((processDeploymentsHistory: ChartsModel) => {
                    this.deviceTotalDowntime = processDeploymentsHistory;
                    setTimeout(() => this.deviceTotalDowntimeChart?.draw(), 500);
                    this.ready = true;
                }, () => {
                }, () => {
                    this.ready = true;
                    this.refeshing = false;
                });
            }
        });
    }

    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id);
        if (this.deviceTotalDowntime?.options !== undefined) {
            this.deviceTotalDowntime.options.height = element.height;
            this.deviceTotalDowntime.options.width = element.width;
            if (this.deviceTotalDowntime.options.chartArea) {
                this.deviceTotalDowntime.options.chartArea.height = element.heightPercentage;
                this.deviceTotalDowntime.options.chartArea.width = element.widthPercentage;
            }
            if (this.deviceTotalDowntime.dataTable[0].length > 0) {
                this.deviceTotalDowntimeChart.draw();
            }
        }
    }
}
