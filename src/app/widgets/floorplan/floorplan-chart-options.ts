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
import { fpCriteriaConnectionStatus, isControllingFunction, TooltipCriteria } from './shared/floorplan.model';
import { connectionLabel, markerText, tooltipValueLabel } from './shared/floorplan-markers';
import { drawMarker, drawMarkerLeader, MarkerDraw, measureMarker } from './shared/floorplan-marker-draw';
import { coversPosition, MarkerBox, stackMarkers } from './shared/floorplan-marker-layout';
import { drawZone, hasZone, ZoneDraw, zoneLabelBox, zonePoints } from './shared/floorplan-zone';

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
  /** whether the map shows a moment of the replay, where no further value of the present may be mixed in */
  replaying(): boolean;
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
              // the further criteria carry the value of the present, which next to a replayed one reads as that moment's
              (host.replaying() || placement === undefined ? [] : placement.tooltipCriteria || []).forEach(c => {
                if (isControllingFunction(c.function_id)) {
                  // controlling criteria have no value to display, they are rendered as controls
                  return;
                }
                if (host.compareCriteriaWithoutInteraction(placement!.criteria, c)) {
                  // This criteria is selected for the placement, do not show again in tooltip
                  return;
                }
                if (c.value === undefined || c.value === null || c.value.status_code !== 200) {
                  return;
                }
                const label = c.function_id === fpCriteriaConnectionStatus
                  ? connectionLabel(c.value.message)
                  : tooltipValueLabel(c.value.message, host.unitOf(c.function_id));
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
        // the radius stays, it is the hit area of the marker; what is drawn comes from the
        // floorplanMarkers plugin, and the datasets keep the point itself transparent
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
  return [markerPlugin(host), {
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

/**
 * Draws the markers after the datasets, on the chart's own context. Drawing them here rather than as a
 * pointStyle bitmap keeps icon and text at the display's resolution, and lets the marker carry a ring
 * and a shadow that lift it off the map.
 */
function markerPlugin(host: FloorplanChartHost): Plugin<keyof ChartTypeRegistry, AnyObject> {
  return {
    id: 'floorplanMarkers',
    afterDatasetsDraw: (chart: Chart) => {
      const family = String(Chart.defaults.font.family || 'sans-serif');
      const size = host.dotSize;
      const markers: MarkerDraw[] = [];
      const zones: ZoneDraw[] = [];
      chart.data.datasets.forEach((dataset, index) => {
        if (!chart.isDatasetVisible(index)) {
          return;
        }
        // an unplaced placement keeps its dataset to hold the index, but has no point to draw at
        const element = chart.getDatasetMeta(index).data[0];
        const placement = host.widget().properties.floorplan?.placements[index];
        const icon = host.chartjs.icons[index];
        if (element === undefined || placement === undefined || icon === undefined) {
          return;
        }
        const text = markerText(placement, dataset.label || '', host.zoom(), host.chartjs.showValue[index], host.chartjs.showValueWhenZoomed[index]);
        const background = String(dataset.backgroundColor || 'grey');
        if (hasZone(placement) && host.img !== undefined) {
          // drawShift is in axis units, which start at the chart area's corner; the context draws in canvas pixels
          const points = zonePoints(placement, host.img, host.drawShift)
            .map(point => ({ x: point.x + chart.chartArea.left, y: point.y + chart.chartArea.top }));
          zones.push({ points, background, text, size, family });
          return;
        }
        markers.push({ x: element.x, y: element.y, size, background, icon, text, family });
      });
      // the areas go under the markers, and the pills of the other placements keep clear of their labels
      const occupied: MarkerBox[] = [];
      zones.forEach(zone => {
        drawZone(chart.ctx, zone);
        const box = zoneLabelBox(chart.ctx, zone);
        if (box !== undefined) {
          occupied.push(box);
        }
      });
      const boxes = markers.map(marker => ({ x: marker.x, y: marker.y, width: measureMarker(chart.ctx, marker).width, height: size }));
      const area = { top: chart.chartArea.top, bottom: chart.chartArea.bottom, left: chart.chartArea.left, right: chart.chartArea.right };
      const offsets = stackMarkers(boxes, area, occupied);
      // every leader first, so none of them is drawn over the text of a neighbouring pill
      markers.forEach((marker, index) => {
        if (!coversPosition(boxes[index], offsets[index])) {
          drawMarkerLeader(chart.ctx, marker, offsets[index]);
        }
      });
      markers.forEach((marker, index) => drawMarker(chart.ctx, marker, offsets[index]));
    },
  };
}
