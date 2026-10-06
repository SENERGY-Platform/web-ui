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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { chartCsv, CsvSeries } from './chart-csv';

/** The zoom, pan, reset and download tools the charts used to show above their top right corner. */
@Component({
    selector: 'senergy-chart-toolbar',
    templateUrl: './chart-toolbar.component.html',
    styleUrls: ['./chart-toolbar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatIconModule],
})
export class ChartToolbarComponent {
    @Input() chart?: BaseChartDirective;
    mode: 'zoom' | 'pan' = 'zoom';
    menuOpen = false;

    private get instance(): Chart | undefined {
        return this.chart?.chart as Chart | undefined;
    }

    zoomIn() {
        this.instance?.zoom(2);
    }

    zoomOut() {
        this.instance?.zoom(0.5);
    }

    setMode(mode: 'zoom' | 'pan') {
        this.mode = mode;
        const zoom = this.instance?.options.plugins?.zoom;
        if (zoom?.zoom?.drag !== undefined && zoom.pan !== undefined) {
            zoom.zoom.drag.enabled = mode === 'zoom';
            zoom.pan.enabled = mode === 'pan';
            this.instance?.update('none');
        }
    }

    reset() {
        this.instance?.resetZoom();
    }

    downloadPng() {
        const chart = this.instance;
        if (chart === undefined) {
            return;
        }
        // the canvas is transparent, the chart was always seen on white
        const canvas = document.createElement('canvas');
        canvas.width = chart.canvas.width;
        canvas.height = chart.canvas.height;
        const ctx = canvas.getContext('2d');
        if (ctx === null) {
            return;
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(chart.canvas, 0, 0);
        this.download(canvas.toDataURL('image/png'), 'chart.png');
        this.menuOpen = false;
    }

    downloadCsv() {
        const series = (this.instance?.data.datasets || []).map((d) => ({ label: String(d.label || ''), data: d.data as CsvSeries['data'] }));
        this.download('data:text/csv;charset=utf-8,' + encodeURIComponent(chartCsv(series)), 'chart.csv');
        this.menuOpen = false;
    }

    private download(href: string, fileName: string) {
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
