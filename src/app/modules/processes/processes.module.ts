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

import { NgModule } from '@angular/core';

import { RouterModule } from '@angular/router';

import { CoreModule } from '../../core/core.module';
import { ProcessRepoComponent } from '../processes/process-repo/process-repo.component';
import { ProcessDeploymentsComponent } from '../processes/deployments/deployments.component';
import { ProcessMonitorComponent } from '../processes/monitor/monitor.component';
import { ProcessDesignerComponent } from '../processes/designer/designer.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DevicesModule } from '../devices/devices.module';
import { EditOutputDialogComponent } from './designer/dialogs/edit-output-dialog/edit-output-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditInputDialogComponent } from './designer/dialogs/edit-input-dialog/edit-input-dialog.component';
import { CycleDialogComponent } from './designer/dialogs/cycle-dialog/cycle-dialog.component';
import { DateTimeDialogComponent } from './designer/dialogs/date-time-dialog/date-time-dialog.component';
import { CycleEventConfigComponent } from './designer/event-config/cycle-event-config/cycle-event-config.component';
import { DateTimeEventConfigComponent } from './designer/event-config/date-time-event-config/date-time-event-config.component';
import { DurationDialogComponent } from './designer/dialogs/duration-dialog/duration-dialog.component';
import { DurationEventConfigComponent } from './designer/event-config/duration-event-config/duration-event-config.component';
import { HistoricDataConfigDialogComponent } from './designer/dialogs/historic-data-config-dialog/historic-data-config-dialog.component';
import { MonitorDetailsDialogComponent } from './monitor/dialogs/monitor-details-dialog.component';
import { EmailConfigDialogComponent } from './designer/dialogs/email-config-dialog/email-config-dialog.component';
import { DeploymentsMissingDependenciesDialogComponent } from './deployments/dialogs/deployments-missing-dependencies-dialog.component';
import { ProcessDeploymentsConfigComponent } from './deployments/deployments-config/deployments-config.component';
import { TaskConfigDialogComponent } from './designer/dialogs/task-config-dialog/task-config-dialog.component';
import { NotificationConfigDialogComponent } from './designer/dialogs/notification-config-dialog/notification-config-dialog.component';
import { DeploymentsConfigTimeEventComponent } from './deployments/deployments-config/components/time-event/deployments-config-time-event.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { DesignerSnackBarComponent } from './designer/snack-bar/designer-snack-bar.component';
import { MatBadgeModule } from '@angular/material/badge';
import { FilterCriteriaDialogComponent } from './designer/dialogs/filter-criteria-dialog/filter-criteria-dialog.component';
import { DeploymentsStartParameterDialogComponent } from './deployments/dialogs/deployments-start-parameter-dialog.component';
import {ProcessIoDesignerDialogComponent} from './designer/dialogs/process-io-designer-dialog/process-io-designer-dialog.component';
import {MatExpansionModule} from '@angular/material/expansion';
import {ProcessIoVariablesComponent} from './process-io/variables/variables.component';
import {ShortKeyPipe} from './process-io/shared/short-key.pipe';
import {ProcessIoVariableEditDialogComponent} from './process-io/dialogs/process-io-variable-edit-dialog.component';
import {ConditionalEventDialogComponent} from './designer/dialogs/conditional-event-dialog/conditional-event-dialog.component';

const processRepo = {
    path: 'processes/repository',
    pathMatch: 'full',
    component: ProcessRepoComponent,
    data: { header: 'Repository' },
};
const processDeployments = {
    path: 'processes/deployments',
    pathMatch: 'full',
    component: ProcessDeploymentsComponent,
    data: { header: 'Deployments' },
};
const processDeploymentsConfig = {
    path: 'processes/deployments/config',
    pathMatch: 'full',
    component: ProcessDeploymentsConfigComponent,
    data: { header: 'Deployments' },
};
const processMonitor = {
    path: 'processes/monitor',
    pathMatch: 'full',
    component: ProcessMonitorComponent,
    data: { header: 'Monitor' },
};
const processDesignerEdit = {
    path: 'processes/designer/:id',
    component: ProcessDesignerComponent,
    data: { header: 'Designer' },
};
const processDesigner = {
    path: 'processes/designer',
    pathMatch: 'full',
    component: ProcessDesignerComponent,
    data: { header: 'Designer' },
};

const processIo = {
    path: 'processes/io',
    pathMatch: 'full',
    component: ProcessIoVariablesComponent,
    data: { header: 'Process-IO' },
};

@NgModule({
    imports: [
        RouterModule.forChild([
            processRepo,
            processDeployments,
            processMonitor,
            processDesignerEdit,
            processDesigner,
            processDeploymentsConfig,
            processIo
        ]),
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
        MatBadgeModule,
        MatExpansionModule,
    ],
    declarations: [
        ProcessRepoComponent,
        ProcessDeploymentsComponent,
        DeploymentsStartParameterDialogComponent,
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
        FilterCriteriaDialogComponent,
        ConditionalEventDialogComponent,
        NotificationConfigDialogComponent,
        DesignerSnackBarComponent,
        ProcessIoDesignerDialogComponent,
        ProcessIoVariablesComponent,
        ShortKeyPipe,
        ProcessIoVariableEditDialogComponent
    ],
})
export class ProcessesModule {}
