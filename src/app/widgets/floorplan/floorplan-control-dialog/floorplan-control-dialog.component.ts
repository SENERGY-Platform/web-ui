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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { CapabilityCommandModel } from '../shared/capability-control/capability-control.component';
import { FloorplanControlModel } from '../shared/floorplan.model';

export interface FloorplanControlDialogData {
    alias: string;
    controls: FloorplanControlModel[];
    run: (command: CapabilityCommandModel) => Observable<unknown>;
}

/** Operates every controlling function configured for one placement */
@Component({
    selector: 'senergy-floorplan-control-dialog',
    templateUrl: './floorplan-control-dialog.component.html',
    styleUrl: './floorplan-control-dialog.component.css'
})
export class FloorplanControlDialogComponent {
    alias = '';
    controls: FloorplanControlModel[] = [];

    private run: (command: CapabilityCommandModel) => Observable<unknown>;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: FloorplanControlDialogData,
        private dialogRef: MatDialogRef<FloorplanControlDialogComponent>,
    ) {
        this.alias = data.alias;
        this.controls = data.controls;
        this.run = data.run;
    }

    /**
     * The controls keep the value the user set them to, instead of being rebuilt from the reading that
     * follows the command: a curtain still travelling reports the position it is leaving, which would
     * pull the slider back under the user's hand. The widget itself refreshes behind the dialog.
     */
    perform(command: CapabilityCommandModel): void {
        // a failing command must not leave the dialog unable to send the next one
        this.run(command).subscribe({ error: err => console.error('Floorplan: Could not run the command', err) });
    }

    close(): void {
        this.dialogRef.close();
    }
}
