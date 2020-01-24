/*
 * Copyright 2019 InfAI (CC SES)
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

import {NgModule} from '@angular/core';

import {RouterModule} from '@angular/router';

import {CoreModule} from '../../core/core.module';
import {ProcessRepoComponent} from '../processes/process-repo/process-repo.component';
import {ProcessDeploymentsComponent} from '../processes/deployments/deployments.component';
import {ProcessMonitorComponent} from '../processes/monitor/monitor.component';
import {ProcessDesignerComponent} from '../processes/designer/designer.component';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule, MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatOptionModule,
    MatPaginatorModule,
    MatRadioModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule
} from '@angular/material';
import {CommonModule} from '@angular/common';
import {FlexLayoutModule} from '@angular/flex-layout';
import {DevicesModule} from '../devices/devices.module';
import {EditOutputDialogComponent} from './designer/dialogs/edit-output-dialog/edit-output-dialog.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {EditInputDialogComponent} from './designer/dialogs/edit-input-dialog/edit-input-dialog.component';
import {CycleDialogComponent} from './designer/dialogs/cycle-dialog/cycle-dialog.component';
import {DateTimeDialogComponent} from './designer/dialogs/date-time-dialog/date-time-dialog.component';
import {CycleEventConfigComponent} from './designer/event-config/cycle-event-config/cycle-event-config.component';
import {DateTimeEventConfigComponent} from './designer/event-config/date-time-event-config/date-time-event-config.component';
import {DurationDialogComponent} from './designer/dialogs/duration-dialog/duration-dialog.component';
import {DurationEventConfigComponent} from './designer/event-config/duration-event-config/duration-event-config.component';
import {HistoricDataConfigDialogComponent} from './designer/dialogs/historic-data-config-dialog/historic-data-config-dialog.component';
import {MonitorDetailsDialogComponent} from './monitor/dialogs/monitor-details-dialog.component';
import {EmailConfigDialogComponent} from './designer/dialogs/email-config-dialog/email-config-dialog.component';
import {DeploymentsMissingDependenciesDialogComponent} from './deployments/dialogs/deployments-missing-dependencies-dialog.component';
import {ProcessDeploymentsConfigComponent} from './deployments/deployments-config/deployments-config.component';
import {TaskConfigDialogComponent} from './designer/dialogs/task-config-dialog/task-config-dialog.component';
import {NotificationConfigDialogComponent} from './designer/dialogs/notification-config-dialog/notification-config-dialog.component';
import {DeploymentsConfigTimeEventComponent} from './deployments/deployments-config/components/time-event/deployments-config-time-event.component';

const processRepo = {
    path: 'processes/repository',
    pathMatch: 'full',
    component: ProcessRepoComponent,
    data: {header: 'Processes'}
};
const processDeployments = {
    path: 'processes/deployments',
    pathMatch: 'full',
    component: ProcessDeploymentsComponent,
    data: {header: 'Processes'}
};
const processDeploymentsConfig = {
    path: 'processes/deployments/config',
    pathMatch: 'full',
    component: ProcessDeploymentsConfigComponent,
    data: {header: 'Processes'}
};
const processMonitor = {
    path: 'processes/monitor',
    pathMatch: 'full',
    component: ProcessMonitorComponent,
    data: {header: 'Processes'}
};
const processDesignerEdit = {
    path: 'processes/designer/:id',
    component: ProcessDesignerComponent,
    data: {header: 'Processes'}
};
const processDesigner = {
    path: 'processes/designer',
    pathMatch: 'full',
    component: ProcessDesignerComponent,
    data: {header: 'Processes'}
};

@NgModule({
    imports: [
        RouterModule.forChild([processRepo, processDeployments, processMonitor, processDesignerEdit, processDesigner, processDeploymentsConfig]),
        FlexLayoutModule,
        CoreModule,
        CommonModule,
        MatGridListModule,
        MatButtonModule,
        MatTooltipModule,
        MatDialogModule,
        MatMenuModule,
        MatIconModule,
        MatCardModule,
        InfiniteScrollModule,
        DevicesModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        ReactiveFormsModule,
        MatDividerModule,
        MatOptionModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatCheckboxModule,
        MatRadioModule,
        MatTabsModule,
        MatChipsModule,
    ],
    declarations: [
        ProcessRepoComponent,
        ProcessDeploymentsComponent,
        ProcessDeploymentsConfigComponent,
        DeploymentsConfigTimeEventComponent,
        ProcessMonitorComponent,
        ProcessDesignerComponent,
        EditOutputDialogComponent,
        EditInputDialogComponent,
        CycleDialogComponent,
        CycleEventConfigComponent,
        DateTimeDialogComponent,
        DateTimeEventConfigComponent,
        DurationDialogComponent,
        DurationEventConfigComponent,
        HistoricDataConfigDialogComponent,
        MonitorDetailsDialogComponent,
        EmailConfigDialogComponent,
        DeploymentsMissingDependenciesDialogComponent,
        TaskConfigDialogComponent,
        NotificationConfigDialogComponent,
    ],
    entryComponents: [
        EditOutputDialogComponent,
        EditInputDialogComponent,
        CycleDialogComponent,
        DateTimeDialogComponent,
        DurationDialogComponent,
        HistoricDataConfigDialogComponent,
        MonitorDetailsDialogComponent,
        EmailConfigDialogComponent,
        DeploymentsMissingDependenciesDialogComponent,
        TaskConfigDialogComponent,
        NotificationConfigDialogComponent,
    ]
})

export class ProcessesModule {
}
