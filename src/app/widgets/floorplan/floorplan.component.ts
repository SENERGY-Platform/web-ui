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

import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog/floorplan-edit-dialog.component';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { map, Observable, Subscription, of } from 'rxjs';
import { dotSize, image } from './shared/floorplan.model';
import { DeviceCommandModel, DeviceCommandResponseModel, DeviceCommandService } from 'src/app/core/services/device-command.service';
import { Point } from '@angular/cdk/drag-drop';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { ChartConfiguration, ChartData, ChartTypeRegistry, BubbleDataPoint, Chart, TooltipModel, Plugin, ChartDataset } from 'chart.js';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';

@Component({
  selector: 'senergy-floorplan',
  templateUrl: './floorplan.component.html',
  styleUrl: './floorplan.component.css'
})
export class FloorplanComponent implements OnInit, OnDestroy {
  @Input() dashboardId = '';
  @Input() widget: WidgetModel = {} as WidgetModel;
  @Input() zoom = false;
  @Input() userHasDeleteAuthorization = false;
  @Input() userHasUpdatePropertiesAuthorization = false;
  @Input() userHasUpdateNameAuthorization = false;

  @ViewChild('imageWrapper', { static: true }) imageWrapper!: ElementRef<HTMLDivElement>;

  ready = true;
  refreshing = false;
  destroy: Subscription | undefined;
  dotSize = dotSize;
  values: DeviceCommandResponseModel[] = [];
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  img: HTMLImageElement | undefined;
  draws = 0;

  chartjs: {
    options: ChartConfiguration['options'];
    data: ChartData<keyof ChartTypeRegistry, (number | [number, number] | Point | BubbleDataPoint | null)[], unknown> | undefined;
    tooltipContext: { chart: Chart; tooltip: TooltipModel<any> } | undefined;
    tooltipDatasets: { datasetIndex: number, label: string, formattedValue: string, drawToLeft: boolean }[];
    annotations?: AnnotationOptions[];
    plugins: Plugin<keyof ChartTypeRegistry, AnyObject>[];
  } = {
      options: {
        animation: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: this.zoom,
          },
          tooltip: {
            enabled: false,
            callbacks: {
              afterBody: (tooltipItems) => {
                this.chartjs.tooltipDatasets = tooltipItems.map(x => {
                  return {
                    datasetIndex: x.datasetIndex,
                    formattedValue: x.formattedValue,
                    label: x.dataset.label || '',
                    // @ts-expect-error x axis is always defined
                    drawToLeft: (x.raw as { x: number }).x > (this.chartjs.options.scales['x'].max || 0) / 2,
                  };
                });
                return [];
              }
            },
            external: (context) => {
              if (context.tooltip.dataPoints !== undefined && context.tooltip.dataPoints.length > 0) {
                context.tooltip.title = context.tooltip.dataPoints.map(x => this.widget.properties.floorplan?.placements[x.datasetIndex].alias || '');
              }
              this.chartjs.tooltipContext = context;
              this.cd.detectChanges();
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
        }
      },
      data: undefined,
      tooltipContext: undefined,
      tooltipDatasets: [],
      plugins: [{
        id: 'customCanvasBackgroundImage',
        beforeDraw: (chart: Chart) => {

         if (this.img === undefined) {
            return false;
          }

          if (this.img.complete) {
            const ctx = chart.ctx;
            const width = chart.chartArea.width;
            const height = chart.chartArea.height;

            const hRatio = width / this.img.naturalWidth;
            const vRatio = height / this.img.naturalHeight;

            const ratio = Math.min(hRatio, vRatio);

            const centerShiftX = (width - this.img.naturalWidth * ratio) / 2;
            const centerShiftY = (height - this.img.naturalHeight * ratio) / 2;
            ctx.drawImage(this.img, 0, 0, this.img.naturalWidth, this.img.naturalHeight, centerShiftX, centerShiftY, this.img.naturalWidth * ratio, this.img.naturalHeight * ratio);

            // @ts-expect-error x axis always exists
            this.chartjs.options.scales['x'].max = width;
            // @ts-expect-error y axis always exists
            this.chartjs.options.scales['y'].max = height;
            this.drawShift = { centerShiftX: centerShiftX - chart.chartArea.left, centerShiftY: centerShiftY - chart.chartArea.top, ratio };
          } else {
            this.img.onload = () => chart.draw();
          }
          return true;
        }
      }]
    };

