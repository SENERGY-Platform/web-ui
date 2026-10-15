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

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { dialogSize } from '../../core/dialog-size';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackError } from 'src/app/core/services/snack-bar-messages';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { FloorplanEditDialogComponent } from './floorplan-edit-dialog/floorplan-edit-dialog.component';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { map, Observable, of, forkJoin, concatMap, delay } from 'rxjs';
import {
  defaultVoidTogglePairs,
  DeviceGroupCriteriaWithValueModel,
  DeviceGroupWithValueModel,
  FloorplanControlInput,
  FloorplanControlModel,
  FloorplanWidgetCapabilityModel,
  fpCriteriaConnectionStatus,
  image,
  isOneClickControl,
  isPlaced,
  migrateColoring,
  needsServiceGroups,
  readCommands,
  ServiceGroupFunctionModel,
  serviceGroupFunctions,
  TooltipCriteria,
  VoidTogglePair,
} from './shared/floorplan.model';
import { DeviceCommandModel, DeviceCommandResponseModel, DeviceCommandService } from 'src/app/core/services/device-command.service';
import { Chart, ChartDataset } from 'chart.js';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { criteriaAspectIds, DeviceTypeAspectNodeModel, DeviceTypeFunctionModel, DeviceTypeDeviceClassModel, DeviceTypeCharacteristicsModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceClassesService } from 'src/app/modules/metadata/device-classes/shared/device-classes.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { ConnectionHistoryDialogComponent } from '../shared/connection-history-dialog/connection-history-dialog.component';
import { FloorplanControlDialogComponent, FloorplanControlDialogData } from './floorplan-control-dialog/floorplan-control-dialog.component';
import { CapabilityCommandModel, CapabilityControlComponent } from './shared/capability-control/capability-control.component';
import { placementMarker, placementPosition } from './shared/floorplan-markers';
import { FloorplanControlResolver } from './floorplan-control-resolver';
import { buildFloorplanChartOptions, buildFloorplanChartPlugins, FloorplanChartState } from './floorplan-chart-options';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { BaseChartDirective } from 'ng2-charts';
import { NgClass, NgStyle } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-floorplan',
    templateUrl: './floorplan.component.html',
    styleUrl: './floorplan.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, BaseChartDirective, NgClass, NgStyle, MatIconButton, MatIcon, MatTooltip, CapabilityControlComponent, WidgetFooterComponent]
})
export class FloorplanComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private dashboardService = inject(DashboardService);
  private deviceCommandService = inject(DeviceCommandService);
  private deviceGroupsService = inject(DeviceGroupsService);
  private conceptsService = inject(ConceptsService);
  private deviceClassService = inject(DeviceClassesService);
  private deviceInstancesService = inject(DeviceInstancesService);
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);

  readonly dashboardId = input('');
  readonly widget = input<WidgetModel>({} as WidgetModel);
  readonly zoom = input(false);
  readonly userHasDeleteAuthorization = input(false);
  readonly userHasUpdatePropertiesAuthorization = input(false);
  readonly userHasUpdateNameAuthorization = input(false);

  @ViewChild('imageWrapper', { static: true }) imageWrapper!: ElementRef<HTMLDivElement>;

  readonly ready = signal(true);
  readonly refreshing = signal(false);
  drawShift = { centerShiftX: NaN, centerShiftY: NaN, ratio: NaN };
  img: HTMLImageElement | undefined;
  readonly draws = signal(0);
  functionIdToUnit = new Map<string, string>();
  /** base characteristic of the function's concept, undefined for functions without input */
  functionIdToCharacteristic = new Map<string, DeviceTypeCharacteristicsModel | undefined>();
  deviceGroups: DeviceGroupWithValueModel[] = [];
  aspects: DeviceTypeAspectNodeModel[] = [];
  functions: DeviceTypeFunctionModel[] = [];
  deviceClasses: DeviceTypeDeviceClassModel[] = [];
  readonly unplacedRows = signal<{ index: number; alias: string; icon: string; color: string; value: string }[]>([]);
  /** the controlling functions of each placement, by the same index as the datasets */
  readonly controls = signal<FloorplanControlModel[][]>([]);
  /** functions per service group, per device type, of a device group - only loaded when it is needed */
  deviceGroupServiceGroups = new Map<string, ServiceGroupFunctionModel[][]>();
  /** controls are resolved on every redraw, so an ambiguity is only reported the first time */
  reportedAmbiguities = new Set<string>();

  /** function triples that read and switch a state without ever taking an input */
  voidTogglePairs: VoidTogglePair[] = defaultVoidTogglePairs();

  private resolver = new FloorplanControlResolver(this);

  private readonly chartData = signal<FloorplanChartState['data']>(undefined);
  /** chart.js mutates the tooltip model it hands in, so every write counts as a change */
  private readonly tooltipContext = signal<FloorplanChartState['tooltipContext']>(undefined, { equal: () => false });
  private readonly tooltipDatasets = signal<FloorplanChartState['tooltipDatasets']>([]);
  private readonly tooltipCriteria = signal<TooltipCriteria[]>([]);
  private readonly tooltipDisplay = signal('none');
  private readonly tooltipAllowed = signal(false);

  /** The chart.js state; the fields the template reads are signals behind these accessors. */
  readonly chartjs: FloorplanChartState = this.createChartjsState();

  private createChartjsState(): FloorplanChartState {
    const state = {
      options: buildFloorplanChartOptions(this),
      plugins: buildFloorplanChartPlugins(this),
      showValueWhenZoomed: [] as boolean[],
      showValue: [] as boolean[],
      icons: [] as string[],
    } as FloorplanChartState;
    Object.defineProperties(state, {
      data: { get: () => this.chartData(), set: (v: FloorplanChartState['data']) => this.chartData.set(v), enumerable: true },
      tooltipContext: { get: () => this.tooltipContext(), set: (v: FloorplanChartState['tooltipContext']) => this.tooltipContext.set(v), enumerable: true },
      tooltipDatasets: { get: () => this.tooltipDatasets(), set: (v: FloorplanChartState['tooltipDatasets']) => this.tooltipDatasets.set(v), enumerable: true },
      tooltipCriteria: { get: () => this.tooltipCriteria(), set: (v: TooltipCriteria[]) => this.tooltipCriteria.set(v), enumerable: true },
      tooltipDisplay: { get: () => this.tooltipDisplay(), set: (v: string) => this.tooltipDisplay.set(v), enumerable: true },
      tooltipAllowed: { get: () => this.tooltipAllowed(), set: (v: boolean) => this.tooltipAllowed.set(v), enumerable: true },
    });
    return state;
  }

  ngOnInit(): void {
    migrateColoring(this.widget().properties);
    this.img = image(this.widget().properties);
    const obs: Observable<unknown>[] = [];
    obs.push(this.deviceGroupsService.getAspectListByIds(undefined).pipe(map(a => this.aspects = a)));
    obs.push(this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').pipe(map(c => this.deviceClasses = c.result)));
    // the aspects have to be known before the first refresh, it pairs the criteria along the aspect tree
    forkJoin(obs).pipe(concatMap(_ => this.refresh())).subscribe(_ => {
      this.draw();
      this.ready.set(true);
    });
    this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
      if (event === 'reloadAll' || event === this.widget().id) {
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
      }, 30);
    }));
    ro.observe(this.el.nativeElement);
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
    const datasets: ChartDataset[] = new Array(Math.max((this.widget().properties.floorplan?.placements || []).length - 1, 0)).fill({});
    const showValue: boolean[] = [];
    const showValueWhenZoomed: boolean[] = [];
    const icons: string[] = [];
    const controls: FloorplanControlModel[][] = [];
    const unplacedRows: { index: number; alias: string; icon: string; color: string; value: string }[] = [];
    const floorplan = this.widget().properties.floorplan;
    floorplan?.placements.forEach((p, i) => {
      if (floorplan === undefined || floorplan.placements === null || this.img === undefined) {
        return;
      }
      const { x, y } = placementPosition(p, this.img, this.drawShift);
      const { icon, color, showValue: notZoom, showValueWhenZoomed: zoom, label } = placementMarker(p, this.unitOf(p.criteria.function_id));
      icons[i] = icon;
      showValueWhenZoomed[i] = zoom;
      showValue[i] = notZoom;
      controls[i] = this.resolveControls(p);
      if (!isPlaced(p)) {
        // keep the dataset to preserve index alignment with the placements, but draw nothing
        datasets[i] = { data: [], label, backgroundColor: color };
        if (floorplan.showUnplacedTable) {
          unplacedRows.push({ index: i, alias: p.alias, icon, color, value: label });
        }
        return;
      }
      datasets[i] = { data: [{ 'x': x, 'y': y }], label, backgroundColor: color };
    });
    this.unplacedRows.set(unplacedRows);
    this.controls.set(controls);
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
    this.draws.update(n => n + 1);
  }


  private refresh(): Observable<unknown> {
    if (this.widget().properties.floorplan === undefined) {
      return of(null);
    }
    this.refreshing.set(true);
    this.img = image(this.widget().properties);
    let commands: DeviceCommandModel[] = [];
    let idsToCheckOnline: string[] = [];

    return this.loadMissingDeviceGroups().pipe(
      concatMap(_ => this.loadMissingFunctionInfo()),
      concatMap(_ => this.loadMissingServiceGroups()),
      concatMap(_ => {
      const floorplan = this.widget().properties.floorplan;
      if (floorplan === undefined) {
        return of(null);
      }

      const reads = readCommands(floorplan.placements, this.stateSources());
      commands = reads.commands;
      idsToCheckOnline = reads.onlineDeviceGroupIds;
      const o: Observable<unknown>[] = [];
      if (commands.length > 0) {
        o?.push(this.deviceCommandService.runCommands(commands, true).pipe(map(res => {
          // runCommands answers [] when the request failed; keep the values shown so far
          if (res.length !== commands.length) {
            snackError(this.snackBar, 'The floorplan values could not be read');
            return;
          }
          commands.forEach((com, i) => {
            // criteria differing only by interaction all report the same value
            this.deviceGroups.find(dg => dg.id === com.group_id)?.criteria
              ?.filter(crit => this.compareCriteriaWithoutInteraction(crit, com as DeviceGroupCriteriaModel))
              .forEach(crit => crit.value = res[i]);

            this.widget().properties.floorplan?.placements.forEach(p => {
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
          this.widget().properties.floorplan?.placements.forEach(p => {
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
        this.refreshing.set(false);
      }));
    }));
  }

  unitOf(functionId: string): string | undefined {
    return this.functionIdToUnit.has(functionId) ? this.functionIdToUnit.get(functionId) : undefined;
  }

  edit() {
    const dialogConfig = new MatDialogConfig();
    Object.assign(dialogConfig, dialogSize('xl'));
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      widgetId: this.widget().id,
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

  /** A signal query, so the style is evaluated again once the tooltip exists and can be measured. */
  private readonly chartjsTooltipElement = viewChild<ElementRef>('chartjsTooltip');
  get chartjsTooltipStyle(): any {
    const tooltipElement = this.chartjsTooltipElement();
    let top = (this.chartjs.tooltipContext?.chart.canvas?.offsetTop || 0) + (this.chartjs.tooltipContext?.tooltip.caretY || 0);
    if (tooltipElement !== undefined) {
      const oversize = top + tooltipElement.nativeElement.offsetHeight - (this.chartjs.tooltipContext?.chart.canvas?.offsetHeight || 0) + 12; // 12px as extra margin
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
    return Chart.getChart('chartjs-' + this.widget().id);
  }

  get dotSize(): number {
    return Math.sqrt(this.el.nativeElement.clientHeight * this.el.nativeElement.clientWidth) * (this.widget().properties?.floorplan?.dotSize || 5) / 350;
  }

  loadMissingFunctionInfo(): Observable<null> {
    const obs: Observable<any>[] = [of(null)];
    let functionIds: string[] = [];
    this.widget().properties.floorplan?.placements.forEach(p => {
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
    const deviceGroupIds = this.widget().properties.floorplan?.placements.map(p => p.deviceGroupId).filter(dId => dId !== null).filter(dId => this.deviceGroups.find(dg => dg.id === dId) === undefined).filter((v, i, a) => a.indexOf(v) === i);
    if (deviceGroupIds !== undefined && deviceGroupIds?.length > 0) {
      return this.deviceGroupsService.getDeviceGroupListByIds(deviceGroupIds as string[], true).pipe(map(dgs => {
        dgs.forEach(dg => dg.criteria = dg.criteria
          // the backend also generates one criterion per single aspect (with ancestors), so dropping the
          // combined ones here loses no aspect - it only drops the choice this single-aspect UI cannot offer
          ?.filter(c => criteriaAspectIds(c).length <= 1)
          .filter((v, i, a) => a.findIndex(v2 => this.compareCriteria(v, v2)) === i));
        this.deviceGroups.push(...(dgs as DeviceGroupWithValueModel[]));
        return null;
      }));
    }
    return of(null);
  }

  compareCriteria(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return this.resolver.compareCriteria(a, b);
  }

  compareCriteriaWithoutInteraction(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return this.resolver.compareCriteriaWithoutInteraction(a, b);
  }

  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    return this.resolver.describeCriteria(criteria);
  }

  displayedCriteria(placement: FloorplanWidgetCapabilityModel): DeviceGroupCriteriaWithValueModel[] {
    return this.resolver.displayedCriteria(placement);
  }

  resolveControls(placement: FloorplanWidgetCapabilityModel): FloorplanControlModel[] {
    return this.resolver.resolveControls(placement);
  }

  /**
   * The measuring criteria the controls of every placement need, so a refresh reads them too. Controls
   * reached through a displayed measurement need nothing, that value is read for the tooltip anyway.
   */
  private stateSources(): DeviceGroupCriteriaModel[][] {
    return (this.widget().properties.floorplan?.placements || []).map(p => {
      const deviceGroup = this.deviceGroups.find(dg => dg.id === p.deviceGroupId);
      if (deviceGroup === undefined) {
        return [];
      }
      const sources: DeviceGroupCriteriaModel[] = [];
      this.resolveControls(p).filter(c => c.via === undefined).forEach(c => {
        const source = this.resolver.stateSourceOf(p, deviceGroup, c.criteria);
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
    this.widget().properties.floorplan?.placements.forEach(p => {
      const deviceGroup = this.deviceGroups.find(dg => dg.id === p.deviceGroupId);
      if (deviceGroup === undefined || this.deviceGroupServiceGroups.has(deviceGroup.id) || groupIds.indexOf(deviceGroup.id) !== -1) {
        return;
      }
      const context = this.resolver.stateSourceContext(p, deviceGroup);
      const ambiguous = this.displayedCriteria(p).some(c => needsServiceGroups(c, context, true)) ||
        this.resolver.selectedControllingCriteria(p, deviceGroup).some(c => needsServiceGroups(c, context, false));
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
    return (this.controls()[datasetIndex] || []).length > 0;
  }

  /**
   * The control the displayed value of a criteria operates, which turns that value into a button. The
   * control gets no button of its own then.
   */
  linkedControl(datasetIndex: number, criteria: DeviceGroupCriteriaModel | undefined): FloorplanControlModel | undefined {
    if (criteria === undefined) {
      return undefined;
    }
    return (this.controls()[datasetIndex] || []).find(c => c.via !== undefined && this.compareCriteriaWithoutInteraction(c.via, criteria));
  }

  /** The controls that are not reachable through a displayed value and need a row of their own */
  standaloneControls(datasetIndex: number): FloorplanControlModel[] {
    return (this.controls()[datasetIndex] || []).filter(c => c.via === undefined);
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
    const controls = this.controls()[datasetIndex] || [];
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
    const placement = this.widget().properties.floorplan?.placements[datasetIndex];
    if (placement === undefined) {
      return;
    }
    const dialogConfig = new MatDialogConfig();
    Object.assign(dialogConfig, dialogSize('s'));
    dialogConfig.disableClose = false;
    dialogConfig.data = {
      alias: placement.alias,
      controls: this.controls()[datasetIndex] || [],
      run: (command: CapabilityCommandModel) => this.runControl(placement.deviceGroupId, command),
    } as FloorplanControlDialogData;
    this.dialog.open(FloorplanControlDialogComponent, dialogConfig);
  }

  performControl(datasetIndex: number, command: CapabilityCommandModel) {
    const placement = this.widget().properties.floorplan?.placements[datasetIndex];
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
      Object.assign(dialogConfig, dialogSize('xl'));
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
    return this.deviceCommandService.runCommands([deviceCommand]).pipe(concatMap(responses => {
      // runCommands answers [] when the request failed; a command that did not run has a status other than 200
      if (!this.allSucceeded(responses, 1)) {
        snackError(this.snackBar, 'The command could not be sent to the device');
        return of(null);
      }
      return of(null).pipe(delay(750), concatMap(_ => this.refresh()));
    }));
  }

  private allSucceeded(responses: DeviceCommandResponseModel[], expected: number): boolean {
    return responses.length === expected && responses.every(r => r.status_code === 200);
  }

  closeChartjsTooltip() {
    this.chartjs.tooltipDisplay = 'none';
  }

  forbidChartjsTooltip() {
    this.chartjs.tooltipAllowed = false;
    this.closeChartjsTooltip();
  }
  allowChartjsTooltip() {
    this.chartjs.tooltipAllowed = true;
  }
}
