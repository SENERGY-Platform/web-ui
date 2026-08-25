/*
 * Copyright 2026 InfAI (CC SES)
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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CoreModule } from '../../core/core.module';
import { EnvironmentsComponent } from './environments.component';
import { EnvironmentDetailComponent } from './environment-detail/environment-detail.component';
import { EnvironmentsCreateDialogComponent } from './dialogs/environments-create-dialog.component';
import { EnvironmentsAddMachineDialogComponent } from './environment-detail/dialogs/environments-add-machine-dialog.component';
import { EnvironmentsAddContextDialogComponent } from './environment-detail/dialogs/environments-add-context-dialog.component';
import { EnvironmentsProfileEditorComponent } from './environment-detail/profile-editor/environments-profile-editor.component';
import { EnvironmentsDatasetEditorComponent } from './environment-detail/dataset-editor/environments-dataset-editor.component';
import { EnvironmentsKeyValueEditorComponent } from './key-value-editor/environments-key-value-editor.component';
import { EnvironmentsDatasetsComponent } from './datasets/environments-datasets.component';
import { EnvironmentsDatasetUploadDialogComponent } from './datasets/dialogs/environments-dataset-upload-dialog.component';

const environments: Route = {
    path: 'environments',
    pathMatch: 'full',
    component: EnvironmentsComponent,
    data: { header: 'Environments' },
};
// Must be registered before environmentDetail: both are pathMatch 'full', and the router
// takes the first match in array order, so 'environments/:id' would otherwise swallow
// 'environments/datasets' with id="datasets". See environments.module.spec.ts.
const environmentDatasets: Route = {
    path: 'environments/datasets',
    pathMatch: 'full',
    component: EnvironmentsDatasetsComponent,
    data: { header: 'Datasets' },
};
const environmentDetail: Route = {
    path: 'environments/:id',
    pathMatch: 'full',
    component: EnvironmentDetailComponent,
    data: { header: 'Environments' },
};

export const ENVIRONMENTS_ROUTES: Route[] = [environments, environmentDatasets, environmentDetail];

const formFieldDefaults = {
    // 'fixed' reserves exactly one hint line; our explanations wrap, and with
    // 'fixed' they overlap whatever comes below the field
    subscriptSizing: 'dynamic' as const,
};

@NgModule({
    providers: [{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: formFieldDefaults }],
    declarations: [
        EnvironmentsComponent,
        EnvironmentDetailComponent,
        EnvironmentsCreateDialogComponent,
        EnvironmentsAddMachineDialogComponent,
        EnvironmentsAddContextDialogComponent,
        EnvironmentsProfileEditorComponent,
        EnvironmentsDatasetEditorComponent,
        EnvironmentsKeyValueEditorComponent,
        EnvironmentsDatasetsComponent,
        EnvironmentsDatasetUploadDialogComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        FlexLayoutModule,
        CoreModule,
        RouterModule.forChild(ENVIRONMENTS_ROUTES),
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSnackBarModule,
        MatTreeModule,
        MatButtonToggleModule,
        MatBadgeModule,
        MatCheckboxModule,
        MatDividerModule,
        MatTabsModule,
        MatExpansionModule,
        MtxSelectModule,
        NgApexchartsModule,
    ],
})
export class EnvironmentsModule { }
