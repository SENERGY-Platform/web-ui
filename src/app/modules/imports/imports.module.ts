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
import { CommonModule } from '@angular/common';
import {Route, RouterModule} from '@angular/router';
import { ImportTypesComponent } from './import-types/import-types.component';
import { ImportInstancesComponent } from './import-instances/import-instances.component';
import { WidgetModule } from '../../widgets/widget.module';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { FlexModule } from '@ngbracket/ngx-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CoreModule } from '../../core/core.module';
import { MatDividerModule } from '@angular/material/divider';
import { ImportTypesCreateEditComponent } from './import-types-create-edit/import-types-create-edit.component';
import { ContentVariableDialogComponent } from './import-types-create-edit/content-variable-dialog/content-variable-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTreeModule } from '@angular/material/tree';
import { ImportDeployEditDialogComponent } from './import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import { ImportInstanceExportDialogComponent } from './import-instances/import-instance-export-dialog/import-instance-export-dialog.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MtxOption, MtxSelect } from '@ng-matero/extensions/select';

const types: Route = {
    path: 'imports/types/list',
    pathMatch: 'full',
    component: ImportTypesComponent,
    data: { header: 'Types' },
};
const editType: Route = {
    path: 'imports/types/edit/:id',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: { header: 'Types' },
};
const detailsType: Route = {
    path: 'imports/types/details/:id',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: { header: 'Types' },
};
const createType: Route = {
    path: 'imports/types/new',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: { header: 'Types' },
};
const instances: Route = {
    path: 'imports/instances',
    pathMatch: 'full',
    component: ImportInstancesComponent,
    data: { header: 'Instances' },
};

@NgModule({
    declarations: [
        ImportTypesComponent,
        ImportInstancesComponent,
        ImportTypesCreateEditComponent,
        ContentVariableDialogComponent,
        ImportDeployEditDialogComponent,
        ImportInstanceExportDialogComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild([types, instances, editType, createType, detailsType]),
        WidgetModule,
        MatSortModule,
        MatPaginatorModule,
        MatTableModule,
        FlexModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatInputModule,
        InfiniteScrollModule,
        MatCheckboxModule,
        CoreModule,
        MatDividerModule,
        MatDialogModule,
        MatTreeModule,
        MtxSelect,
        MtxOption,
    ],
})
export class ImportsModule {}