  constructor(
    private dialog: MatDialog,
    private dashboardService: DashboardService,
    private deviceCommandService: DeviceCommandService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.img = image(this.widget.properties);
    this.refresh().subscribe(_ => this.ready = true);
    this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
      if (event === 'reloadAll' || event === this.widget.id) {
        this.refresh().subscribe();
      }
    });
  }
  ngOnDestroy(): void {
    this.destroy?.unsubscribe();
  }

  
  draw() {
    if (this.chartjs.options?.plugins !== undefined) {
      this.chartjs.options.plugins.annotation = {
        annotations: this.chartjs.annotations,
      };
    }
    const datasets: ChartDataset[] = new Array(this.values.length - 1).fill({});
    this.values.forEach((r, i) => {
      if (this.widget.properties.floorplan === undefined || this.widget.properties.floorplan.placements === null || this.img === undefined) {
        return;
      }
      const x = (this.widget.properties.floorplan.placements[i].position.x || 0) * this.img.naturalWidth * this.drawShift.ratio + this.drawShift.centerShiftX;
      const y = (this.widget.properties.floorplan.placements[i].position.y || 0) * this.img.naturalHeight * this.drawShift.ratio + this.drawShift.centerShiftY;
      // TODO unit based on function & concept & baseCharacteristic
      // TODO color based on value
      datasets[i] = { data: [{ 'x': x, 'y': y }], label: '' + r.message, backgroundColor: 'grey' };
    });
    this.chartjs.data = { datasets };
    const chart = this.chartjsChart;
    if (chart === undefined) {
      return;
    }
    chart.resize(this.imageWrapper.nativeElement.offsetWidth, this.imageWrapper.nativeElement.offsetHeight);
    this.chartjsChart?.draw();
    this.draws++;
  }

  @HostListener('window:resize')
  onResize() {
    // TODO dots move out of position until refresh after resize
    this.draw();
  }

  private refresh(): Observable<unknown> {
    if (this.widget.properties.floorplan === undefined || this.widget.properties.floorplan.placements === null) {
      return of(null);
    }
    this.refreshing = true;
    const commands: DeviceCommandModel[] = [];
    this.widget.properties.floorplan.placements.forEach(p => commands.push({
      group_id: p.deviceGroupId || undefined,
      function_id: p.criteria.function_id,
      aspect_id: p.criteria.aspect_id,
      device_class_id: p.criteria.device_class_id,
      // TODO add input if controlling & required
    }));
    return this.deviceCommandService.runCommands(commands, true).pipe(map(res => {
      this.values = res;
      this.draw();
      this.refreshing = false;
    }));
  }

  edit() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.minWidth = '75vw';
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      widgetId: this.widget.id,
      dashboardId: this.dashboardId,
      userHasUpdateNameAuthorization: this.userHasUpdateNameAuthorization,
      userHasUpdatePropertiesAuthorization: this.userHasUpdatePropertiesAuthorization,
    };
    const editDialogRef = this.dialog.open(FloorplanEditDialogComponent, dialogConfig);

    editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
      if (widget !== undefined) {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
      }
    });
  }


  get chartjsTooltipStyle(): any {
    const o: any = {
      'top.px': (this.chartjs.tooltipContext?.chart.canvas?.offsetTop || 0) + (this.chartjs.tooltipContext?.tooltip.caretY || 0),
      'opacity': this.chartjs.tooltipContext?.tooltip.opacity || '0',
    };
    if (this.chartjs.tooltipDatasets.find(x => x.drawToLeft) !== undefined) {
      o['right.px'] = (this.chartjs.tooltipContext?.chart.width || 0) - ((this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0));
    } else {
      o['left.px'] = (this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0);
    }
    return o;
  }

  resetChartjsZoom($event: MouseEvent) {
    const chart = this.chartjsChart;
    if (chart !== undefined) {
      $event.stopPropagation();
      chart.resetZoom();
    }
  }

  get chartjsChart(): Chart | undefined {
    return Chart.getChart('chartjs-' + this.widget.id);
  }
}
