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

import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Observable, Subscription, forkJoin, interval, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DeviceCommandService } from 'src/app/core/services/device-command.service';
import { dialogSize } from 'src/app/core/dialog-size';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { HeatingScheduleDialogComponent, HeatingScheduleDialogData, toEditable } from './dialog/schedule/schedule-dialog.component';
import { HEATING_SCHEDULE_PARAMETER, HEATING_SETBACK_PARAMETER, HEATING_THERMOSTATS_PARAMETER, heatingInstanceId } from './shared/heating-schedule.model';
import {
    HeatingPlan,
    HeatingPlanError,
    HeatingSegment,
    SEGMENT_TEXT_COLOR,
    WEEKDAY_NAMES,
    berlinParts,
    daySegments,
    lastSwitch,
    nextSwitch,
    nextSwitchText,
    parseSetback,
    target,
    temperatureColor,
    temperatureText,
    timeText,
    weekSegments,
} from './shared/heating-schedule.plan';
import {
    HeatingDeviceValues,
    HeatingValueSource,
    InstanceStatus,
    instanceStatus,
    lowBatteries,
    manualOverride,
    manualOverrideText,
    matchValueSources,
    meanRoom,
    readCommands,
    valuesFromResponses,
} from './shared/heating-schedule.details';
import { HeatingScheduleService } from './shared/heating-schedule.service';
import {
    HatchSpan,
    WarmupConfig,
    ZoneWarmup,
    hatchSpans,
    learningText,
    nextWindowText,
    rowDay,
    stationLine,
    warmingText,
} from './shared/heating-schedule.warmup';
import { HeatingWarmupService } from './shared/heating-schedule.warmup.service';
import { HeatingThermostat, HeatingZoneDocument, ResolvedZone, parseThermostats, parseZoneDocument, resolveZones, zoneLabel } from './shared/heating-schedule.zones';

/** A bar segment of the week overview; position and size in percent of the day. */
export interface BarSegment {
    left: number;
    width: number;
    color: string;
    title: string;
    /** the temperature written into the segment, only when it is wide enough */
    label: string | null;
}

export interface WeekRow {
    name: string;
    segments: BarSegment[];
    /** warm-up phases within the next 24 hours, drawn over the segments */
    hatches: HatchSpan[];
}

/** A zone as the widget shows it. */
export interface ZoneView {
    name: string;
    /** the thermostats of the zone, shortened; the full list is the title */
    devices: string;
    devicesTitle: string;
    plan: HeatingPlan;
    /** position in the stored zones list, which the warm-up export keys its rows by */
    planIndex: number;
    /** the thermostats of the zone */
    members: HeatingThermostat[];
    /** the measured mean when there is one, else the planned target */
    currentText: string;
    /** "target 21 °C", only next to a measured value */
    targetText: string | null;
    nextText: string | null;
    todayRow: BarSegment[];
    /** position of the current minute in percent of the day */
    nowPercent: number;
    /** index into `rows` of the current local weekday */
    todayIndex: number;
    expanded: boolean;
    batteries: string[];
    manualText: string | null;
    /** the warm-up information; all of it is null for an instance without a warm-up export */
    warmingText: string | null;
    windowText: string | null;
    learningText: string | null;
    todayHatches: HatchSpan[];
    rows: WeekRow[];
}

/** From this width on a segment of the today row carries its temperature. */
const LABEL_MIN_PERCENT = 8;
const DEVICE_REFRESH_MS = 300000;

const MAX_SHOWN_DEVICES = 3;

const LOAD_ERROR = 'The heating schedule could not be loaded.';

