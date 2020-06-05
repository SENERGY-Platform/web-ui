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
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {FormArray, FormControl, FormGroup, Validators} from '@angular/forms';
import {ProcessSchedulerModel} from '../shared/process-scheduler.model';
import {DeploymentsModel} from '../../../modules/processes/deployments/shared/deployments.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ProcessSchedulerWidgetModel} from '../shared/process-scheduler-widget.model';
import {CronConverterService} from '../shared/cron-converter.service';


@Component({
    templateUrl: './process-scheduler-schedule-dialog.component.html',
    styleUrls: ['./process-scheduler-schedule-dialog.component.css'],
})
export class ProcessSchedulerScheduleDialogComponent implements OnInit {

    form = new FormGroup({
        id: new FormControl(''),
        days: new FormArray([
            new FormControl(false),
            new FormControl(false),
            new FormControl(false),
            new FormControl(false),
            new FormControl(false),
            new FormControl(false),
            new FormControl(false),
        ]),
        processId: new FormControl('', [Validators.required]),
        time: new FormControl('', [Validators.required])
    });

    widget: WidgetModel = {} as WidgetModel;
    deployments: DeploymentsModel[] = [];

    constructor(private dialogRef: MatDialogRef<ProcessSchedulerScheduleDialogComponent>,
                private deploymentsService: DeploymentsService,
                private cronConverterService: CronConverterService,
                @Inject(MAT_DIALOG_DATA) data: (ProcessSchedulerWidgetModel | null)) {
        if (data) {
            this.form.patchValue({
                'id': data.scheduleId,
                'time': this.cronConverterService.getLocalTime(data.cron),
                'processId': data.processId,
                'days': this.cronConverterService.getDaysAsBoolArray(data.cron)
            });
        }

    }

    ngOnInit() {
        this.deploymentsService.getAll('', 99999, 0, 'deploymentTime', 'desc').subscribe((deployments: DeploymentsModel[]) => {
            this.deployments = deployments;
        });
    }

    daySelected(): boolean {
       return this.getDays().indexOf(true) > -1;
    }

    close(): void {
        this.dialogRef.close();
    }

    compare(a: DeploymentsModel, b: string): boolean {
        return a.id === b;
    }

    save(): void {

        this.dialogRef.close({
            id: (this.form.get('id') as FormControl).value,
            cron: this.cronConverterService.getCronAsString((this.form.get('time') as FormControl).value, this.getDays()),
            process_deployment_id: (this.form.get('processId') as FormControl).value
        } as ProcessSchedulerModel);
    }

    private getDays(): boolean[] {
        return <boolean[]>(this.form.get('days') as FormArray).value;
    }

}
