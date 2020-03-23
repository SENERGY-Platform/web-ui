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

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';
import {DashboardModel} from '../shared/dashboard.model';

@Component({
    templateUrl: './dashboard-edit-dialog.component.html',
    styleUrls: ['./dashboard-edit-dialog.component.css']
})
export class DashboardEditDialogComponent {

    dashboard: DashboardModel;
    formControl = new FormControl('', [Validators.required, Validators.minLength(1)]);

    constructor(private dialogRef: MatDialogRef<DashboardEditDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: { dashboard: DashboardModel}) {
        this.dashboard = data.dashboard;
        this.formControl.setValue(this.dashboard.name);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dashboard.name = this.formControl.value;
        this.dialogRef.close(this.dashboard);
    }

}
