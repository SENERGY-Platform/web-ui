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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { DeviceGatewayService } from './shared/device-gateway.service';
import { GatewayDeviceCount } from './shared/device-gateway-chart';
import { devicesPerGatewayChart } from './shared/device-gateway-chartjs';
import { FramedChartConfig } from '../../../../core/charts/google-columns';
import { googleFrame, googlePlugins } from '../../../../core/charts/google-chartjs';

@Component({
    selector: 'senergy-device-gateway',
    templateUrl: './device-gateway.component.html',
    styleUrls: ['./device-gateway.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DeviceGatewayComponent implements OnInit, OnDestroy, AfterViewInit {
    /** undefined without gateways */
    chart?: FramedChartConfig<'bar'>;
    readonly plugins = googlePlugins;
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    private counts?: GatewayDeviceCount[];
    private resizeTimeout: any;
    private resizeObserver?: ResizeObserver;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngAfterViewInit() {
        this.resizeObserver = new ResizeObserver((_ => {
            // debouncing redraws due to many resize calls
            clearTimeout(this.resizeTimeout);
            // zone.js does not patch ResizeObserver, so the redraw re-enters the zone to be change detected
            this.resizeTimeout = setTimeout(() => this.zone.run(() => this.draw()), 30);
        }));
        this.resizeObserver.observe(this.el.nativeElement);
    }

    constructor(
        private deviceGatewayService: DeviceGatewayService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private el: ElementRef,
        private zone: NgZone,
    ) { }

    ngOnInit() {
        this.getProcessInstances();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.resizeObserver?.disconnect();
        clearTimeout(this.resizeTimeout);
    }

    edit() {
        this.deviceGatewayService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.deviceGatewayService.getDevicesPerGateway().subscribe((counts: GatewayDeviceCount[]) => {
                    this.counts = counts.length === 0 ? undefined : counts;
                    this.ready = true;
                    this.refreshing = false;
                    this.draw();
                });
            }
        });
    }

    private draw() {
        if (this.counts === undefined) {
            this.chart = undefined;
            return;
        }
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 10);
        this.chart = devicesPerGatewayChart(this.counts, googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage));
    }
}
