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

import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {GoogleChartComponent} from 'ng2-google-charts';
import {ChartsModel} from '../../shared/charts.model';
import {ElementSizeService} from '../../../../core/services/element-size.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {DeviceDowntimeGatewayService} from './shared/device-downtime-gateway.service';

@Component({
    selector: 'senergy-device-downtime-gateway',
    templateUrl: './device-downtime-gateway.component.html',
    styleUrls: ['./device-downtime-gateway.component.css'],
})
export class DeviceDowntimeGatewayComponent implements OnInit, OnDestroy {

    deviceDowntimeGateway = {} as ChartsModel;
    ready = false;
    destroy = new Subscription();

    private resizeTimeout = 0;

    @ViewChild('deviceDowntimeGatewayChart', {static: false}) deviceDowntimeGatewayChart!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
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

    constructor(private deviceDowntimeGatewayService: DeviceDowntimeGatewayService,
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
        this.deviceDowntimeGatewayService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.deviceDowntimeGatewayService.getDevicesDowntimePerGateway(this.widget).subscribe(
                    (processDeploymentsHistory: ChartsModel) => {
                    this.deviceDowntimeGateway = processDeploymentsHistory;
                    this.ready = true;
                });
            }
        });
    }


    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 10);
        if (this.deviceDowntimeGateway.options !== undefined) {
            this.deviceDowntimeGateway.options.height = element.height;
            this.deviceDowntimeGateway.options.width = element.width;
            if (this.deviceDowntimeGateway.options.chartArea) {
                this.deviceDowntimeGateway.options.chartArea.height = element.heightPercentage;
                this.deviceDowntimeGateway.options.chartArea.width = element.widthPercentage;
            }
            if (this.deviceDowntimeGateway.dataTable[0].length > 0 ) {
                this.deviceDowntimeGatewayChart.draw();
            }
        }
    }
}
