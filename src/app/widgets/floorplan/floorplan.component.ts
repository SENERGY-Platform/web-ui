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
import { CriteriaAndBaseCharacteristicModel, DeviceGroupWithValueModel, fpCriteriaConnectionStatus, image, migrateColoring, TooltipCriteria } from './shared/floorplan.model';
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
import { environment } from '../../../environments/environment';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';

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
  deviceGroups: DeviceGroupWithValueModel[] = [];
  aspects: DeviceTypeAspectNodeModel[] = [];
  functions: DeviceTypeFunctionModel[] = [];
  deviceClasses: DeviceTypeDeviceClassModel[] = [];
  concepts: ConceptsCharacteristicsModel[] = [];

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
                  const deviceGroup = this.deviceGroups.find(dg => dg.id === this.widget.properties.floorplan?.placements[x.datasetIndex].deviceGroupId);
                  const placement = this.widget.properties.floorplan?.placements[x.datasetIndex];
                  placement?.tooltipCriteria?.forEach(c => {
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

                    const relatedControllingCriteria = this.filterRelatedControllingCriteria(c, deviceGroup?.criteria || [], c.value.message);
                    let control: {
                      characteristic?: DeviceTypeCharacteristicsModel,
                      criteria: DeviceGroupCriteriaModel,
                    } | undefined;
                    if (relatedControllingCriteria.length === 1) {
                      const conceptId = this.functions.find(f => f.id === relatedControllingCriteria[0].function_id)?.concept_id;
                      const concept = this.concepts.find(concept2 => concept2.id === conceptId);
                      control = {
                        characteristic: concept?.characteristics.find(char => char.id === concept.base_characteristic_id),
                        criteria: relatedControllingCriteria[0],
                      };
                    } else if (relatedControllingCriteria.length > 1) {
                      console.warn('Floorplan: Found multiple controlling criteria, please check device type');
                    }
                    tc.values.push({ label, description: this.describeCriteria(c), control });
                  });
                  this.chartjs.tooltipCriteria.push(tc);
                });
                return [];
              }
            },
            external: (context) => {
              if (context.tooltip.dataPoints !== undefined && context.tooltip.dataPoints.length > 0) {
                context.tooltip.title = context.tooltip.dataPoints.map(x => this.widget.properties.floorplan?.placements[x.datasetIndex].alias || '');
              }
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
        events: ['click', 'mousemove'],
        onHover: (_, elements, chart) => {
          const style = (chart.canvas?.parentNode as any)?.style;
          if (style === null) {
            return;
          }
          let ok = elements !== undefined && elements.length === 1;
          if (ok) {
            const datasetIndex = elements[0].datasetIndex;
            const info = this.findRelatedControllingCriteria(datasetIndex);
            ok &&= info.criteriaAndCharacteristic.length === 1;
            ok &&= info.criteriaAndCharacteristic[0].characteristic === undefined;
          }
          if (ok) {
            style.cursor = 'pointer';
          } else {
            style.cursor = 'default';
          }
        },
        onClick: (_, elements) => {
          if (elements !== undefined && elements.length === 1) {
            const datasetIndex = elements[0].datasetIndex;
            const info = this.findRelatedControllingCriteria(datasetIndex);
            if (info.criteriaAndCharacteristic.length === 1 && info.criteriaAndCharacteristic[0].characteristic === undefined) {
              this.performAction(info.deviceGroupId, info.criteriaAndCharacteristic[0].criteria);
            }
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
    obs.push(this.refresh());
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
    const datasets: ChartDataset[] = new Array(Math.max((this.widget.properties.floorplan?.placements || []).length - 1, 0)).fill({});
    const showValue: boolean[] = [];
    const showValueWhenZoomed: boolean[] = [];
    const icons: string[] = [];
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
      let label = '' + value;
      if (this.functionIdToUnit.has(this.widget.properties.floorplan.placements[i].criteria.function_id)) {
        label += ' ' + this.functionIdToUnit.get(this.widget.properties.floorplan.placements[i].criteria.function_id);
      }
      icons[i] = icon;
      showValueWhenZoomed[i] = zoom;
      showValue[i] = notZoom;
      datasets[i] = { data: [{ 'x': x, 'y': y }], label, backgroundColor: color };
    });
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
    const commands: DeviceCommandModel[] = [];
    const idsToCheckOnline: string[] = [];

    return this.loadMissingDeviceGroups().pipe(concatMap(_ => {
      if (this.widget.properties.floorplan === undefined) {
        return of(null);
      }

      this.widget.properties.floorplan.placements.forEach(p => {
        p.tooltipCriteria?.forEach(c2 => {
          if (c2.function_id === fpCriteriaConnectionStatus) {
              idsToCheckOnline.push(p.deviceGroupId || '');
          } else {
          commands.push({
            group_id: p.deviceGroupId || undefined,
            function_id: c2.function_id,
            aspect_id: c2.aspect_id,
            device_class_id: c2.device_class_id,
          });
        }
        });
        if (p.criteria.function_id === fpCriteriaConnectionStatus) {
          idsToCheckOnline.push(p.deviceGroupId || '');
        } else {
        commands.push({
          group_id: p.deviceGroupId || undefined,
          function_id: p.criteria.function_id,
          aspect_id: p.criteria.aspect_id,
          device_class_id: p.criteria.device_class_id,
        });
      }
      });
      const o: Observable<unknown>[] = [];
      if (commands.length > 0) {
        o?.push(this.loadMissingFunctionInfo().pipe(concatMap(_1 => this.deviceCommandService.runCommands(commands, true)), map(res => {
          commands.forEach((com, i) => {
            const criteria = this.deviceGroups.find(dg => dg.id === com.group_id)?.criteria?.find(crit => this.compareCriteriaWithoutInteraction(crit, com as DeviceGroupCriteriaModel));
            if (criteria !== undefined) {
              criteria.value = res[i];
            }

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
        this.draw();
        this.refreshing = false;
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

  edit() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '75vw';
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
    let functionIds = this.widget.properties.floorplan?.placements.map(p => p.criteria.function_id) || [];
    this.deviceGroups.forEach(d => {
      if (d.criteria === undefined) {
        return;
      }
      functionIds.push(...d.criteria.map(c => c.function_id));
    });
    functionIds = functionIds.filter(fId => !this.functionIdToUnit.has(fId));
    if (functionIds !== undefined && functionIds?.length > 0) {
      obs.push(this.deviceGroupsService.getFunctionListByIds(functionIds).pipe(
        concatMap(functions => {
          this.functions.push(...functions);
          return this.conceptsService.getConceptsWithCharacteristics({ ids: functions.map(f => f.concept_id) }).pipe(map(concepts => {
            this.concepts.push(...(concepts.result));
            return { concepts, functions };
          }));
        }),
        map((res) => res.functions.forEach(f => {
          const concept = res.concepts.result.find(c => f.concept_id === c.id);
          if (concept === undefined) {
            this.functionIdToUnit.set(f.id, '');
            return;
          }
          const displayUnit = concept.characteristics.find(c => c.id === concept.base_characteristic_id)?.display_unit;
          if (displayUnit === undefined) {
            this.functionIdToUnit.set(f.id, '');
            return;
          }
          this.functionIdToUnit.set(f.id, displayUnit);
          return;
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
      // @ts-expect-error deviceGroupIds is string[], but compiler does not recognize
      return this.deviceGroupsService.getDeviceGroupListByIds(deviceGroupIds, true).pipe(map(dgs => {
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


  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    if (criteria == null) {
      return '';
    }
    return (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
  }

  findRelatedControllingCriteria(datasetIndex: number): { criteriaAndCharacteristic: CriteriaAndBaseCharacteristicModel[]; deviceGroupId: string } {
    const placement = this.widget.properties.floorplan?.placements[datasetIndex];
    if (placement === undefined) {
      return { criteriaAndCharacteristic: [], deviceGroupId: '' };
    }
    const deviceGroup = this.deviceGroups.find(dg => dg.id === placement.deviceGroupId);
    if (deviceGroup === undefined) {
      return { criteriaAndCharacteristic: [], deviceGroupId: '' };
    }

    const relatedControllingCriteria = this.filterRelatedControllingCriteria(placement.criteria, deviceGroup.criteria || [], placement.criteria.value?.message);
    const criteriaAndCharacteristic = relatedControllingCriteria.map(criteria => {
      const conceptId = this.functions.find(f => f.id === relatedControllingCriteria[0].function_id)?.concept_id;
      const concept = this.concepts.find(concept2 => concept2.id === conceptId);
      return { criteria, baseCharacteristic: concept?.characteristics.find(char => char.id === concept.base_characteristic_id) === undefined };
    });
    return { criteriaAndCharacteristic, deviceGroupId: deviceGroup.id };
  }

  filterRelatedControllingCriteria(c: DeviceGroupCriteriaModel, l: DeviceGroupCriteriaModel[], value?: any): DeviceGroupCriteriaModel[] {
    switch (c.function_id) {
      case environment.getOnOffFunctionId:
        let functionId;
        let t = value;
        if (Array.isArray(value)) {
          value.forEach(v => t &&= v);
        }
        if (t) {
          functionId = environment.setOffFunctionId;
        } else {
          functionId = environment.setOnFunctionId;
        }
        return l.filter(c2 => c2.function_id === functionId);
      default:
        const conceptId = this.functions.find(f => f.id === c.function_id)?.concept_id;
        if (conceptId === undefined) {
          return [];
        }
        return l.filter(c2 => {
          if (!c2.function_id.startsWith('urn:infai:ses:controlling-function')) {
            return false;
          }
          if (c2.aspect_id !== c.aspect_id) {
            return false;
          }
          const f = this.functions.find(f2 => f2.id === c2.function_id);
          return f?.concept_id === conceptId;
        });
    }
  }

  performAction(deviceGroupId: string | null, criteria: DeviceGroupCriteriaModel, value?: any) {
    if (deviceGroupId === null) {
      return;
    }
    const command: DeviceCommandModel = {
      function_id: criteria.function_id,
      group_id: deviceGroupId,
      device_class_id: criteria.device_class_id,
      aspect_id: criteria.aspect_id,
      input: value,
    };
    this.deviceCommandService.runCommands([command]).pipe(delay(750), concatMap(_ => this.refresh())).subscribe();
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
