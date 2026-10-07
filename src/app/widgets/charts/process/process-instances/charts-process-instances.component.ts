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
import { ChartsProcessInstancesService } from './shared/charts-process-instances.service';
import { ProcessStatusCount } from './shared/charts-process-instances-chart';
import { processStatusChart } from './shared/charts-process-instances-chartjs';
import { googleFrame, googlePlugins } from '../../../../core/charts/google-chartjs';
import { googlePiePlugin } from '../../../../core/charts/google-pie';

@Component({
    selector: 'senergy-charts-process-instances',
    templateUrl: './charts-process-instances.component.html',
    styleUrls: ['./charts-process-instances.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ChartsProcessInstancesComponent implements OnInit, OnDestroy, AfterViewInit {
    /** undefined without data */
    chart?: ReturnType<typeof processStatusChart>;
    readonly plugins = [...googlePlugins, googlePiePlugin];
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    private chartData?: ProcessStatusCount[];
    private resizeObserver?: ResizeObserver;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;


    resizeTimeout: any;
    ngAfterViewInit(): void {
        // use this hook, to get the resize sizes from the correct widget
        this.resizeObserver = new ResizeObserver((_ => {
            // debouncing redraws due to many resize calls
            clearTimeout(this.resizeTimeout);
            // zone.js does not patch ResizeObserver, so the redraw re-enters the zone to be change detected
            this.resizeTimeout = setTimeout(() => this.zone.run(() => this.draw()), 30);
        }));
        this.resizeObserver.observe(this.el.nativeElement);
    }

    constructor(
        private chartsProcessInstancesService: ChartsProcessInstancesService,
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
        this.chartsProcessInstancesService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    private getProcessInstances() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.chartsProcessInstancesService
                    .getProcessInstancesStatus()
                    .subscribe((chartData: ProcessStatusCount[] | undefined) => {
                        this.chartData = chartData;
                        this.ready = true;
                        this.refreshing = false;
                        this.draw();
                    });
            }
        });
    }

    private draw() {
        if (this.chartData === undefined) {
            this.chart = undefined;
            return;
        }
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id);
        this.chart = processStatusChart(this.chartData, googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage));
    }
}
