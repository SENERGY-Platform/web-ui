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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog/floorplan-edit-dialog.component';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { map, Observable, Subscription, of, forkJoin, concatMap } from 'rxjs';
import { image, migrateColoring } from './shared/floorplan.model';
import { DeviceCommandModel, DeviceCommandResponseModel, DeviceCommandService } from 'src/app/core/services/device-command.service';
import { Point } from '@angular/cdk/drag-drop';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { ChartConfiguration, ChartData, ChartTypeRegistry, BubbleDataPoint, Chart, TooltipModel, Plugin, ChartDataset } from 'chart.js';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';

@Component({
  selector: 'senergy-floorplan',
  templateUrl: './floorplan.component.html',
  styleUrl: './floorplan.component.css'
})
export class FloorplanComponent implements OnInit, OnDestroy, AfterViewInit {
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
  values: DeviceCommandResponseModel[] = [];
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  img: HTMLImageElement | undefined;
  draws = 0;
  functionIdToUnit = new Map<string, string>();

  chartjs: {
    options: ChartConfiguration['options'];
    data: ChartData<keyof ChartTypeRegistry, (number | [number, number] | Point | BubbleDataPoint | null)[], unknown> | undefined;
    tooltipContext: { chart: Chart; tooltip: TooltipModel<any> } | undefined;
    tooltipDatasets: { datasetIndex: number, label: string, formattedValue: string, drawToLeft: boolean }[];
    annotations?: AnnotationOptions[];
    plugins: Plugin<keyof ChartTypeRegistry, AnyObject>[];
    showValue: boolean[];
    showValueWhenZoomed: boolean[];
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
            radius: this.dotSize,
            hoverRadius: this.dotSize,
            pointStyle: (ctx) => {
              const def = 'circle';
              const dsIndex = this.chartjs.data?.datasets.findIndex(d => {
                const data = d.data[0] as { x: number, y: number };
                return data.x === ctx.parsed.x && data.y === ctx.parsed.y;
              });
              if (dsIndex === undefined) {
                return def;
              }
              const ds = this.chartjs.data?.datasets[dsIndex];
              if (ds === undefined) {
                return def;
              }
              const placement = this.widget.properties.floorplan?.placements[dsIndex];
              if (placement === undefined) {
                return def;
              }
              const icon = placement.icon;
              if (icon === undefined) {
                return def;
              }
              const canvas = document.createElement('canvas');
              const size = this.dotSize;
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


              if ((this.zoom && this.chartjs.showValueWhenZoomed[dsIndex]) || (!this.zoom && this.chartjs.showValue[dsIndex])) {
                const originWidth = canvas.width;
                const iconWidth = canvasCtx.measureText(icon).width;
                canvasCtx.font = fontSize + ' Arial';
                const right = iconWidth + canvasCtx.measureText(ds.label || '').width;
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
                canvasCtx.fillText(ds.label || '', originWidth / 2 + iconWidth, originWidth / 2 + originWidth / size);

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
      }],
      showValueWhenZoomed: [],
      showValue: [],
    };

  constructor(
    private dialog: MatDialog,
    private dashboardService: DashboardService,
    private deviceCommandService: DeviceCommandService,
    private cd: ChangeDetectorRef,
    private deviceGroupsService: DeviceGroupsService,
    private conceptsService: ConceptsService,
    private el: ElementRef,
  ) { }

