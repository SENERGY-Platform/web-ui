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
import {DeviceGatewayService} from './shared/device-gateway.service';

@Component({
    selector: 'senergy-device-gateway',
    templateUrl: './device-gateway.component.html',
    styleUrls: ['./device-gateway.component.css'],
})
export class DeviceGatewayComponent implements OnInit, OnDestroy {

    deviceGateway = {} as ChartsModel;
    ready = false;
    destroy = new Subscription();

    private resizeTimeout = 0;

    @ViewChild('deviceGatewayChart', {static: false}) deviceGatewayChart!: GoogleChartComponent;
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

    constructor(private deviceGatewayService: DeviceGatewayService,
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
      this.deviceGatewayService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.deviceGatewayService.getDevicesPerGateway(this.widget.id).subscribe(
                    (processDeploymentsHistory: ChartsModel) => {
                    this.deviceGateway = processDeploymentsHistory;
                    this.ready = true;
                });
            }
        });
    }


    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 10);
        if (this.deviceGateway.options !== undefined) {
            this.deviceGateway.options.height = element.height;
            this.deviceGateway.options.width = element.width;
            if (this.deviceGateway.options.chartArea) {
                this.deviceGateway.options.chartArea.height = element.heightPercentage;
                this.deviceGateway.options.chartArea.width = element.widthPercentage;
            }
            if (this.deviceGateway.dataTable[0].length > 0 ) {
                this.deviceGatewayChart.draw();
            }
        }
    }
}
