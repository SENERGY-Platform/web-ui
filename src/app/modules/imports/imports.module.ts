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
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {ImportTypesComponent} from './import-types/import-types.component';
import {ImportInstancesComponent} from './import-instances/import-instances.component';
import {WidgetModule} from '../../widgets/widget.module';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {FlexModule} from '@angular/flex-layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {CoreModule} from '../../core/core.module';
import {MatDividerModule} from '@angular/material/divider';
import {MatSelectModule} from '@angular/material/select';
import {ImportTypesCreateEditComponent} from './import-types-create-edit/import-types-create-edit.component';
import {ContentVariableDialogComponent} from './import-types-create-edit/content-variable-dialog/content-variable-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import {MatTreeModule} from '@angular/material/tree';
import {ImportDeployEditDialogComponent} from './import-deploy-edit-dialog/import-deploy-edit-dialog.component';


const types = {
    path: 'imports/types/list',
    pathMatch: 'full',
    component: ImportTypesComponent,
    data: {header: 'Import Types'}
};
const editType = {
    path: 'imports/types/edit/:id',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: {header: 'Edit Import Type'}
};
const detailsType = {
    path: 'imports/types/details/:id',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: {header: 'View Import Type'}
};
const createType = {
    path: 'imports/types/new',
    pathMatch: 'full',
    component: ImportTypesCreateEditComponent,
    data: {header: 'Create Import Type'}
};
const instances = {
    path: 'imports/instances',
    pathMatch: 'full',
    component: ImportInstancesComponent,
    data: {header: 'Imports'}
};


@NgModule({
    declarations: [
        ImportTypesComponent,
        ImportInstancesComponent,
        ImportTypesCreateEditComponent,
        ContentVariableDialogComponent,
        ImportDeployEditDialogComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild([
                types,
                instances,
                editType,
                createType,
                detailsType,
            ]
        ),
        WidgetModule,
        MatSortModule,
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
        MatSelectModule,
        MatDialogModule,
        MatTreeModule,
    ]
})

export class ImportsModule {
}
