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

import {Route, RouterModule} from '@angular/router';

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
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
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
import { IncidentDialogComponent } from './designer/dialogs/incident-dialog/incident-dialog.component';

const processRepo: Route = {
    path: 'processes/repository',
    pathMatch: 'full',
    component: ProcessRepoComponent,
    data: { header: 'Repository' },
};
const processDeployments: Route = {
    path: 'processes/deployments',
    pathMatch: 'full',
    component: ProcessDeploymentsComponent,
    data: { header: 'Deployments' },
};
const processDeploymentsConfig: Route = {
    path: 'processes/deployments/config',
    pathMatch: 'full',
    component: ProcessDeploymentsConfigComponent,
    data: { header: 'Deployments' },
};
const processMonitor: Route = {
    path: 'processes/monitor',
    pathMatch: 'full',
    component: ProcessMonitorComponent,
    data: { header: 'Monitor' },
};
const processDesignerEdit: Route = {
    path: 'processes/designer/:id',
    component: ProcessDesignerComponent,
    data: { header: 'Designer' },
};
const processDesigner: Route = {
    path: 'processes/designer',
    pathMatch: 'full',
    component: ProcessDesignerComponent,
    data: { header: 'Designer' },
};

const processIo: Route = {
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
        ProcessIoVariableEditDialogComponent,
        IncidentDialogComponent,
    ],
})
export class ProcessesModule {}
