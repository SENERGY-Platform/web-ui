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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { ProcessIncidentsModel } from '../../incidents/shared/process-incidents.model';

@Component({
    templateUrl: './monitor-details-dialog.component.html',
    styleUrls: ['./monitor-details-dialog.component.css'],
})
export class MonitorDetailsDialogComponent implements OnInit {
    incidents: ProcessIncidentsModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<MonitorDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { incident: ProcessIncidentsModel[] },
    ) {
        this.incidents = data.incident;
    }

    ngOnInit() {}

    ok(): void {
        this.dialogRef.close();
    }
}