  ngOnInit(): void {
    migrateColoring(this.widget.properties);
    this.img = image(this.widget.properties);
    const obs: Observable<unknown>[] = [];
    obs.push(this.refresh());
    const functionIds = this.widget.properties.floorplan?.placements.map(p => p.criteria.function_id);
    if (functionIds !== undefined && functionIds?.length > 0) {
      obs.push(this.deviceGroupsService.getFunctionListByIds(functionIds).pipe(
        concatMap(functions => this.conceptsService.getConceptsWithCharacteristics({ ids: functions.map(f => f.concept_id) }).pipe(map(concepts => ({ concepts, functions })))),
        map((res) => res.functions.forEach(f => {
          const concept = res.concepts.result.find(c => f.concept_id === c.id);
          if (concept === undefined) {
            return;
          }
          const displayUnit = concept.characteristics.find(c => c.id === concept.base_characteristic_id)?.display_unit;
          if (displayUnit === undefined) {
            return;
          }
          this.functionIdToUnit.set(f.id, displayUnit);
        }),
        )));
    }
    forkJoin(obs).subscribe(_ => {
      this.draw();
      this.ready = true;
    });
    this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
      if (event === 'reloadAll' || event === this.widget.id) {
        this.refresh().subscribe();
      }
    });
  }

  resizeTimeout: any = undefined;
  ngAfterViewInit() {
    const ro = new ResizeObserver((_ => {
      // debouncing redraws due to many resize calls
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.draw();
        this.cd.detectChanges();
      }, 30);
    }));
    ro.observe(this.el.nativeElement);
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
    if (this.chartjs.options?.elements?.point !== undefined) {
      this.chartjs.options.elements.point.radius = this.dotSize;
      this.chartjs.options.elements.point.hoverRadius = this.dotSize;
    }
    const datasets: ChartDataset[] = new Array(Math.max(this.values.length - 1, 0)).fill({});
    const showValue: boolean[] = [];
    const showValueWhenZoomed: boolean[] = [];
    this.values.forEach((r, i) => {
      if (this.widget.properties.floorplan === undefined || this.widget.properties.floorplan.placements === null || this.img === undefined) {
        return;
      }
      const x = (this.widget.properties.floorplan.placements[i].position.x || 0) * this.img.naturalWidth * this.drawShift.ratio + this.drawShift.centerShiftX;
      const y = (this.widget.properties.floorplan.placements[i].position.y || 0) * this.img.naturalHeight * this.drawShift.ratio + this.drawShift.centerShiftY;
      let color = 'grey';
      let zoom = false;
      let notZoom = false;
      if (!isNaN(r.message) && this.widget.properties.floorplan.placements[i].coloring !== undefined && this.widget.properties.floorplan.placements[i].coloring.length > 0) {
        color = this.widget.properties.floorplan.placements[i].coloring[0].color;
        zoom = this.widget.properties.floorplan.placements[i].coloring[0].showValueWhenZoomed;
        notZoom = this.widget.properties.floorplan.placements[i].coloring[0].showValue;
        for (let j = 1; j < this.widget.properties.floorplan.placements[i].coloring.length && r.message > this.widget.properties.floorplan.placements[i].coloring[j - 1].value; j++) {
          color = this.widget.properties.floorplan.placements[i].coloring[j].color;
          zoom = this.widget.properties.floorplan.placements[i].coloring[j].showValueWhenZoomed;
          notZoom = this.widget.properties.floorplan.placements[i].coloring[j].showValue;
        }
      }
      let label = '' + r.message;
      if (this.functionIdToUnit.has(this.widget.properties.floorplan.placements[i].criteria.function_id)) {
        label += ' ' + this.functionIdToUnit.get(this.widget.properties.floorplan.placements[i].criteria.function_id);
      }
      showValueWhenZoomed[i] = zoom;
      showValue[i] = notZoom;
      datasets[i] = { data: [{ 'x': x, 'y': y }], label, backgroundColor: color };
    });
    this.chartjs.data = { datasets };
    this.chartjs.showValueWhenZoomed = showValueWhenZoomed;
    this.chartjs.showValue = showValue;
    const chart = this.chartjsChart;
    if (chart === undefined) {
      return;
    }
    chart.resize(this.imageWrapper.nativeElement.offsetWidth, this.imageWrapper.nativeElement.offsetHeight);
    this.chartjsChart?.draw();
    this.draws++;
  }


  private refresh(): Observable<unknown> {
    if (this.widget.properties.floorplan === undefined) {
      return of(null);
    }
    this.refreshing = true;
    this.img = image(this.widget.properties);
    const commands: DeviceCommandModel[] = [];
    this.widget.properties.floorplan.placements.forEach(p => commands.push({
      group_id: p.deviceGroupId || undefined,
      function_id: p.criteria.function_id,
      aspect_id: p.criteria.aspect_id,
      device_class_id: p.criteria.device_class_id,
      // TODO add input if controlling & required
    }));
    let o: Observable<unknown> | undefined;
    if (commands.length > 0) {
      o = this.deviceCommandService.runCommands(commands, true).pipe(map(res => this.values = res));
    } else {
      o = of(null);
      this.draw();
      this.refreshing = false;
    }
    return o.pipe(map(_ => {
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

  get dotSize(): number {
    return Math.sqrt(this.el.nativeElement.clientHeight * this.el.nativeElement.clientWidth) * (this.widget.properties?.floorplan?.dotSize || 5) / 350;
  }
}
