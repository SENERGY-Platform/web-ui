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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { BaseChartDirective } from 'ng2-charts';
import { provideAppCharts } from './provide-app-charts';

@Component({
    template: '<canvas baseChart type="scatter" [data]="{ datasets: [] }"></canvas>',
    imports: [BaseChartDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
})
class ChartHostComponent {}

describe('provideAppCharts', () => {
    afterEach(() => Chart.register(zoomPlugin, annotationPlugin));

    // the floorplan draws without the charts export widget, which used to be the only one registering them
    it('registers the zoom and annotation plugins with the first chart drawn', () => {
        Chart.unregister(zoomPlugin, annotationPlugin);
        expect(() => Chart.registry.getPlugin('zoom')).toThrow();

        TestBed.configureTestingModule({ imports: [ChartHostComponent], providers: [provideAppCharts()] });
        TestBed.createComponent(ChartHostComponent).detectChanges();

        expect(Chart.registry.getPlugin('zoom')?.id).toBe('zoom');
        expect(Chart.registry.getPlugin('annotation')?.id).toBe('annotation');
    });
});
