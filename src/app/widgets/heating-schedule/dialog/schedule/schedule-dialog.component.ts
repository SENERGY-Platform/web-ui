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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialogActions, MatDialogContent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { DialogHeaderComponent } from 'src/app/core/components/dialog-header/dialog-header.component';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { HeatingPlanError, HeatingWindow, WEEKDAY_NAMES, minutesOf } from '../../shared/heating-schedule.plan';
import { HeatingScheduleService } from '../../shared/heating-schedule.service';
import { HeatingThermostat, HeatingZone, resolveZones, serialiseZones, zoneLabel } from '../../shared/heating-schedule.zones';

export interface HeatingScheduleDialogData {
    instance: SmartServiceInstanceModel;
    /** the stored zones; the legacy shape comes as one rest zone */
    zones: HeatingZone[];
    setback: number;
    thermostats: HeatingThermostat[];
}

/** A window as the form holds it; `allDay` stands for from == to. */
export interface EditableWindow {
    weekdays: number[];
    from: string;
    to: string;
    temperature: number | null;
    allDay: boolean;
}

export const MIN_TEMPERATURE = 5;
export const MAX_TEMPERATURE = 30;

export const RESTART_NOTE = 'Saving restarts the heating control and sets the temperature of the plan right away.';

/**
 * The time input cannot show 24:00. An end of 24:00 is written as 00:00, which covers the same minutes, and
 * 24:00 to 24:00 is a whole day. A start of 24:00 with another end has no such form: null.
 */
export function toEditable(window: HeatingWindow): EditableWindow | null {
    if (window.from === '24:00' && window.to !== '24:00') {
        return null;
    }
    const from = window.from === '24:00' ? '00:00' : window.from;
    const to = window.to === '24:00' ? '00:00' : window.to;
    return {
        weekdays: [...window.weekdays],
        from,
        to,
        temperature: window.temperature,
        allDay: window.from === window.to || (from === '00:00' && to === '00:00'),
    };
}

export function newWindow(): EditableWindow {
    return { weekdays: [0, 1, 2, 3, 4], from: '06:00', to: '08:00', temperature: 20, allDay: false };
}

function validTemperature(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value >= MIN_TEMPERATURE && value <= MAX_TEMPERATURE && Number.isInteger(value * 2);
}

/** A zone as the form holds it; `rest` stands for no device list, `ownSetback` for a setback of its own. */
export interface EditableZone {
    name: string;
    rest: boolean;
    devices: string[];
    windows: EditableWindow[];
    ownSetback: boolean;
    setback: number | null;
}

function windowsProblem(windows: EditableWindow[], where: string): string | null {
    for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        const name = where + 'Window ' + (i + 1) + ': ';
        if (window.weekdays.length === 0) {
            return name + 'choose at least one weekday.';
        }
        if (!window.allDay) {
            if (minutesOf(window.from) === undefined || minutesOf(window.to) === undefined) {
                return name + 'enter a start and an end time.';
            }
            if (window.from === window.to) {
                return name + 'start and end are equal. Use "All day" for a whole day.';
            }
        }
        if (!validTemperature(window.temperature)) {
            return name + 'the temperature must be between 5 and 30 °C in steps of 0.5.';
        }
    }
    return null;
}

function setbackProblem(setback: number | null, name: string): string | null {
    if (setback === null || !Number.isInteger(setback) || setback < MIN_TEMPERATURE || setback > MAX_TEMPERATURE) {
        return name + ' must be a whole number between 5 and 30 °C.';
    }
    return null;
}

/** The first problem that would make the plan invalid or ambiguous, or null. */
export function validate(windows: EditableWindow[], setback: number | null): string | null {
    return windowsProblem(windows, '') ?? setbackProblem(setback, 'The setback temperature');
}

export function newZone(index: number): EditableZone {
    return { name: 'Zone ' + (index + 1), rest: false, devices: [], windows: [newWindow()], ownSetback: false, setback: null };
}

/** The stored zones as the form holds them, or null when a window has no form. Device ids that are not selected stay and are written back. */
export function toEditableZones(zones: HeatingZone[], globalSetback: number): EditableZone[] | null {
    const result: EditableZone[] = [];
    for (const zone of zones) {
        const windows = zone.windows.map(toEditable);
        if (windows.some((window) => window === null)) {
            return null;
        }
        result.push({
            name: zone.name,
            rest: zone.devices === null,
            devices: [...(zone.devices ?? [])],
            windows: windows as EditableWindow[],
            ownSetback: zone.setback !== null,
            setback: zone.setback ?? globalSetback,
        });
    }
    return result;
}

export function toZones(zones: EditableZone[]): HeatingZone[] {
    return zones.map((zone) => ({
        name: zone.name.trim(),
        devices: zone.rest ? null : [...zone.devices],
        windows: toWindows(zone.windows),
        setback: zone.ownSetback ? (zone.setback as number) : null,
    }));
}

