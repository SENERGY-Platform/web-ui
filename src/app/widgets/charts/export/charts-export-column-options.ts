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

import { ChartConfiguration, Chart, ChartEvent, LegendElement, LegendItem, TooltipModel } from 'chart.js';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { WidgetPropertiesModels } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { chartDateLabel, chartDateLocale } from './charts-export-chartjs';

/** What the options read from the component's chart state at build time. */
export interface ChartsExportColumnChartState {
    tooltipContext: { chart: Chart; tooltip: TooltipModel<any> } | undefined;
    tooltipDisplay: string;
    tooltipDatasets: { datasetIndex: number, label: string, formattedValue: string, drawToLeft: boolean }[];
    cursorLocked: boolean;
    annotations?: AnnotationOptions[];
    minDateMs?: number;
    maxDateMs?: number;
}

export interface ChartsExportColumnOptionsHost {
    zoom: boolean;
    stacked: boolean;
    dateFormat: string;
    properties: WidgetPropertiesModels;
    chartjs: ChartsExportColumnChartState;
    updateDatasetHoverStyle: (hoveredIndex: number | null, chart: Chart) => void;
    drillable: (datasetIndex: number) => boolean;
    drillDown: (datasetIndex: number) => void;
    onLegendClick: () => (e: ChartEvent, legendItem: LegendItem, legend: LegendElement<any>) => void;
    detectChanges: () => void;
}

/** The chart.js options of the column chart; the host supplies the state and callbacks they read when an event fires. */
export function buildColumnChartOptions(host: ChartsExportColumnOptionsHost): ChartConfiguration['options'] {
    const dateFormat = host.dateFormat;
    return {
        animation: false,
        maintainAspectRatio: false,
        events: ['click', 'mousemove'],
        datasets: {
            // a bucket measured as 0 has no bar to draw, so give it a stub on the baseline
            // instead of letting it look like a bucket that has no value at all
            bar: { minBarLength: 2 },
        },
        onHover: (_, elements, chart) => {
            const hoveredIndex = elements !== undefined && elements.length > 0 ? elements[0].datasetIndex : null;
            host.updateDatasetHoverStyle(hoveredIndex, chart);
            const style = (chart.canvas?.parentNode as any)?.style;
            if (style === null) {
                return;
            }
            if (elements !== undefined && elements.length === 1 && host.drillable(elements[0].datasetIndex)) {
                style.cursor = 'pointer';
                host.chartjs.cursorLocked = true;
            } else {
                style.cursor = 'default';
                host.chartjs.cursorLocked = false;
            }
        },
        onClick: (_, elements) => {
            if (elements !== undefined && elements.length === 1 && host.drillable(elements[0].datasetIndex)) {
                host.drillDown(elements[0].datasetIndex);
            }
        },
        plugins: {
            legend: {
                display: host.zoom,
                onClick: host.onLegendClick(),
            },
            tooltip: {
                enabled: false,
                callbacks: {
                    afterBody: (tooltipItems) => {
                        host.chartjs.tooltipDatasets = tooltipItems.map(x => {
                            return {
                                datasetIndex: x.datasetIndex,
                                formattedValue: x.formattedValue,
                                label: x.dataset.label || '',
                                drawToLeft: x.dataIndex > x.dataset.data.length / 2,
                            };
                        });
                        return [];
                    }
                },
                external: (context) => {
                    if (context.tooltip.dataPoints !== undefined && context.tooltip.dataPoints.length > 0) {
                        context.tooltip.title = [chartDateLabel((context.tooltip.dataPoints[0].raw as { x: number }).x, dateFormat)];
                    }
                    host.chartjs.tooltipContext = context;
                    host.chartjs.tooltipDisplay = 'initial';
                    host.detectChanges();
                },
            },
            zoom: {
                zoom: {
                    drag: {
                        enabled: true
                    },
                    mode: 'x',
                },
            },
            annotation: {
                annotations: host.chartjs.annotations,
            },
        },
        scales: {
            'y': {
                stacked: host.stacked,
                title: {
                    text: host.properties.vAxisLabel,
                    display: (host.properties.vAxisLabel || '').length > 0,
                },
            },
            'y2': {
                stacked: host.stacked,
                position: 'right',
                title: {
                    text: host.properties.secondVAxisLabel,
                    display: (host.properties.secondVAxisLabel || '').length > 0,
                },
                display: 'auto',
            },
            'x': {
                stacked: host.stacked,
                title: {
                    text: host.properties.hAxisLabel,
                    display: (host.properties.hAxisLabel || '').length > 0,
                },
                type: 'timeseries',
                adapters: { date: { locale: chartDateLocale } },
                min: host.chartjs.minDateMs,
                max: host.chartjs.maxDateMs,
                time: {
                    displayFormats: {
                        'millisecond': dateFormat,
                        'second': dateFormat,
                        'minute': dateFormat,
                        'hour': dateFormat,
                        'day': dateFormat,
                        'week': dateFormat,
                        'month': dateFormat,
                        'quarter': dateFormat,
                        'year': dateFormat,
                    }
                }
            },
        }
    };
}
