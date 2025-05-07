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
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { DevicesModule } from '../devices/devices.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import {SmartServiceReleasesComponent} from './releases/releases.component';
import {SmartServiceDesignsComponent} from './designs/designs.component';
import {SmartServiceDesignerComponent} from './designer/designer.component';
import {
    EditSmartServiceTaskDialogComponent
} from './designer/dialog/edit-smart-service-task-dialog/edit-smart-service-task-dialog.component';
import {MatExpansionModule} from '@angular/material/expansion';
import {
    EditSmartServiceInputDialogComponent
} from './designer/dialog/edit-smart-service-input-dialog/edit-smart-service-input-dialog.component';
import {CheckboxValueDirective} from './designer/shared/string-check-box.directive';
import {
    EditSmartServiceJsonExtractionDialogComponent
} from './designer/dialog/edit-smart-service-json-extraction-dialog/edit-smart-service-json-extraction-dialog.component';
import {CriteriaListComponent} from './designer/dialog/edit-smart-service-task-dialog/criteria-list.component';
import { MtxSelectModule } from '@ng-matero/extensions/select';

const designs: Route = {
    path: 'smart-services/designs',
    pathMatch: 'full',
    component: SmartServiceDesignsComponent,
    data: { header: 'Repository' },
};

const releases: Route = {
    path: 'smart-services/releases',
    pathMatch: 'full',
    component: SmartServiceReleasesComponent,
    data: { header: 'Repository' },
};

const designerReleaseExport: Route = {
    path: 'smart-services/releases/designer/:releaseId',
    component: SmartServiceDesignerComponent,
    data: { header: 'Designer' },
};
const designerEdit: Route = {
    path: 'smart-services/designer/:id',
    component: SmartServiceDesignerComponent,
    data: { header: 'Designer' },
};
const designer: Route = {
    path: 'smart-services/designer',
    pathMatch: 'full',
    component: SmartServiceDesignerComponent,
    data: { header: 'Designer' },
};



@NgModule({
    imports: [
        RouterModule.forChild([
            designs,
            releases,
            designer,
            designerEdit,
            designerReleaseExport
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
        MtxSelectModule,
    ],
    declarations: [
        SmartServiceReleasesComponent,
        SmartServiceDesignsComponent,
        SmartServiceDesignerComponent,
        EditSmartServiceTaskDialogComponent,
        EditSmartServiceInputDialogComponent,
        EditSmartServiceJsonExtractionDialogComponent,
        CheckboxValueDirective,
        CriteriaListComponent
    ],
})
export class SmartServicesModule {}
