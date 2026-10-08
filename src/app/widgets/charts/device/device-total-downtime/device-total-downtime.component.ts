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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ChangeDetectionStrategy, NgZone, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DeviceTotalDowntimeService } from './shared/device-total-downtime.service';
import { FailureRatioInterval } from './shared/device-total-downtime-chart';
import { totalDowntimeChart } from './shared/device-total-downtime-chartjs';
import { FramedChartConfig } from '../../../../core/charts/google-columns';
import { googleFrame, googlePlugins } from '../../../../core/charts/google-chartjs';
import { Chart } from 'chart.js';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../../../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../../../components/widget-spinner/widget-spinner.component';
import { BaseChartDirective } from 'ng2-charts';
import { WidgetNoDataComponent } from '../../../../core/components/widget-no-data/widget-no-data.component';
import { WidgetFooterComponent } from '../../../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-device-total-downtime',
    templateUrl: './device-total-downtime.component.html',
    styleUrls: ['./device-total-downtime.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, BaseChartDirective, WidgetNoDataComponent, WidgetFooterComponent]
})
export class DeviceTotalDowntimeComponent implements OnInit, OnDestroy, AfterViewInit {
    private deviceDowntimeGatewayService = inject(DeviceTotalDowntimeService);
    private elementSizeService = inject(ElementSizeService);
    private dashboardService = inject(DashboardService);
    private el = inject(ElementRef);
    private zone = inject(NgZone);
    private destroyRef = inject(DestroyRef);

    /** undefined when no device has a history or loading failed */
    chart?: FramedChartConfig<'line'>;
    readonly plugins = googlePlugins;
    ready = false;
    refeshing = false;

    private intervals?: FailureRatioInterval[];
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

    ngOnInit() {
        this.getProcessInstances();
    }

    ngOnDestroy() {
        this.resizeObserver?.disconnect();
        clearTimeout(this.resizeTimeout);
    }

    edit() {
        this.deviceDowntimeGatewayService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    /** Google's explorer reset the zoom on a right click. */
    resetZoom(event: MouseEvent, canvas: HTMLCanvasElement) {
        event.preventDefault();
        Chart.getChart(canvas)?.resetZoom();
    }

    private getProcessInstances() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refeshing = true;
                this.deviceDowntimeGatewayService.getTotalDowntime().subscribe({
                    next: (intervals: FailureRatioInterval[] | undefined) => {
                        this.intervals = intervals;
                        this.draw();
                    },
                    error: () => {
                        this.intervals = undefined;
                        this.draw();
                        this.ready = true;
                        this.refeshing = false;
                    },
                    complete: () => {
                        this.ready = true;
                        this.refeshing = false;
                    },
                });
            }
        });
    }

    private draw() {
        if (this.intervals === undefined) {
            this.chart = undefined;
            return;
        }
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id);
        this.chart = totalDowntimeChart(this.intervals, googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage));
    }
}
