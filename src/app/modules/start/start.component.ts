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

import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {DeploymentsService} from '../processes/deployments/shared/deployments.service';
import {PermissionsService} from '../permissions/shared/permissions.service';
import {MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import {StartService} from './shared/start.service';
import {StartDevicesStatusModel} from './shared/start-devices-status.model';
import {StartProcessModel} from './shared/start-process.model';
import {StartItemStatusModel} from './shared/start-item-status.model';
import {ResponsiveService} from '../../core/services/responsive.service';
import {ChartModel} from '../../core/components/chart/chart.model';
import {GoogleChartComponent} from 'ng2-google-charts';
import {ElementSizeService} from '../../core/services/element-size.service';

const gridProcesses = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 4],
    ['xl', 4],
]);

const gridDevices = new Map([
    ['xs', 2],
    ['sm', 2],
    ['md', 2],
    ['lg', 4],
    ['xl', 4],
]);


@Component({
    selector: 'senergy-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.css']
})


export class StartComponent implements OnInit {

    @ViewChild('processInstancesStatusChart') processInstancesStatusChart!: GoogleChartComponent;
    @ViewChild('processDeploymentsChart') processDeploymentsChart!: GoogleChartComponent;
    @ViewChild('devicesPerGatewayChart') devicesPerGatewayChart!: GoogleChartComponent;
    @ViewChild('devicesDowntimePerGatewayChart') devicesDowntimePerGatewayChart!: GoogleChartComponent;
    @ViewChild('devicesDowntimeTotalChart') devicesDowntimeTotalChart!: GoogleChartComponent;

    processAvailable = 0;
    processExecutable = 0;
    deviceStatus = new StartDevicesStatusModel(0, 0, 0, 0);
    latestProcesses: StartProcessModel[] = [];
    deviceDowntimeList: StartItemStatusModel[] = [];
    gridProcessesCols = 0;
    gridDevicesCols = 0;
    processInstancesStatus: ChartModel = {};
    processDeployments: ChartModel = {};
    devicesPerGateway: ChartModel = {};
    devicesDowntimePerGateway: ChartModel = {};
    devicesDowntimeTotal: ChartModel = {};
    resizeReady = true;
    date = new Date();

    private resizeTimeout = 0;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
                this.resizeProcessDeploymentsChart();
                this.resizeDevicesPerGatewayChart();
                this.resizeDevicesDowntimePerGatewayChart();
                this.resizeDevicesDowntimeTotalChart();
                this.resizeTimeout = 0;
            }, 100);
        }
    }

    constructor(private deploymentService: DeploymentsService,
                private permissionsService: PermissionsService,
                private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private startService: StartService,
                private responsiveService: ResponsiveService,
                private elementSizeService: ElementSizeService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.registerIcons();
        this.processSection();
        this.devicesSection();
    }

    private processSection(): void {
        this.deploymentService.getAll().subscribe((data: object[]) =>
            this.processExecutable = data.length);
        this.permissionsService.list('processmodel', 'r').subscribe((data: object[]) =>
            this.processAvailable = data.length);
        this.startService.getProcessInstancesStatus().subscribe((processInstancesStatus: ChartModel) =>
            this.processInstancesStatus = processInstancesStatus);
        this.startService.getProcessDeployments().subscribe((processDeployments: ChartModel) =>
            this.processDeployments = processDeployments);
    }

    private registerIcons(): void {
        this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
        this.iconRegistry.addSvgIcon('offline', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/disconnect_white.svg'));
    }

    private devicesSection(): void {
        this.startService.getDevicesStatus().subscribe((deviceStatus: StartDevicesStatusModel) =>
            this.deviceStatus = deviceStatus);
        this.startService.getLatestProcesses().subscribe((latestProcesses: StartProcessModel[]) =>
            this.latestProcesses = latestProcesses);
        this.startService.getDevicesDowntime().subscribe((deviceDowntimeList: StartItemStatusModel[]) =>
            this.deviceDowntimeList = deviceDowntimeList);
        this.startService.getDevicesPerGateway().subscribe((devicesPerGateway: ChartModel) =>
            this.devicesPerGateway = devicesPerGateway);
        this.startService.getDevicesDowntimePerGateway().subscribe((devicesDowntimePerGateway: ChartModel) =>
            this.devicesDowntimePerGateway = devicesDowntimePerGateway);
        this.startService.getTotalDowntime().subscribe((devicesDowntimeTotal: ChartModel) =>
            this.devicesDowntimeTotal = devicesDowntimeTotal);
    }

    private initGridCols(): void {
        this.setGridCols(this.responsiveService.getActiveMqAlias());
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.setGridCols(mqAlias);
        });
    }

    private setGridCols(mqAlias: string): void {
        this.gridProcessesCols = gridProcesses.get(mqAlias) || 0;
        this.gridDevicesCols = gridDevices.get(mqAlias) || 0;
    }

    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId('processInstancesStatusChartId');
        if (this.processInstancesStatus.options !== undefined) {
            this.processInstancesStatus.options.height = element.height;
            this.processInstancesStatus.options.width = element.width;
            this.processInstancesStatusChart.redraw();
        }
    }

    private resizeProcessDeploymentsChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId('processDeploymentsChartId');
        if (this.processDeployments.options !== undefined) {
            this.processDeployments.options.height = element.height;
            this.processDeployments.options.width = element.width;
            this.processDeploymentsChart.redraw();
        }
    }

    private resizeDevicesPerGatewayChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesPerGatewayChartId');
        if (this.devicesPerGateway.options !== undefined) {
            this.devicesPerGateway.options.height = element.height;
            this.devicesPerGateway.options.width = element.width;
            this.devicesPerGatewayChart.redraw();
        }
    }

    private resizeDevicesDowntimePerGatewayChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesDowntimePerGatewayChartId');
        if (this.devicesDowntimePerGateway.options !== undefined) {
            this.devicesDowntimePerGateway.options.height = element.height;
            this.devicesDowntimePerGateway.options.width = element.width;
            this.devicesDowntimePerGatewayChart.redraw();
        }
    }

    private resizeDevicesDowntimeTotalChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesDowntimeTotalChartId');
        if (this.devicesDowntimeTotal.options !== undefined) {
            this.devicesDowntimeTotal.options.height = element.height;
            this.devicesDowntimeTotal.options.width = element.width;
            this.devicesDowntimeTotalChart.redraw();
        }
    }

}

