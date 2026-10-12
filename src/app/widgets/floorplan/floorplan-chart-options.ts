/*
 * Copyright 2025 InfAI (CC SES)
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

import { Signal } from '@angular/core';
import { Point } from '@angular/cdk/drag-drop';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { BubbleDataPoint, Chart, ChartConfiguration, ChartData, ChartTypeRegistry, Plugin, TooltipModel } from 'chart.js';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { isControllingFunction, TooltipCriteria } from './shared/floorplan.model';
import { markerText, tooltipValueLabel } from './shared/floorplan-markers';

export interface FloorplanChartState {
  options: ChartConfiguration['options'];
  data: ChartData<keyof ChartTypeRegistry, (number | [number, number] | Point | BubbleDataPoint | null)[], unknown> | undefined;
  tooltipContext: { chart: Chart; tooltip: TooltipModel<any> } | undefined;
  tooltipDatasets: { datasetIndex: number, label: string, formattedValue: string, drawToLeft: boolean }[];
  annotations?: AnnotationOptions[];
  plugins: Plugin<keyof ChartTypeRegistry, AnyObject>[];
  showValue: boolean[];
  showValueWhenZoomed: boolean[];
  icons: string[];
  tooltipCriteria: TooltipCriteria[];
  tooltipDisplay: string;
  tooltipAllowed: boolean;
}

/** What the chart callbacks read from, and write back to, the widget component. */
export interface FloorplanChartHost {
  chartjs: FloorplanChartState;
  readonly widget: Signal<WidgetModel>;
  readonly zoom: Signal<boolean>;
  img: HTMLImageElement | undefined;
  drawShift: { centerShiftX: number; centerShiftY: number; ratio: number };
  readonly dotSize: number;
  hasAction(datasetIndex: number): boolean;
  performRowAction(datasetIndex: number): void;
  unitOf(functionId: string): string | undefined;
  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string;
  compareCriteriaWithoutInteraction(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean;
}

/** The chart.js options; the callbacks look the host up when they run, so only the radius is fixed at build time. */
export function buildFloorplanChartOptions(host: FloorplanChartHost): ChartConfiguration['options'] {
  return {
  
    animation: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: host.zoom(),
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
                // @ts-expect-error x axis is always defined
                drawToLeft: (x.raw as { x: number }).x > (host.chartjs.options.scales['x'].max || 0) / 2,
              };
            });
            host.chartjs.tooltipCriteria = [];
            host.chartjs.tooltipDatasets.forEach(x => {
              const tc: TooltipCriteria = { matchDsIndex: x.datasetIndex, values: [] };
              const placement = host.widget().properties.floorplan?.placements[x.datasetIndex];
              placement?.tooltipCriteria?.forEach(c => {
                if (isControllingFunction(c.function_id)) {
                  // controlling criteria have no value to display, they are rendered as controls
                  return;
                }
                if (host.compareCriteriaWithoutInteraction(placement.criteria, c)) {
                  // This criteria is selected for the placement, do not show again in tooltip
                  return;
                }
                if (c.value === undefined || c.value === null || c.value.status_code !== 200) {
                  return;
                }
                const label = tooltipValueLabel(c.value.message, host.unitOf(c.function_id));
                tc.values.push({ label, description: host.describeCriteria(c), criteria: c });
              });
              host.chartjs.tooltipCriteria.push(tc);
            });
            return [];
          }
        },
        external: (context) => {
          if (context.tooltip.dataPoints === undefined || context.tooltip.dataPoints.length === 0) {
            // chart.js clears the tooltip as soon as the pointer sits on the tooltip instead of the
            // dot. Taking that over would empty the tooltip, hand the pointer back to the canvas and
            // show it again - the loop that makes the widget flicker. The last tooltip stays instead,
            // until the pointer leaves the widget or it is closed.
            return;
          }
          context.tooltip.title = context.tooltip.dataPoints.map(x => host.widget().properties.floorplan?.placements[x.datasetIndex].alias || '');
          host.chartjs.tooltipContext = context;
          host.chartjs.tooltipDisplay = 'initial';
        },
      },
    },
    scales: {
      'y': {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          display: false,
        },
        reverse: true,
        min: 0,
      },
      'x': {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          display: false,
        },
        min: 0,
      },
    },
    elements: {
      point: {
        radius: host.dotSize,
        hoverRadius: host.dotSize,
        pointStyle: (ctx) => {
          const def = 'circle';
          if (ctx.parsed === undefined) {
            // chart.js resolves the options of datasets without data points against a dataset context, which has no parsed values
            return def;
          }
          const dsIndex = host.chartjs.data?.datasets.findIndex(d => {
            const data = d.data[0] as { x: number, y: number } | undefined; // unplaced placements have no data
            return data?.x === ctx.parsed.x && data?.y === ctx.parsed.y;
          });
          if (dsIndex === undefined) {
            return def;
          }
          const ds = host.chartjs.data?.datasets[dsIndex];
          if (ds === undefined) {
            return def;
          }
          const placement = host.widget().properties.floorplan?.placements[dsIndex];
          if (placement === undefined) {
            return def;
          }
          const icon = host.chartjs.icons[dsIndex];
          if (icon === undefined) {
            return def;
          }
          const canvas = document.createElement('canvas');
          const size = host.dotSize;
          canvas.width = size;
          canvas.height = canvas.width;
          const canvasCtx = canvas.getContext('2d');
          if (canvasCtx == null) {
            return def;
          }
          const fontSize = canvas.width * .75 + 'px';
          canvasCtx.font = fontSize + ' Material Symbols Outlined';
          canvasCtx.textBaseline = 'middle';
          canvasCtx.textAlign = 'center';
          canvasCtx.fillStyle = ds.backgroundColor as string;


          const text = markerText(placement, ds.label || '', host.zoom(), host.chartjs.showValue[dsIndex], host.chartjs.showValueWhenZoomed[dsIndex]);

          if (text.length > 0) {
            const originWidth = canvas.width;
            const iconWidth = canvasCtx.measureText(icon).width;
            canvasCtx.font = fontSize + ' Arial';
            const right = iconWidth + canvasCtx.measureText(text).width;
            canvas.width += right;

            canvasCtx.beginPath();
            canvasCtx.arc(originWidth / 2, originWidth / 2, originWidth / 2, Math.PI * .5, Math.PI * 1.5);
            canvasCtx.lineTo(originWidth + right, 0);
            canvasCtx.arc(originWidth / 2 + right, originWidth / 2, originWidth / 2, Math.PI * 1.5, Math.PI * .5);
            canvasCtx.lineTo(0, originWidth);
            canvasCtx.fillStyle = ds.backgroundColor as string;
            canvasCtx.fill();

            canvasCtx.fillStyle = 'white';
            canvasCtx.textBaseline = 'middle';
            canvasCtx.textAlign = 'center';
            canvasCtx.font = fontSize + ' Material Symbols Outlined';
            canvasCtx.fillText(icon, originWidth / 2, originWidth / 2 + originWidth / size);

            canvasCtx.font = fontSize + ' Roboto, sans-serif';
            canvasCtx.textAlign = 'left';
            canvasCtx.fillText(text, originWidth / 2 + iconWidth, originWidth / 2 + originWidth / size);

          } else {
            canvasCtx.beginPath();
            canvasCtx.arc(canvas.width / 2, canvas.width / 2, canvas.width / 2, 0, 2 * Math.PI);
            canvasCtx.fill();

            canvasCtx.fillStyle = 'white';

            canvasCtx.fillText(icon, canvas.width / 2, canvas.width / 2 + canvas.width / size);
          }
          return canvas;
        },
      },
    },
    events: ['click', 'mousemove'],
    onHover: (_, elements, chart) => {
      const style = (chart.canvas?.parentNode as any)?.style;
      if (style === null) {
        return;
      }
      let ok = elements !== undefined && elements.length === 1;
      if (ok) {
        ok = host.hasAction(elements[0].datasetIndex);
      }
      if (ok) {
        style.cursor = 'pointer';
      } else {
        style.cursor = 'default';
      }
    },
    onClick: (_, elements) => {
      if (elements !== undefined && elements.length === 1) {
        host.performRowAction(elements[0].datasetIndex);
      }
    }
  };
}

