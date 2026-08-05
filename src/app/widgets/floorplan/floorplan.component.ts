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
import { map, Observable, Subscription, of, forkJoin, concatMap, delay } from 'rxjs';
import {
  aspectDistance,
  controlIcon,
  controlState,
  defaultVoidTogglePairs,
  DeviceGroupCriteriaWithValueModel,
  DeviceGroupWithValueModel,
  findStateSource,
  impliedControllingCriteria,
  FloorplanControlInput,
  FloorplanControlModel,
  FloorplanWidgetCapabilityModel,
  fpCriteriaConnectionStatus,
  image,
  isControllingFunction,
  isOneClickControl,
  isPlaced,
  mergeVoidToggles,
  migrateColoring,
  needsServiceGroups,
  readCommands,
  resolveControlInput,
  ServiceGroupFunctionModel,
  serviceGroupFunctions,
  StateSourceContextModel,
  TooltipCriteria,
  VoidTogglePair,
} from './shared/floorplan.model';
import { DeviceCommandModel, DeviceCommandService } from 'src/app/core/services/device-command.service';
import { Point } from '@angular/cdk/drag-drop';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { ChartConfiguration, ChartData, ChartTypeRegistry, BubbleDataPoint, Chart, TooltipModel, Plugin, ChartDataset } from 'chart.js';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceTypeAspectNodeModel, DeviceTypeFunctionModel, DeviceTypeDeviceClassModel, DeviceTypeCharacteristicsModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceClassesService } from 'src/app/modules/metadata/device-classes/shared/device-classes.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { ConnectionHistoryDialogComponent } from '../shared/connection-history-dialog/connection-history-dialog.component';
import { FloorplanControlDialogComponent, FloorplanControlDialogData } from './floorplan-control-dialog/floorplan-control-dialog.component';
import { CapabilityCommandModel } from './shared/capability-control/capability-control.component';

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
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  img: HTMLImageElement | undefined;
  draws = 0;
  functionIdToUnit = new Map<string, string>();
  /** base characteristic of the function's concept, undefined for functions without input */
  functionIdToCharacteristic = new Map<string, DeviceTypeCharacteristicsModel | undefined>();
  deviceGroups: DeviceGroupWithValueModel[] = [];
  aspects: DeviceTypeAspectNodeModel[] = [];
  functions: DeviceTypeFunctionModel[] = [];
  deviceClasses: DeviceTypeDeviceClassModel[] = [];
  unplacedRows: { index: number; alias: string; icon: string; color: string; value: string }[] = [];
  /** the controlling functions of each placement, by the same index as the datasets */
  controls: FloorplanControlModel[][] = [];
  /** functions per service group, per device type, of a device group - only loaded when it is needed */
  deviceGroupServiceGroups = new Map<string, ServiceGroupFunctionModel[][]>();
  /** controls are resolved on every redraw, so an ambiguity is only reported the first time */
  reportedAmbiguities = new Set<string>();

  /** function triples that read and switch a state without ever taking an input */
  voidTogglePairs: VoidTogglePair[] = defaultVoidTogglePairs();

  chartjs: {
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
                this.chartjs.tooltipCriteria = [];
                this.chartjs.tooltipDatasets.forEach(x => {
                  const tc: TooltipCriteria = { matchDsIndex: x.datasetIndex, values: [] };
                  const placement = this.widget.properties.floorplan?.placements[x.datasetIndex];
                  placement?.tooltipCriteria?.forEach(c => {
                    if (isControllingFunction(c.function_id)) {
                      // controlling criteria have no value to display, they are rendered as controls
                      return;
                    }
                    if (this.compareCriteriaWithoutInteraction(placement.criteria, c)) {
                      // This criteria is selected for the placement, do not show again in tooltip
                      return;
                    }
                    if (c.value === undefined || c.value === null || c.value.status_code !== 200) {
                      return;
                    }
                    let label = '' + c.value.message;
                    if (Array.isArray(c.value.message)) {
                      if (c.value.message.length > 1) {
                        label = c.value.message.join(', ');
                      } else {
                        label = c.value.message[0];
                      }
                    }
                    if (this.functionIdToUnit.has(c.function_id)) {
                      label += ' ' + this.functionIdToUnit.get(c.function_id);
                    }
                    tc.values.push({ label, description: this.describeCriteria(c), criteria: c });
                  });
                  this.chartjs.tooltipCriteria.push(tc);
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
              context.tooltip.title = context.tooltip.dataPoints.map(x => this.widget.properties.floorplan?.placements[x.datasetIndex].alias || '');
              this.chartjs.tooltipContext = context;
              this.chartjs.tooltipDisplay = 'initial';
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
              if (ctx.parsed === undefined) {
                // chart.js resolves the options of datasets without data points against a dataset context, which has no parsed values
                return def;
              }
              const dsIndex = this.chartjs.data?.datasets.findIndex(d => {
                const data = d.data[0] as { x: number, y: number } | undefined; // unplaced placements have no data
                return data?.x === ctx.parsed.x && data?.y === ctx.parsed.y;
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
              const icon = this.chartjs.icons[dsIndex];
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


              const texts: string[] = [];
              if ((this.zoom && placement.showAliasWhenZoomed) || (!this.zoom && placement.showAlias)) {
                texts.push(placement.alias);
              }
              if ((this.zoom && this.chartjs.showValueWhenZoomed[dsIndex]) || (!this.zoom && this.chartjs.showValue[dsIndex])) {
                texts.push(ds.label || '');
              }
              const text = texts.join(': ');

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
            ok = this.hasAction(elements[0].datasetIndex);
          }
          if (ok) {
            style.cursor = 'pointer';
          } else {
            style.cursor = 'default';
          }
        },
        onClick: (_, elements) => {
          if (elements !== undefined && elements.length === 1) {
            this.performRowAction(elements[0].datasetIndex);
          }
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
      }],
      showValueWhenZoomed: [],
      showValue: [],
      icons: [],
      tooltipCriteria: [],
      tooltipDisplay: 'none',
      tooltipAllowed: false,
    };

  constructor(
    private dialog: MatDialog,
    private dashboardService: DashboardService,
    private deviceCommandService: DeviceCommandService,
    private cd: ChangeDetectorRef,
    private deviceGroupsService: DeviceGroupsService,
    private conceptsService: ConceptsService,
    private deviceClassService: DeviceClassesService,
    private deviceInstancesService: DeviceInstancesService,
    private el: ElementRef,
  ) { }

  ngOnInit(): void {
    migrateColoring(this.widget.properties);
    this.img = image(this.widget.properties);
    const obs: Observable<unknown>[] = [];
    obs.push(this.deviceGroupsService.getAspectListByIds(undefined).pipe(map(a => this.aspects = a)));
    obs.push(this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').pipe(map(c => this.deviceClasses = c.result)));
    // the aspects have to be known before the first refresh, it pairs the criteria along the aspect tree
    forkJoin(obs).pipe(concatMap(_ => this.refresh())).subscribe(_ => {
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
    const datasets: ChartDataset[] = new Array(Math.max((this.widget.properties.floorplan?.placements || []).length - 1, 0)).fill({});
    const showValue: boolean[] = [];
    const showValueWhenZoomed: boolean[] = [];
    const icons: string[] = [];
    const controls: FloorplanControlModel[][] = [];
    const unplacedRows: { index: number; alias: string; icon: string; color: string; value: string }[] = [];
    this.widget.properties.floorplan?.placements.forEach((p, i) => {
      if (this.widget.properties.floorplan === undefined || this.widget.properties.floorplan.placements === null || this.img === undefined) {
        return;
      }
      const x = (this.widget.properties.floorplan.placements[i].position.x || 0) * this.img.naturalWidth * this.drawShift.ratio + this.drawShift.centerShiftX;
      const y = (this.widget.properties.floorplan.placements[i].position.y || 0) * this.img.naturalHeight * this.drawShift.ratio + this.drawShift.centerShiftY;
      let color = 'grey';
      let zoom = false;
      let notZoom = false;
      let icon = 'circle';
      let value = p.criteria.value?.message;
      if (this.widget.properties.floorplan.placements[i].coloring !== undefined && this.widget.properties.floorplan.placements[i].coloring.length > 0) {
        if (Array.isArray(value)) {
          if (value.length > 1) {
            value = value.join(', ');
          } else {
            value = value[0];
          }
        }

        if (typeof (value) === 'number' && !isNaN(value)) {
          icon = this.widget.properties.floorplan.placements[i].coloring[0].icon;
          color = this.widget.properties.floorplan.placements[i].coloring[0].color;
          zoom = this.widget.properties.floorplan.placements[i].coloring[0].showValueWhenZoomed;
          notZoom = this.widget.properties.floorplan.placements[i].coloring[0].showValue;
          for (let j = 1; j < this.widget.properties.floorplan.placements[i].coloring.length && value > (this.widget.properties.floorplan.placements[i].coloring[j - 1].value as number); j++) {
            icon = this.widget.properties.floorplan.placements[i].coloring[j].icon;
            color = this.widget.properties.floorplan.placements[i].coloring[j].color;
            zoom = this.widget.properties.floorplan.placements[i].coloring[j].showValueWhenZoomed;
            notZoom = this.widget.properties.floorplan.placements[i].coloring[j].showValue;
          }
        } else {
          const l = this.widget.properties.floorplan.placements[i].coloring.length;
          icon = this.widget.properties.floorplan.placements[i].coloring[l - 1].icon;
          color = this.widget.properties.floorplan.placements[i].coloring[l - 1].color;
          zoom = this.widget.properties.floorplan.placements[i].coloring[l - 1].showValueWhenZoomed;
          notZoom = this.widget.properties.floorplan.placements[i].coloring[l - 1].showValue;

          for (let j = 0; j < l; j++) {
            if (('' + value).match(new RegExp('' + this.widget.properties.floorplan.placements[i].coloring[j].value)) !== null) {
              icon = this.widget.properties.floorplan.placements[i].coloring[j].icon;
              color = this.widget.properties.floorplan.placements[i].coloring[j].color;
              zoom = this.widget.properties.floorplan.placements[i].coloring[j].showValueWhenZoomed;
              notZoom = this.widget.properties.floorplan.placements[i].coloring[j].showValue;
              break;
            }
          }
        }
      }
      let label = value === undefined || value === null ? '' : '' + value;
      if (label.length > 0 && this.functionIdToUnit.has(this.widget.properties.floorplan.placements[i].criteria.function_id)) {
        label += ' ' + this.functionIdToUnit.get(this.widget.properties.floorplan.placements[i].criteria.function_id);
      }
      icons[i] = icon;
      showValueWhenZoomed[i] = zoom;
      showValue[i] = notZoom;
      controls[i] = this.resolveControls(p);
      if (!isPlaced(p)) {
        // keep the dataset to preserve index alignment with the placements, but draw nothing
        datasets[i] = { data: [], label, backgroundColor: color };
        if (this.widget.properties.floorplan.showUnplacedTable) {
          unplacedRows.push({ index: i, alias: p.alias, icon, color, value: label });
        }
        return;
      }
      datasets[i] = { data: [{ 'x': x, 'y': y }], label, backgroundColor: color };
    });
    this.unplacedRows = unplacedRows;
    this.controls = controls;
    this.chartjs.data = { datasets };
    this.chartjs.icons = icons;
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
    let commands: DeviceCommandModel[] = [];
    let idsToCheckOnline: string[] = [];

    return this.loadMissingDeviceGroups().pipe(
      concatMap(_ => this.loadMissingFunctionInfo()),
      concatMap(_ => this.loadMissingServiceGroups()),
      concatMap(_ => {
      if (this.widget.properties.floorplan === undefined) {
        return of(null);
      }

      const reads = readCommands(this.widget.properties.floorplan.placements, this.stateSources());
      commands = reads.commands;
      idsToCheckOnline = reads.onlineDeviceGroupIds;
      const o: Observable<unknown>[] = [];
      if (commands.length > 0) {
        o?.push(this.deviceCommandService.runCommands(commands, true).pipe(map(res => {
          commands.forEach((com, i) => {
            // criteria differing only by interaction all report the same value
            this.deviceGroups.find(dg => dg.id === com.group_id)?.criteria
              ?.filter(crit => this.compareCriteriaWithoutInteraction(crit, com as DeviceGroupCriteriaModel))
              .forEach(crit => crit.value = res[i]);

            this.widget.properties.floorplan?.placements.forEach(p => {
              if (p.deviceGroupId !== com.group_id) {
                return;
              }

              p.tooltipCriteria?.forEach(c => {
                if (this.compareCriteriaWithoutInteraction(c, com as DeviceGroupCriteriaModel)) {
                  c.value = res[i];
                }
              });

              if (this.compareCriteriaWithoutInteraction(p.criteria, com as DeviceGroupCriteriaModel)) {
                p.criteria.value = res[i];
              }
            });
          });
        })));
      } else {
        o.push(of(null));
      }
      if (idsToCheckOnline.length > 0) {
        o.push(this.deviceInstancesService.getCurrentDeviceConnectionStatusMap(idsToCheckOnline, []).pipe(map(statusMap => {
          this.widget.properties.floorplan?.placements.forEach(p => {
              if (!statusMap.has(p.deviceGroupId || '')) {
                return;
              }

              p.tooltipCriteria?.forEach(c => {
                if (c.function_id === fpCriteriaConnectionStatus) {
                  c.value = {
                    status_code: 200,
                    message: statusMap.get(p.deviceGroupId!),
                  };
                }
              });

              if (p.criteria.function_id === fpCriteriaConnectionStatus) {
                  p.criteria.value = {
                    status_code: 200,
                    message: statusMap.get(p.deviceGroupId!),
                  };
              }
            });
        })));
      }
      return forkJoin(o).pipe(map(_1 => {
        this.draw();
        this.refreshing = false;
        this.cd.detectChanges();
      }));
    }));
  }

  /** Names a function by its display name, falling back to its name before showing the raw id */
  private describeFunction(functionId: string): string {
    const f = this.functions.find(f2 => f2.id === functionId);
    return f?.display_name || f?.name || functionId;
  }

  edit() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '75vw';
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      widgetId: this.widget.id,
      dashboardId: this.dashboardId,
      userHasUpdateNameAuthorization: this.userHasUpdateNameAuthorization,
      userHasUpdatePropertiesAuthorization: this.userHasUpdatePropertiesAuthorization,
      aspectRatio: this.imageWrapper.nativeElement.offsetWidth / this.imageWrapper.nativeElement.offsetHeight,
    };
    const editDialogRef = this.dialog.open(FloorplanEditDialogComponent, dialogConfig);

    editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
      if (widget !== undefined) {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
      }
    });
  }

  @ViewChild('chartjsTooltip') chartjsTooltipElement: ElementRef | undefined;
  get chartjsTooltipStyle(): any {
    let top = (this.chartjs.tooltipContext?.chart.canvas?.offsetTop || 0) + (this.chartjs.tooltipContext?.tooltip.caretY || 0);
    if (this.chartjsTooltipElement !== undefined) {
      const oversize = top + this.chartjsTooltipElement?.nativeElement.offsetHeight - (this.chartjs.tooltipContext?.chart.canvas?.offsetHeight || 0) + 12; // 12px as extra margin
      if (oversize > 0) {
        top -= oversize;
      }

    }
    const o: any = {
      'top.px': top,
      'display': this.chartjs.tooltipDisplay,
    };
    const offsetPx = 10;
    if (this.chartjs.tooltipDatasets.find(x => x.drawToLeft) !== undefined) {
      o['right.px'] = (this.chartjs.tooltipContext?.chart.width || 0) - ((this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0)) + offsetPx;
    } else {
      o['left.px'] = (this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0) + offsetPx;
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

  loadMissingFunctionInfo(): Observable<null> {
    const obs: Observable<any>[] = [of(null)];
    let functionIds: string[] = [];
    this.widget.properties.floorplan?.placements.forEach(p => {
      functionIds.push(p.criteria.function_id);
      functionIds.push(...(p.tooltipCriteria || []).map(c => c.function_id));
    });
    this.deviceGroups.forEach(d => {
      if (d.criteria === undefined) {
        return;
      }
      functionIds.push(...d.criteria.map(c => c.function_id));
    });
    functionIds = functionIds
      // the connection status is no real function, asking for it can fail the whole query
      .filter(fId => fId !== fpCriteriaConnectionStatus)
      .filter(fId => !this.functionIdToUnit.has(fId))
      .filter((v, i, a) => a.indexOf(v) === i);
    if (functionIds.length > 0) {
      // remember the ids that stay unresolved as well, so they are not requested on every refresh
      functionIds.forEach(fId => this.functionIdToUnit.set(fId, ''));
      obs.push(this.deviceGroupsService.getFunctionListByIds(functionIds).pipe(
        concatMap(functions => {
          this.functions.push(...functions);
          return this.conceptsService.getConceptsWithCharacteristics({ ids: functions.map(f => f.concept_id) })
            .pipe(map(concepts => ({ concepts, functions })));
        }),
        map((res) => res.functions.forEach(f => {
          const concept = res.concepts.result.find(c => f.concept_id === c.id);
          // a function without a concept takes no input and reports no unit
          const characteristic = concept?.characteristics.find(c => c.id === concept.base_characteristic_id);
          this.functionIdToCharacteristic.set(f.id, characteristic);
          this.functionIdToUnit.set(f.id, characteristic?.display_unit || '');
        }),
        )));
    }
    return forkJoin(obs).pipe(map(_ => {
      return null;
    }));
  }

  loadMissingDeviceGroups(): Observable<null> {
    const deviceGroupIds = this.widget.properties.floorplan?.placements.map(p => p.deviceGroupId).filter(dId => dId !== null).filter(dId => this.deviceGroups.find(dg => dg.id === dId) === undefined).filter((v, i, a) => a.indexOf(v) === i);
    if (deviceGroupIds !== undefined && deviceGroupIds?.length > 0) {
      return this.deviceGroupsService.getDeviceGroupListByIds(deviceGroupIds as string[], true).pipe(map(dgs => {
        dgs.forEach(dg => dg.criteria = dg.criteria?.filter((v, i, a) => a.findIndex(v2 => this.compareCriteria(v, v2)) === i));
        this.deviceGroups.push(...(dgs as DeviceGroupWithValueModel[]));
        return null;
      }));
    }
    return of(null);
  }

  compareCriteria(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return this.compareCriteriaWithoutInteraction(a, b) &&
      a.interaction === b.interaction;
  }

  compareCriteriaWithoutInteraction(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return a.function_id === b.function_id &&
      a.device_class_id === b.device_class_id &&
      a.aspect_id === b.aspect_id;
  }


  /** Names a criteria by its function, narrowed down by whichever of device class and aspect it carries */
  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    if (criteria == null) {
      return '';
    }
    return [
      this.describeFunction(criteria.function_id),
      criteria.device_class_id === '' ? '' : this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '',
      criteria.aspect_id === '' ? '' : this.aspects.find(a => a.id === criteria.aspect_id)?.name || '',
    ].filter(part => part !== '').join(' ');
  }

  /** The measuring criteria a placement displays, in the order the tooltip lists them */
  displayedCriteria(placement: FloorplanWidgetCapabilityModel): DeviceGroupCriteriaWithValueModel[] {
    return [placement.criteria, ...(placement.tooltipCriteria || [])]
      .filter(c => !isControllingFunction(c.function_id))
      .filter((c, i, a) => a.findIndex(c2 => this.compareCriteriaWithoutInteraction(c, c2)) === i);
  }

  /** The controlling criteria selected for a placement on their own */
  private selectedControllingCriteria(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel): DeviceGroupCriteriaModel[] {
    return (placement.tooltipCriteria || [])
      .filter(c => isControllingFunction(c.function_id))
      // a criteria the group lost, e.g. because a device left it, can no longer be executed
      .filter(c => (deviceGroup.criteria || []).some(c2 => this.compareCriteriaWithoutInteraction(c, c2)))
      .filter((c, i, a) => a.findIndex(c2 => this.compareCriteriaWithoutInteraction(c, c2)) === i);
  }

  /**
   * The controls of a placement. A displayed measurement that has a controlling counterpart is operated
   * through its own value, so it brings its control along; the remaining controls are the ones selected
   * on their own.
   */
  resolveControls(placement: FloorplanWidgetCapabilityModel): FloorplanControlModel[] {
    const deviceGroup = this.deviceGroups.find(dg => dg.id === placement.deviceGroupId);
    if (deviceGroup === undefined) {
      return [];
    }
    const controls: FloorplanControlModel[] = [];
    this.displayedCriteria(placement).forEach(measuring => {
      const control = this.controlVia(placement, deviceGroup, measuring);
      if (control !== undefined) {
        controls.push(control);
      }
    });
    const covered = (criteria: DeviceGroupCriteriaModel) => controls.some(c =>
      this.compareCriteriaWithoutInteraction(c.criteria, criteria) ||
      (c.offCriteria !== undefined && this.compareCriteriaWithoutInteraction(c.offCriteria, criteria)));
    const standalone = this.selectedControllingCriteria(placement, deviceGroup).filter(c => !covered(c));
    return [
      ...controls,
      ...mergeVoidToggles(standalone.map(c => this.newControl(placement, deviceGroup, c)), this.voidTogglePairs),
    ];
  }

  /** The control a displayed measurement gives access to, operated through the value shown for it */
  private controlVia(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, measuring: DeviceGroupCriteriaWithValueModel): FloorplanControlModel | undefined {
    if (measuring.function_id === fpCriteriaConnectionStatus) {
      return {
        criteria: { function_id: fpCriteriaConnectionStatus, interaction: '', aspect_id: '', device_class_id: '' },
        label: 'Connection Status', icon: 'history', input: FloorplanControlInput.Action, via: measuring,
      };
    }
    const implied = impliedControllingCriteria(measuring, this.stateSourceContext(placement, deviceGroup), this.voidTogglePairs);
    if (implied.length === 0) {
      return undefined;
    }
    // the value shown for the measurement is the state of its control, so both always agree
    const value = measuring.value?.status_code === 200 ? measuring.value.message : undefined;
    const pair = this.voidTogglePairs.find(p => p.state === measuring.function_id);
    const on = pair === undefined ? undefined : implied.find(c => c.function_id === pair.on);
    const off = pair === undefined ? undefined : implied.find(c => c.function_id === pair.off);
    if (on !== undefined && off !== undefined) {
      return {
        criteria: on, offCriteria: off, label: this.describeCriteria(measuring),
        icon: controlIcon(FloorplanControlInput.Toggle), input: FloorplanControlInput.Toggle,
        via: measuring, state: controlState(value, FloorplanControlInput.Toggle),
      };
    }
    const criteria = implied[0];
    const characteristic = this.functionIdToCharacteristic.get(criteria.function_id);
    const input = resolveControlInput(characteristic);
    return {
      criteria,
      label: this.describeCriteria(criteria),
      icon: controlIcon(input),
      input,
      characteristic,
      via: measuring,
      state: controlState(value, input),
    };
  }

  private newControl(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, criteria: DeviceGroupCriteriaModel): FloorplanControlModel {
    if (criteria.function_id === fpCriteriaConnectionStatus) {
      return { criteria, label: 'Connection Status', icon: 'history', input: FloorplanControlInput.Action };
    }
    const characteristic = this.functionIdToCharacteristic.get(criteria.function_id);
    const input = resolveControlInput(characteristic);
    const source = this.stateSourceOf(placement, deviceGroup, criteria) as DeviceGroupCriteriaWithValueModel | undefined;
    return {
      criteria,
      label: this.describeCriteria(criteria),
      icon: controlIcon(input),
      input,
      characteristic,
      state: source?.value?.status_code === 200 ? controlState(source.value.message, input) : undefined,
    };
  }

  /** The measuring criteria of the device group reporting what the control currently is set to */
  private stateSourceOf(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, criteria: DeviceGroupCriteriaModel): DeviceGroupCriteriaModel | undefined {
    const pair = this.voidTogglePairs.find(p => p.on === criteria.function_id || p.off === criteria.function_id);
    if (pair !== undefined) {
      // functions without input have no concept to pair them up, the semantic keys name their state
      return (deviceGroup.criteria || []).find(c => c.function_id === pair.state &&
        aspectDistance(c.aspect_id, criteria.aspect_id, this.aspects) !== undefined);
    }
    return findStateSource(criteria, this.stateSourceContext(placement, deviceGroup));
  }

  private stateSourceContext(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel): StateSourceContextModel {
    return {
      criteria: deviceGroup.criteria || [],
      configured: [placement.criteria, ...(placement.tooltipCriteria || [])],
      aspects: this.aspects,
      conceptOf: (functionId: string) => this.functions.find(f => f.id === functionId)?.concept_id,
      serviceGroups: this.deviceGroupServiceGroups.get(deviceGroup.id) || [],
      serviceGroupsLoaded: this.deviceGroupServiceGroups.has(deviceGroup.id),
      describe: c => this.describeCriteria(c),
      reportedAmbiguities: this.reportedAmbiguities,
    };
  }

  /**
   * The measuring criteria the controls of every placement need, so a refresh reads them too. Controls
   * reached through a displayed measurement need nothing, that value is read for the tooltip anyway.
   */
  private stateSources(): DeviceGroupCriteriaModel[][] {
    return (this.widget.properties.floorplan?.placements || []).map(p => {
      const deviceGroup = this.deviceGroups.find(dg => dg.id === p.deviceGroupId);
      if (deviceGroup === undefined) {
        return [];
      }
      const sources: DeviceGroupCriteriaModel[] = [];
      this.resolveControls(p).filter(c => c.via === undefined).forEach(c => {
        const source = this.stateSourceOf(p, deviceGroup, c.criteria);
        if (source !== undefined) {
          sources.push(source);
        }
      });
      return sources;
    });
  }

  /**
   * Loads the device types behind a device group while its criteria alone cannot tell apart two measuring
   * functions of one concept - a thermostat measuring both the room and the target temperature. Only the
   * device type says which of them belongs to the same service group as the controlling function.
   */
  loadMissingServiceGroups(): Observable<null> {
    const groupIds: string[] = [];
    this.widget.properties.floorplan?.placements.forEach(p => {
      const deviceGroup = this.deviceGroups.find(dg => dg.id === p.deviceGroupId);
      if (deviceGroup === undefined || this.deviceGroupServiceGroups.has(deviceGroup.id) || groupIds.indexOf(deviceGroup.id) !== -1) {
        return;
      }
      const context = this.stateSourceContext(p, deviceGroup);
      const ambiguous = this.displayedCriteria(p).some(c => needsServiceGroups(c, context, true)) ||
        this.selectedControllingCriteria(p, deviceGroup).some(c => needsServiceGroups(c, context, false));
      if (ambiguous) {
        groupIds.push(deviceGroup.id);
      }
    });
    if (groupIds.length === 0) {
      return of(null);
    }
    const deviceIds: string[] = [];
    groupIds.forEach(id => deviceIds.push(...(this.deviceGroups.find(dg => dg.id === id)?.device_ids || [])));
    const uniqueDeviceIds = deviceIds.filter((v, i, a) => a.indexOf(v) === i);
    if (uniqueDeviceIds.length === 0) {
      groupIds.forEach(id => this.deviceGroupServiceGroups.set(id, []));
      return of(null);
    }
    return this.deviceInstancesService.getDeviceInstancesWithDeviceType({ limit: uniqueDeviceIds.length, offset: 0, deviceIds: uniqueDeviceIds }).pipe(
      map(devices => {
        groupIds.forEach(groupId => {
          const group = this.deviceGroups.find(dg => dg.id === groupId);
          const perDeviceType: ServiceGroupFunctionModel[][] = [];
          (group?.device_ids || []).forEach(deviceId => {
            const deviceType = devices.result.find(d => d.id === deviceId)?.device_type;
            if (deviceType !== undefined && deviceType !== null) {
              perDeviceType.push(serviceGroupFunctions(deviceType));
            }
          });
          this.deviceGroupServiceGroups.set(groupId, perDeviceType);
        });
        return null;
      }));
  }

  /** Whether clicking the dot or the table row of the placement does anything */
  hasAction(datasetIndex: number): boolean {
    return (this.controls[datasetIndex] || []).length > 0;
  }

  /**
   * The control the displayed value of a criteria operates, which turns that value into a button. The
   * control gets no button of its own then.
   */
  linkedControl(datasetIndex: number, criteria: DeviceGroupCriteriaModel | undefined): FloorplanControlModel | undefined {
    if (criteria === undefined) {
      return undefined;
    }
    return (this.controls[datasetIndex] || []).find(c => c.via !== undefined && this.compareCriteriaWithoutInteraction(c.via, criteria));
  }

  /** The controls that are not reachable through a displayed value and need a row of their own */
  standaloneControls(datasetIndex: number): FloorplanControlModel[] {
    return (this.controls[datasetIndex] || []).filter(c => c.via === undefined);
  }

  /** The standalone controls that fit into a tooltip or table row */
  compactControls(datasetIndex: number): FloorplanControlModel[] {
    return this.standaloneControls(datasetIndex).filter(c => isOneClickControl(c.input));
  }

  /** Whether a control can only be reached through the dialog, because no row can hold its input */
  needsControlDialog(datasetIndex: number): boolean {
    return this.standaloneControls(datasetIndex).some(c => !isOneClickControl(c.input));
  }

  performRowAction(datasetIndex: number) {
    const controls = this.controls[datasetIndex] || [];
    if (controls.length === 0) {
      return;
    }
    if (controls.length > 1) {
      this.openControlDialog(datasetIndex);
      return;
    }
    this.performOrAsk(datasetIndex, controls[0]);
  }

  /** Operates the control the displayed value of a criteria stands for, if it has one */
  performLinkedControl(datasetIndex: number, criteria: DeviceGroupCriteriaModel | undefined) {
    const control = this.linkedControl(datasetIndex, criteria);
    if (control === undefined) {
      return;
    }
    this.performOrAsk(datasetIndex, control);
  }

  /** Runs a control right away, or asks for its value in the dialog when it takes one */
  performOrAsk(datasetIndex: number, control: FloorplanControlModel) {
    if (!isOneClickControl(control.input)) {
      this.openControlDialog(datasetIndex);
      return;
    }
    if (control.input === FloorplanControlInput.Toggle) {
      // one click has to flip the state, so it runs the opposite of what the state reports
      this.performControl(datasetIndex, { criteria: control.state ? control.offCriteria || control.criteria : control.criteria });
      return;
    }
    if (control.input === FloorplanControlInput.Switch) {
      this.performControl(datasetIndex, { criteria: control.criteria, value: !control.state });
      return;
    }
    this.performControl(datasetIndex, { criteria: control.criteria });
  }

  openControlDialog(datasetIndex: number) {
    const placement = this.widget.properties.floorplan?.placements[datasetIndex];
    if (placement === undefined) {
      return;
    }
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      alias: placement.alias,
      controls: this.controls[datasetIndex] || [],
      run: (command: CapabilityCommandModel) => this.runControl(placement.deviceGroupId, command),
    } as FloorplanControlDialogData;
    this.dialog.open(FloorplanControlDialogComponent, dialogConfig);
  }

  performControl(datasetIndex: number, command: CapabilityCommandModel) {
    const placement = this.widget.properties.floorplan?.placements[datasetIndex];
    if (placement === undefined) {
      return;
    }
    this.runControl(placement.deviceGroupId, command).subscribe();
  }

  /** Runs a control and refreshes afterwards, so the new state is picked up */
  runControl(deviceGroupId: string | null, command: CapabilityCommandModel): Observable<unknown> {
    if (deviceGroupId === null) {
      return of(null);
    }
    if (command.criteria.function_id === fpCriteriaConnectionStatus) {
      const dialogConfig = new MatDialogConfig();
      dialogConfig.width = '75vw';
      dialogConfig.disableClose = false;
      dialogConfig.data = {
        id: deviceGroupId,
      };
      this.dialog.open(ConnectionHistoryDialogComponent, dialogConfig);
      return of(null);
    }
    const deviceCommand: DeviceCommandModel = {
      function_id: command.criteria.function_id,
      group_id: deviceGroupId,
      device_class_id: command.criteria.device_class_id,
      aspect_id: command.criteria.aspect_id,
      input: command.value,
    };
    // the devices need a moment before they report the new state
    return this.deviceCommandService.runCommands([deviceCommand]).pipe(delay(750), concatMap(_ => this.refresh()));
  }

  closeChartjsTooltip() {
    this.chartjs.tooltipDisplay = 'none';
    this.cd.detectChanges();
  }

  forbidChartjsTooltip() {
    this.chartjs.tooltipAllowed = false;
    this.closeChartjsTooltip();
  }
  allowChartjsTooltip() {
    this.chartjs.tooltipAllowed = true;
  }
}
