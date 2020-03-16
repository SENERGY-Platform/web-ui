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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  templateUrl: './date-time-dialog.component.html',
  styleUrls: ['./date-time-dialog.component.css']
})
export class DateTimeDialogComponent implements OnInit {
    initial: string;
    result = {iso: '', text: ''};

    constructor(
        private dialogRef: MatDialogRef<DateTimeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: {initialDateTime: string}
    ) {
        this.initial = dialogParams.initialDateTime || '';
    }

    update(updateEvent: {iso: string, text: string}) {
        this.result = updateEvent;
    }

    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.result);
    }
}
