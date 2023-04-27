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
import { FlexLayoutModule } from '@angular/flex-layout';
import { DevicesModule } from '../devices/devices.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
