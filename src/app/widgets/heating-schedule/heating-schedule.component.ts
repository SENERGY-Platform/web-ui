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
import { Subscription, interval } from 'rxjs';
import { dialogSize } from 'src/app/core/dialog-size';
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
    WEEKDAY_NAMES,
    nextSwitch,
    nextSwitchText,
    parseSetback,
    target,
    temperatureText,
    timeText,
    weekSegments,
} from './shared/heating-schedule.plan';
import { HeatingScheduleService } from './shared/heating-schedule.service';
import { HeatingThermostat, HeatingZoneDocument, ResolvedZone, parseThermostats, parseZoneDocument, resolveZones, zoneLabel } from './shared/heating-schedule.zones';

/** A bar segment of the week overview; position and size in percent of the day. */
export interface BarSegment {
    left: number;
    width: number;
    color: string;
    title: string;
}

export interface WeekRow {
    name: string;
    segments: BarSegment[];
}

/** A zone as the widget shows it. */
export interface ZoneView {
    name: string;
    /** the thermostats of the zone, shortened; the full list is the title */
    devices: string;
    devicesTitle: string;
    plan: HeatingPlan;
    currentText: string;
    nextText: string | null;
    rows: WeekRow[];
}

const MAX_SHOWN_DEVICES = 3;

const LOAD_ERROR = 'The heating schedule could not be loaded.';

@Component({
    selector: 'senergy-heating-schedule',
    templateUrl: './heating-schedule.component.html',
    styleUrls: ['./heating-schedule.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, MatCardContent, MatButton, WidgetHeaderComponent, WidgetSpinnerComponent, WidgetFooterComponent]
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
    /** the stored schedule and the thermostats the editor starts from */
    document: HeatingZoneDocument | null = null;
    setback = 0;
    thermostats: HeatingThermostat[] = [];
    zones: ZoneView[] = [];
    /** why the editor cannot take over the stored plan, if it cannot */
    editorNote: string | null = null;
    readonly hours = [0, 6, 12, 18, 24];

    private initSubscription = new Subscription();
    private loadSubscription = new Subscription();
    private tickSubscription = new Subscription();
    private dashboardService = inject(DashboardService);
    private instanceService = inject(SmartServiceInstanceService);
    private service = inject(HeatingScheduleService);
    private dialog = inject(MatDialog);

    ngOnInit(): void {
        this.initSubscription = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.load();
            }
        });
        // the current target and the next switch move with the clock, the stored plan does not
        this.tickSubscription = interval(60000).subscribe(() => this.updateNow());
    }

    ngOnDestroy(): void {
        this.initSubscription.unsubscribe();
        this.loadSubscription.unsubscribe();
        this.tickSubscription.unsubscribe();
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
        this.rawSchedule = null;
        this.document = null;
        this.zones = [];
        this.loadError = message;
        this.finishLoad();
    }

    private show(instance: SmartServiceInstanceModel): void {
        this.instance = instance;
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
            this.zones = resolveZones(document.zones, setback, thermostats, document.legacy).map((zone) => zoneView(zone));
            this.document = document;
            this.setback = setback;
            this.thermostats = thermostats;
            this.loadError = null;
            this.editorNote = editorNote(document);
            this.updateNow();
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

    private updateNow(): void {
        const now = Date.now();
        for (const zone of this.zones) {
            zone.currentText = temperatureText(target(zone.plan, now));
            const next = nextSwitch(zone.plan, now);
            zone.nextText = next === null ? null : nextSwitchText(next, now);
        }
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

function zoneView(zone: ResolvedZone): ZoneView {
    return {
        name: zone.name,
        devices: deviceSummary(zone.labels),
        devicesTitle: zone.labels.join(', '),
        plan: zone.plan,
        currentText: '',
        nextText: null,
        rows: buildRows(zone.plan),
    };
}

function buildRows(plan: HeatingPlan): WeekRow[] {
    const week = weekSegments(plan);
    const temperatures = week.flat().map((segment) => segment.temperature);
    const low = Math.min(...temperatures);
    const high = Math.max(...temperatures);
    return week.map((segments, day) => ({
        name: WEEKDAY_NAMES[day],
        segments: segments.map((segment) => barSegment(segment, low, high)),
    }));
}

/** Warmer segments get a stronger tint; a plan with one temperature only gets the middle tint. */
function barSegment(segment: HeatingSegment, low: number, high: number): BarSegment {
    const strength = high === low ? 50 : 15 + (85 * (segment.temperature - low)) / (high - low);
    return {
        left: (segment.from / 1440) * 100,
        width: ((segment.to - segment.from) / 1440) * 100,
        color: 'color-mix(in srgb, var(--mat-sys-primary) ' + Math.round(strength) + '%, transparent)',
        title: timeText(segment.from) + '–' + timeText(segment.to) + ' ' + temperatureText(segment.temperature),
    };
}