/** Draws the floorplan image behind the dots and keeps the host's scale and shift in step with it. */
export function buildFloorplanChartPlugins(host: FloorplanChartHost): Plugin<keyof ChartTypeRegistry, AnyObject>[] {
  return [{
    id: 'customCanvasBackgroundImage',
    beforeDraw: (chart: Chart) => {

      if (host.img === undefined) {
        return false;
      }

      if (host.img.complete) {
        const ctx = chart.ctx;
        const width = chart.chartArea.width;
        const height = chart.chartArea.height;

        const hRatio = width / host.img.naturalWidth;
        const vRatio = height / host.img.naturalHeight;

        const ratio = Math.min(hRatio, vRatio);

        const centerShiftX = (width - host.img.naturalWidth * ratio) / 2;
        const centerShiftY = (height - host.img.naturalHeight * ratio) / 2;
        ctx.drawImage(host.img, 0, 0, host.img.naturalWidth, host.img.naturalHeight, centerShiftX, centerShiftY, host.img.naturalWidth * ratio, host.img.naturalHeight * ratio);

        // @ts-expect-error x axis always exists
        host.chartjs.options.scales['x'].max = width;
        // @ts-expect-error y axis always exists
        host.chartjs.options.scales['y'].max = height;
        host.drawShift = { centerShiftX: centerShiftX - chart.chartArea.left, centerShiftY: centerShiftY - chart.chartArea.top, ratio };
      } else {
        host.img.onload = () => chart.draw();
      }
      return true;
    }
  }];
}
