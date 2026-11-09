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
import { MatDialogActions, MatDialogContent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { DialogHeaderComponent } from 'src/app/core/components/dialog-header/dialog-header.component';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { HeatingPlan, HeatingWindow, WEEKDAY_NAMES, minutesOf, serialiseSchedule } from '../../shared/heating-schedule.plan';
import { HeatingScheduleService } from '../../shared/heating-schedule.service';

export interface HeatingScheduleDialogData {
    instance: SmartServiceInstanceModel;
    plan: HeatingPlan;
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

/** The first problem that would make the plan invalid or ambiguous, or null. */
export function validate(windows: EditableWindow[], setback: number | null): string | null {
    for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        const name = 'Window ' + (i + 1) + ': ';
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
    if (setback === null || !Number.isInteger(setback) || setback < MIN_TEMPERATURE || setback > MAX_TEMPERATURE) {
        return 'The setback temperature must be a whole number between 5 and 30 °C.';
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
    imports: [FormsModule, DialogHeaderComponent, MatDialogContent, MatDialogActions, MatButton, MatIconButton, MatIcon, MatInput, MatFormField, MatLabel, MatSuffix, MatButtonToggleGroup, MatButtonToggle, MatSlideToggle]
})
export class HeatingScheduleDialogComponent {
    private dialogRef = inject<MatDialogRef<HeatingScheduleDialogComponent, boolean>>(MatDialogRef);
    private data = inject<HeatingScheduleDialogData>(MAT_DIALOG_DATA);
    private dialogsService = inject(DialogsService);
    private service = inject(HeatingScheduleService);

    readonly weekdayNames = WEEKDAY_NAMES;
    readonly minTemperature = MIN_TEMPERATURE;
    readonly maxTemperature = MAX_TEMPERATURE;

    windows: EditableWindow[] = this.data.plan.windows.map(toEditable).filter((window): window is EditableWindow => window !== null);
    setback: number | null = this.data.plan.setback;
    saving = false;

    get problem(): string | null {
        return validate(this.windows, this.setback);
    }

    add(): void {
        this.windows.push(newWindow());
    }

    remove(index: number): void {
        this.windows.splice(index, 1);
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
        const schedule = serialiseSchedule(toWindows(this.windows));
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