@Component({
    selector: 'senergy-heating-schedule',
    templateUrl: './heating-schedule.component.html',
    styleUrls: ['./heating-schedule.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, MatCardContent, MatButton, MatIcon, WidgetHeaderComponent, WidgetSpinnerComponent, WidgetFooterComponent]
})
export class HeatingScheduleComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    configured = false;
    ready = false;
    refreshing = false;
    loadError: string | null = null;
    /** the stored schedule text when it cannot be read, shown next to the error */
    rawSchedule: string | null = null;
    instance: SmartServiceInstanceModel | null = null;
    status: InstanceStatus | null = null;
    /** the stored schedule and the thermostats the editor starts from */
    document: HeatingZoneDocument | null = null;
    setback = 0;
    thermostats: HeatingThermostat[] = [];
    zones: ZoneView[] = [];
    /** the outdoor and forecast stations of the warm-up model, one line for the instance */
    stationText: string | null = null;
    /** why the editor cannot take over the stored plan, if it cannot */
    editorNote: string | null = null;
    readonly hours = [0, 6, 12, 18, 24];
    readonly segmentTextColor = SEGMENT_TEXT_COLOR;

    private initSubscription = new Subscription();
    private loadSubscription = new Subscription();
    private tickSubscription = new Subscription();
    private deviceSubscription = new Subscription();
    private deviceTickSubscription = new Subscription();
    /** the sources are looked up once per load; the 5 minute refresh only reads */
    private sources: HeatingValueSource[] | null = null;
    private values = new Map<string, HeatingDeviceValues>();
    private warmupConfigSubscription = new Subscription();
    private warmupSubscription = new Subscription();
    /** null for an instance without a warm-up export */
    private warmupExport: WarmupConfig | null = null;
    private warmups: Array<ZoneWarmup | null> = [];
    private expandedByZone = new Map<number, boolean>();
    private dashboardService = inject(DashboardService);
    private instanceService = inject(SmartServiceInstanceService);
    private service = inject(HeatingScheduleService);
    private dialog = inject(MatDialog);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceTypeService = inject(DeviceTypeService);
    private deviceCommandService = inject(DeviceCommandService);
    private warmupService = inject(HeatingWarmupService);

    ngOnInit(): void {
        this.initSubscription = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.load();
            }
        });
        // the current target and the next switch move with the clock, the stored plan does not
        this.tickSubscription = interval(60000).subscribe(() => this.updateNow());
        this.deviceTickSubscription = interval(DEVICE_REFRESH_MS).subscribe(() => {
            this.loadDeviceValues();
            this.loadWarmups();
        });
    }

    ngOnDestroy(): void {
        this.initSubscription.unsubscribe();
        this.loadSubscription.unsubscribe();
        this.tickSubscription.unsubscribe();
        this.deviceSubscription.unsubscribe();
        this.deviceTickSubscription.unsubscribe();
        this.warmupConfigSubscription.unsubscribe();
        this.warmupSubscription.unsubscribe();
    }

    toggleWeek(index: number): void {
        const zone = this.zones[index];
        zone.expanded = !zone.expanded;
        this.expandedByZone.set(index, zone.expanded);
    }

    get canEditSchedule(): boolean {
        return this.document !== null && this.editorNote === null && this.instance?.permissions_info?.permissions?.administrate !== false;
    }

    load(): void {
        const instanceId = heatingInstanceId(this.widget.properties);
        this.configured = !!instanceId;
        if (!instanceId) {
            this.ready = true;
            return;
        }
        this.refreshing = true;
        this.loadSubscription.unsubscribe();
        this.loadSubscription = this.instanceService.getInstance(instanceId).subscribe({
            next: (instance) => {
                if (instance === null) {
                    this.fail(LOAD_ERROR);
                    return;
                }
                this.show(instance);
            },
            error: () => this.fail(LOAD_ERROR),
        });
    }

    private fail(message: string): void {
        this.instance = null;
        this.status = null;
        this.rawSchedule = null;
        this.document = null;
        this.zones = [];
        this.warmupConfigSubscription.unsubscribe();
        this.warmupSubscription.unsubscribe();
        this.loadError = message;
        this.finishLoad();
    }

    private show(instance: SmartServiceInstanceModel): void {
        this.instance = instance;
        this.status = instanceStatus(instance);
        const schedule = parameterValue(instance, HEATING_SCHEDULE_PARAMETER);
        const scheduleText = typeof schedule === 'string' ? schedule : '';
        this.rawSchedule = null;
        this.editorNote = null;
        this.document = null;
        this.zones = [];
        let document: HeatingZoneDocument;
        try {
            document = parseZoneDocument(scheduleText);
        } catch (error) {
            // the raw text is shown so that nothing the editor cannot read is lost from sight
            this.rawSchedule = typeof schedule === 'string' ? schedule : JSON.stringify(schedule ?? null);
            this.loadError = 'The stored heating schedule cannot be read: ' + errorText(error);
            this.finishLoad();
            return;
        }
        try {
            const setback = parseSetback(parameterValue(instance, HEATING_SETBACK_PARAMETER));
            const thermostats = parseThermostats(parameterValue(instance, HEATING_THERMOSTATS_PARAMETER));
            this.zones = resolveZones(document.zones, setback, thermostats, document.legacy).map((zone, index, all) => zoneView(zone, this.expandedByZone.get(index) ?? all.length === 1));
            this.document = document;
            this.setback = setback;
            this.thermostats = thermostats;
            this.loadError = null;
            this.editorNote = editorNote(document);
            this.updateNow();
            this.sources = null;
            this.loadDeviceValues();
            this.loadWarmupConfig(instance.id);
        } catch (error) {
            this.rawSchedule = typeof schedule === 'string' ? schedule : JSON.stringify(schedule ?? null);
            this.loadError = 'The stored heating schedule cannot be read: ' + errorText(error);
        }
        this.finishLoad();
    }

    private finishLoad(): void {
        this.ready = true;
        this.refreshing = false;
    }

    /** Looks the value sources up once per load and reads them; a failure leaves the values as they were and the widget as it is. */
    private loadDeviceValues(): void {
        this.deviceSubscription.unsubscribe();
        const ids = this.thermostats.map((thermostat) => thermostat.deviceId);
        if (ids.length === 0) {
            return;
        }
        const sources$: Observable<HeatingValueSource[]> = this.sources !== null ? of(this.sources) : this.lookupSources(ids);
        this.deviceSubscription = sources$.pipe(
            switchMap((sources) => {
                this.sources = sources;
                const commands = readCommands(sources);
                if (commands.length === 0) {
                    return of(new Map<string, HeatingDeviceValues>());
                }
                // runCommands answers [] when the request failed
                return this.deviceCommandService.runCommands(commands, true).pipe(
                    map((responses) => responses.length === commands.length ? valuesFromResponses(sources, responses) : this.values),
                );
            }),
        ).subscribe({
            next: (values) => {
                this.values = values;
                this.updateNow();
            },
            error: (error) => console.error('The heating device values could not be read', error),
        });
    }

    /** Looks the warm-up export up once per load; an instance without one looks as it did before. */
    private loadWarmupConfig(instanceId: string): void {
        this.warmupConfigSubscription.unsubscribe();
        this.warmupSubscription.unsubscribe();
        this.warmupExport = null;
        this.warmups = [];
        this.stationText = null;
        this.warmupConfigSubscription = this.warmupService.config(instanceId).subscribe((config) => {
            this.warmupExport = config;
            this.loadWarmups();
        });
    }

    private loadWarmups(): void {
        if (this.warmupExport === null || this.zones.length === 0) {
            return;
        }
        this.warmupSubscription.unsubscribe();
        this.warmupSubscription = this.warmupService.newestRows(this.warmupExport.exportId, this.zones.map((zone) => zone.planIndex)).subscribe((rows) => {
            this.warmups = rows;
            this.updateNow();
        });
    }

    private lookupSources(ids: string[]): Observable<HeatingValueSource[]> {
        return this.deviceInstancesService.getDeviceListByIds(ids).pipe(
            switchMap((devices) => {
                const typeIds = [...new Set(devices.map((device) => device.device_type_id))];
                return forkJoin([of(devices), typeIds.length === 0 ? of([]) : this.deviceTypeService.getDeviceTypeListByIds(typeIds)]);
            }),
            map(([devices, types]) => devices.flatMap((device) => {
                const type = types.find((candidate) => candidate.id === device.device_type_id);
                return type === undefined ? [] : matchValueSources(device.id, type);
            })),
        );
    }

    private updateNow(): void {
        const now = Date.now();
        const parts = berlinParts(now);
        for (const [index, zone] of this.zones.entries()) {
            const planned = target(zone.plan, now);
            const ids = zone.members.map((member) => member.deviceId);
            const room = meanRoom(ids, this.values);
            zone.currentText = temperatureText(room ?? planned);
            zone.targetText = room === null ? null : 'target ' + temperatureText(planned);
            const next = nextSwitch(zone.plan, now);
            zone.nextText = next === null ? null : nextSwitchText(next, now);
            zone.todayIndex = parts.weekday;
            zone.nowPercent = (parts.minute / 1440) * 100;
            zone.todayRow = daySegmentsBars(zone.plan, parts.weekday);
            zone.batteries = lowBatteries(zone.members, this.values).map((low) => low.label + ' ' + low.percent + ' %');
            const manual = manualOverride(planned, ids, this.values, now, lastSwitch(zone.plan, now));
            zone.manualText = manual === null ? null : manualOverrideText(manual, next, now);
            this.updateWarmup(zone, index, planned, now, parts.day);
        }
        this.stationText = this.warmupExport === null ? null : stationLine(this.warmups);
    }

    private updateWarmup(zone: ZoneView, index: number, planned: number, now: number, today: number): void {
        const config = this.warmupExport;
        const warmup = this.warmups[index] ?? null;
        zone.warmingText = config === null ? null : warmingText(warmup, planned);
        zone.windowText = config === null ? null : nextWindowText(warmup, config.mode, now);
        zone.learningText = config === null ? null : learningText(warmup);
        zone.todayHatches = config === null ? [] : hatchSpans(warmup, config.mode, now, today);
        zone.rows.forEach((row, weekday) => {
            row.hatches = config === null ? [] : hatchSpans(warmup, config.mode, now, rowDay(now, weekday));
        });
    }

    editSchedule(): void {
        if (this.instance === null || this.document === null) {
            return;
        }
        const data: HeatingScheduleDialogData = {
            instance: this.instance,
            zones: this.document.zones,
            setback: this.setback,
            thermostats: this.thermostats,
        };
        this.dialog.open<HeatingScheduleDialogComponent, HeatingScheduleDialogData, boolean>(HeatingScheduleDialogComponent, {
            data,
            ...dialogSize('m'),
        }).afterClosed().subscribe((saved) => {
            if (saved) {
                this.load();
            }
        });
    }

    edit(): void {
        this.service.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}