/** The first problem of the zone list before it is saved, or null. */
export function validateZones(zones: EditableZone[], setback: number | null, thermostats: HeatingThermostat[]): string | null {
    const global = setbackProblem(setback, 'The setback temperature');
    if (global !== null) {
        return global;
    }
    for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        const label = zoneLabel(zone.name, i);
        const problem = windowsProblem(zone.windows, label + ', ') ?? (zone.ownSetback ? setbackProblem(zone.setback, label + ': the own setback temperature') : null);
        if (problem !== null) {
            return problem;
        }
    }
    const seen = new Set<string>();
    for (let i = 0; i < zones.length; i++) {
        const label = zoneLabel(zones[i].name, i);
        if (seen.has(label)) {
            return 'Zone names must be unique: ' + label + '.';
        }
        seen.add(label);
    }
    try {
        resolveZones(toZones(zones), setback, thermostats);
    } catch (error) {
        return error instanceof HeatingPlanError ? error.message : 'The zones cannot be saved.';
    }
    return null;
}

export function toWindows(windows: EditableWindow[]): HeatingWindow[] {
    return windows.map((window) => ({
        weekdays: [...window.weekdays].sort((a, b) => a - b),
        from: window.allDay ? '00:00' : window.from,
        to: window.allDay ? '00:00' : window.to,
        temperature: window.temperature as number,
    }));
}

@Component({
    selector: 'senergy-heating-schedule-dialog',
    templateUrl: './schedule-dialog.component.html',
    styleUrls: ['./schedule-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, DialogHeaderComponent, MatDialogContent, MatDialogActions, MatButton, MatIconButton, MatIcon, MatInput, MatFormField, MatLabel, MatSuffix, MatButtonToggleGroup, MatButtonToggle, MatSlideToggle, MatCheckbox]
})
export class HeatingScheduleDialogComponent {
    private dialogRef = inject<MatDialogRef<HeatingScheduleDialogComponent, boolean>>(MatDialogRef);
    private data = inject<HeatingScheduleDialogData>(MAT_DIALOG_DATA);
    private dialogsService = inject(DialogsService);
    private service = inject(HeatingScheduleService);

    readonly weekdayNames = WEEKDAY_NAMES;
    readonly minTemperature = MIN_TEMPERATURE;
    readonly maxTemperature = MAX_TEMPERATURE;

    readonly thermostats = this.data.thermostats;
    /** empty when a stored window has no form; the widget does not offer the editor then */
    zones: EditableZone[] = toEditableZones(this.data.zones, this.data.setback) ?? [];
    setback: number | null = this.data.setback;
    saving = false;

    get problem(): string | null {
        return validateZones(this.zones, this.setback, this.thermostats);
    }

    zoneLabel(zone: EditableZone): string {
        return zoneLabel(zone.name, this.zones.indexOf(zone));
    }

    addZone(): void {
        const used = new Set(this.zones.map((zone) => this.zoneLabel(zone)));
        let index = this.zones.length;
        while (used.has('Zone ' + (index + 1))) {
            index++;
        }
        this.zones.push(newZone(index));
    }

    removeZone(index: number): void {
        if (this.zones.length > 1) {
            this.zones.splice(index, 1);
        }
    }

    addWindow(zone: EditableZone): void {
        zone.windows.push(newWindow());
    }

    removeWindow(zone: EditableZone, index: number): void {
        zone.windows.splice(index, 1);
    }

    /** True while another zone takes all other thermostats, so this one cannot. */
    restElsewhere(zone: EditableZone): boolean {
        return !zone.rest && this.zones.some((other) => other.rest);
    }

    setRest(zone: EditableZone, rest: boolean): void {
        // the device ids stay, hidden, so that switching the toggle off again restores them
        zone.rest = rest;
    }

    /** The label of the zone that has the thermostat, when it is not this one. */
    takenBy(zone: EditableZone, deviceId: string): string | null {
        const index = this.zones.findIndex((other) => other !== zone && !other.rest && other.devices.includes(deviceId));
        return index < 0 ? null : this.zoneLabel(this.zones[index]);
    }

    setDevice(zone: EditableZone, deviceId: string, checked: boolean): void {
        zone.devices = checked ? [...zone.devices.filter((id) => id !== deviceId), deviceId] : zone.devices.filter((id) => id !== deviceId);
    }

    close(): void {
        if (this.saving) {
            return;
        }
        this.dialogRef.close(false);
    }

    save(): void {
        if (this.problem !== null || this.saving) {
            return;
        }
        const schedule = serialiseZones(toZones(this.zones));
        const setback = this.setback as number;
        this.dialogsService.openConfirmDialog('Save heating schedule', RESTART_NOTE).afterClosed().subscribe((confirmed) => {
            if (!confirmed) {
                return;
            }
            // a save in flight must end in a reload of the widget, so the dialog cannot be dismissed meanwhile
            this.saving = true;
            this.dialogRef.disableClose = true;
            this.service.saveSchedule(this.data.instance.id, schedule, setback).subscribe((saved) => {
                this.saving = false;
                this.dialogRef.disableClose = false;
                if (saved) {
                    this.dialogRef.close(true);
                }
            });
        });
    }
}
