/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { CycleEventConfigComponent } from '../../event-config/cycle-event-config/cycle-event-config.component';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './cycle-dialog.component.html',
    styleUrls: ['./cycle-dialog.component.css'],
    selector: 'senergy-cycle-dialog',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, CycleEventConfigComponent, MatDialogActions, MatButton]
})
export class CycleDialogComponent {
    private dialogRef = inject<MatDialogRef<CycleDialogComponent>>(MatDialogRef);
    private dialogParams = inject<{
        initialCycle: string;
    }>(MAT_DIALOG_DATA);

    initial: string;
    result = { cron: '', text: '' };

    constructor() {
        const dialogParams = this.dialogParams;

        this.initial = dialogParams.initialCycle || '* * * * * ?';
    }

    update(updateEvent: { cron: string; text: string }) {
        this.result = updateEvent;
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.result);
    }
}
