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
import { DateTimeEventConfigComponent } from '../../event-config/date-time-event-config/date-time-event-config.component';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './date-time-dialog.component.html',
    styleUrls: ['./date-time-dialog.component.css'],
    selector: 'senergy-date-time-dialog',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, DateTimeEventConfigComponent, MatDialogActions, MatButton]
})
export class DateTimeDialogComponent {
    private dialogRef = inject<MatDialogRef<DateTimeDialogComponent>>(MatDialogRef);
    private dialogParams = inject<{
        initialDateTime: string;
    }>(MAT_DIALOG_DATA);

    initial: string;
    result = { iso: '', text: '' };

    constructor() {
        const dialogParams = this.dialogParams;

        this.initial = dialogParams.initialDateTime || '';
    }

    update(updateEvent: { iso: string; text: string }) {
        this.result = updateEvent;
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.result);
    }
}
