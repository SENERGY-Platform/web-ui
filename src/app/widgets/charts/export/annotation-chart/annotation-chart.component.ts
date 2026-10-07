/*
 * Copyright 2026 InfAI (CC SES)
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { googleFocusPlugin } from 'src/app/core/charts/google-chartjs';
import { GoogleSeries } from 'src/app/core/charts/google-lines';
import {
    AnnotationConfig, annotationAxesPlugin, AnnotationLayout, annotationLayout, annotationLegend, annotationMainConfig, annotationNavigatorConfig,
    annotationHoverPlugin, annotationRange, dragWindow, LegendEntry,
} from './annotation-chart';

/** The zoomed line chart: legend, main chart and range navigator as Google's AnnotationChart drew them. */
@Component({
    selector: 'senergy-annotation-chart',
    templateUrl: './annotation-chart.component.html',
    styleUrls: ['./annotation-chart.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AnnotationChartComponent implements OnChanges, OnDestroy {
    @Input() series: GoogleSeries[] = [];
    /** outer size including the 1px border */
    @Input() width = 0;
    @Input() height = 0;
    /** start of the initially shown window; the window ends at the last value */
    @Input() zoomStart?: number;

    layout?: AnnotationLayout;
    main?: AnnotationConfig;
    navigator?: AnnotationConfig;
    legend: { entries: LegendEntry[]; date?: string } = { entries: [] };
    range = { min: 0, max: 1 };
    window = { from: 0, to: 1 };
    readonly mainPlugins = [annotationAxesPlugin, annotationHoverPlugin, googleFocusPlugin];
    readonly navigatorPlugins = [annotationAxesPlugin];

    @ViewChildren(BaseChartDirective) private charts?: QueryList<BaseChartDirective>;

    private drag?: { part: 'from' | 'to' | 'both'; startX: number; window: { from: number; to: number } };
    private readonly move = (event: PointerEvent) => this.onDrag(event);
    private readonly up = () => this.endDrag();

    constructor(private cd: ChangeDetectorRef) {}

    ngOnChanges(): void {
        const range = annotationRange(this.series, this.zoomStart);
        this.range = { min: range.min, max: range.max };
        this.window = { from: range.from, to: range.to };
        this.build();
    }

    ngOnDestroy(): void {
        this.endDrag();
    }

    /** Left edge of the window in the navigator, in px from its canvas. */
    position(time: number): number {
        if (this.layout === undefined) {
            return 0;
        }
        const nav = this.layout.navigator;
        return nav.left + ((time - this.range.min) / (this.range.max - this.range.min)) * (nav.right - nav.left);
    }

    startDrag(event: PointerEvent, part: 'from' | 'to' | 'both') {
        event.preventDefault();
        event.stopPropagation();
        this.drag = { part, startX: event.clientX, window: { ...this.window } };
        window.addEventListener('pointermove', this.move);
        window.addEventListener('pointerup', this.up);
    }

    private onDrag(event: PointerEvent) {
        if (this.drag === undefined || this.layout === undefined) {
            return;
        }
        this.window = dragWindow(this.drag.window, this.range, this.drag.part, event.clientX - this.drag.startX, this.layout.navigator.right - this.layout.navigator.left);
        const chart = this.mainChart();
        if (chart !== undefined && chart.options.scales?.['x'] !== undefined) {
            chart.options.scales['x'].min = this.window.from;
            chart.options.scales['x'].max = this.window.to;
            chart.update('none');
        }
        this.cd.detectChanges();
    }

    private endDrag() {
        window.removeEventListener('pointermove', this.move);
        window.removeEventListener('pointerup', this.up);
        if (this.drag !== undefined) {
            this.drag = undefined;
            this.build();
        }
    }

    private mainChart(): Chart | undefined {
        return this.charts?.first?.chart as Chart | undefined;
    }

    private build() {
        this.layout = annotationLayout(this.width, this.height);
        this.legend = annotationLegend(this.series);
        this.main = annotationMainConfig(this.series, this.layout, this.window, (x) => {
            this.legend = annotationLegend(this.series, x);
            this.cd.detectChanges();
        });
        this.navigator = annotationNavigatorConfig(this.series, this.layout, this.range);
    }
}
