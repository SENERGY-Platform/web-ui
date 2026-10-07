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
import { DeviceDowntimeGatewayService } from './shared/device-downtime-gateway.service';
import { GatewayDowntime } from './shared/device-downtime-gateway-chart';
import { downtimePerGatewayChart } from './shared/device-downtime-gateway-chartjs';
import { FramedChartConfig } from '../../../../core/charts/google-columns';
import { googleFrame, googlePlugins } from '../../../../core/charts/google-chartjs';

@Component({
    selector: 'senergy-device-downtime-gateway',
    templateUrl: './device-downtime-gateway.component.html',
    styleUrls: ['./device-downtime-gateway.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DeviceDowntimeGatewayComponent implements OnInit, AfterViewInit, OnDestroy {
    /** undefined without gateways */
    chart?: FramedChartConfig<'bar'>;
    readonly plugins = googlePlugins;
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    private rows?: GatewayDowntime[];
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
        private deviceDowntimeGatewayService: DeviceDowntimeGatewayService,
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
        this.deviceDowntimeGatewayService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.deviceDowntimeGatewayService
                    .getDevicesDowntimePerGateway(this.widget)
                    .subscribe((rows: GatewayDowntime[] | undefined) => {
                        this.rows = rows;
                        this.ready = true;
                        this.refreshing = false;
                        this.draw();
                    });
            }
        });
    }

    private draw() {
        if (this.rows === undefined) {
            this.chart = undefined;
            return;
        }
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 10);
        this.chart = downtimePerGatewayChart(this.rows, googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage));
    }
}
