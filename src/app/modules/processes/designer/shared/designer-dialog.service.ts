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

import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { EditOutputDialogComponent } from '../dialogs/edit-output-dialog/edit-output-dialog.component';
import { EditInputDialogComponent } from '../dialogs/edit-input-dialog/edit-input-dialog.component';
import { CycleDialogComponent } from '../dialogs/cycle-dialog/cycle-dialog.component';
import { Observable } from 'rxjs';
import { DateTimeDialogComponent } from '../dialogs/date-time-dialog/date-time-dialog.component';
import { DurationDialogComponent } from '../dialogs/duration-dialog/duration-dialog.component';
import { BpmnElement, BpmnParameter, DurationResult, HistoricDataConfig } from './designer.model';
import { HistoricDataConfigDialogComponent } from '../dialogs/historic-data-config-dialog/historic-data-config-dialog.component';
import { EmailConfigDialogComponent } from '../dialogs/email-config-dialog/email-config-dialog.component';
import {
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel,
} from '../../../metadata/device-types-overview/shared/device-type-selection.model';
import { TaskConfigDialogComponent } from '../dialogs/task-config-dialog/task-config-dialog.component';
import { NotificationConfigDialogComponent } from '../dialogs/notification-config-dialog/notification-config-dialog.component';
import {ConditionalEventEditModel, FilterCriteriaDialogResultModel} from './designer-dialog.model';
import { FilterCriteriaDialogComponent } from '../dialogs/filter-criteria-dialog/filter-criteria-dialog.component';
import {ProcessIoDesignerInfo} from '../../process-io/shared/process-io.model';
import {ProcessIoDesignerDialogComponent} from '../dialogs/process-io-designer-dialog/process-io-designer-dialog.component';
import {ConditionalEventDialogComponent} from '../dialogs/conditional-event-dialog/conditional-event-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class DesignerDialogService {
    constructor(private dialog: MatDialog) {}

    openEditOutputDialog(outputs: BpmnParameter[], callback: () => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = { outputs };
        const editDialogRef = this.dialog.open(EditOutputDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe(() => {
            callback();
        });
    }

    openEditInputDialog(inputElement: BpmnElement, callback: () => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { inputElement };
        const editDialogRef = this.dialog.open(EditInputDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe(() => {
            callback();
        });
    }

    openCycleDialog(initialCycle: string): Observable<{ cron: string; text: string }> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { initialCycle };
        const editDialogRef = this.dialog.open(CycleDialogComponent, dialogConfig);
        return editDialogRef.afterClosed();
    }

    openDateTimeDialog(initialDateTime: string): Observable<{ iso: string; text: string }> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { initialDateTime };
        const editDialogRef = this.dialog.open(DateTimeDialogComponent, dialogConfig);
        return editDialogRef.afterClosed();
    }

    openDurationDialog(initialDuration: string): Observable<DurationResult> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { initialDuration };
        const editDialogRef = this.dialog.open(DurationDialogComponent, dialogConfig);
        return editDialogRef.afterClosed();
    }

    openHistoricDataConfigDialog(existingConfig: HistoricDataConfig, callback: (result: HistoricDataConfig) => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { initial: existingConfig };
        const editDialogRef = this.dialog.open(HistoricDataConfigDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe((value) => {
            if (value) {
                callback(value);
            }
        });
    }

    openEmailConfigDialog(to: string, subj: string, content: string, callback: (to_: string, subj_: string, content_: string) => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { to, subj, content };
        const editDialogRef = this.dialog.open(EmailConfigDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe((value: { to: string; subj: string; content: string }) => {
            if (value) {
                callback(value.to, value.subj, value.content);
            }
        });
    }

    openNotificationConfigDialog(subj: string, content: string, callback: (subj_: string, content_: string) => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = { subj, content };
        const editDialogRef = this.dialog.open(NotificationConfigDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe((value: { subj: string; content: string }) => {
            if (value) {
                callback(value.subj, value.content);
            }
        });
    }

    openTaskConfigDialog(defaultSelection: DeviceTypeSelectionRefModel): Observable<DeviceTypeSelectionResultModel> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = { selection: JSON.parse(JSON.stringify(defaultSelection || null)) }; // create copy of object
        return this.dialog.open(TaskConfigDialogComponent, dialogConfig).afterClosed();
    }

    openConditionalEventDialog(msg: ConditionalEventEditModel): Observable<ConditionalEventEditModel> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = { msg };
        return this.dialog.open(ConditionalEventDialogComponent, dialogConfig).afterClosed();
    }

    openProcessIoDialog(info: ProcessIoDesignerInfo): Observable<ProcessIoDesignerInfo | null> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = { info };
        return this.dialog.open(ProcessIoDesignerDialogComponent, dialogConfig).afterClosed();
    }
}