function parameterValue(instance: SmartServiceInstanceModel, id: string): unknown {
    return (instance.parameters ?? []).find((parameter) => parameter.id === id)?.value;
}

function errorText(error: unknown): string {
    return error instanceof HeatingPlanError ? error.message : 'unknown error';
}

/** Why the editor cannot take over the stored plan, or null when it can. */
function editorNote(document: HeatingZoneDocument): string | null {
    for (let z = 0; z < document.zones.length; z++) {
        const unreadable = document.zones[z].windows.findIndex((window) => toEditable(window) === null);
        if (unreadable >= 0) {
            const where = document.legacy ? '' : ' of zone ' + zoneLabel(document.zones[z].name, z);
            return 'The schedule editor cannot show window ' + (unreadable + 1) + where + ' without changing it. Edit the smart service parameters instead.';
        }
    }
    return null;
}

/** "Bath, Kitchen, Hall and 2 more" */
function deviceSummary(labels: string[]): string {
    if (labels.length <= MAX_SHOWN_DEVICES) {
        return labels.join(', ');
    }
    return labels.slice(0, MAX_SHOWN_DEVICES).join(', ') + ' and ' + (labels.length - MAX_SHOWN_DEVICES) + ' more';
}

function zoneView(zone: ResolvedZone, expanded: boolean): ZoneView {
    return {
        name: zone.name,
        devices: deviceSummary(zone.labels),
        devicesTitle: zone.labels.join(', '),
        plan: zone.plan,
        planIndex: zone.index,
        members: zone.devices.map((deviceId, i) => ({ deviceId, label: zone.labels[i] })),
        currentText: '',
        targetText: null,
        nextText: null,
        todayRow: [],
        nowPercent: 0,
        todayIndex: 0,
        expanded,
        batteries: [],
        manualText: null,
        warmingText: null,
        windowText: null,
        learningText: null,
        todayHatches: [],
        rows: buildRows(zone.plan),
    };
}

function buildRows(plan: HeatingPlan): WeekRow[] {
    return weekSegments(plan).map((segments, day) => ({
        name: WEEKDAY_NAMES[day],
        segments: segments.map((segment) => barSegment(segment, false)),
        hatches: [],
    }));
}

function daySegmentsBars(plan: HeatingPlan, weekday: number): BarSegment[] {
    return daySegments(plan, weekday).map((segment) => barSegment(segment, true));
}

/** Colour by temperature on the scale shared with the app. */
function barSegment(segment: HeatingSegment, labelled: boolean): BarSegment {
    const width = ((segment.to - segment.from) / 1440) * 100;
    return {
        left: (segment.from / 1440) * 100,
        width,
        color: temperatureColor(segment.temperature),
        title: timeText(segment.from) + '–' + timeText(segment.to) + ' ' + temperatureText(segment.temperature),
        label: labelled && width >= LABEL_MIN_PERCENT ? segment.temperature + '°' : null,
    };
}
