/*
 * Copyright 2021 InfAI (CC SES)
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
import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DeviceTypesOverviewComponent } from './device-types-overview/device-types-overview.component';
import { CoreModule } from '../../core/core.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeviceTypesOverviewModule } from './device-types-overview/device-types-overview.module';
import { ConceptsComponent } from './concepts/concepts.component';
import { ConceptsNewDialogComponent } from './concepts/dialogs/concepts-new-dialog.component';
import { CharacteristicsComponent } from './characteristics/characteristics.component';
import { ConceptsEditDialogComponent } from './concepts/dialogs/concepts-edit-dialog.component';
import { CharacteristicsEditDialogComponent } from './characteristics/dialogs/characteristics-edit-dialog.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { FunctionsComponent } from './functions/functions.component';
import { FunctionsEditDialogComponent } from './functions/dialog/functions-edit-dialog.component';
import { AspectsComponent } from './aspects/aspects.component';
import { DeviceClassesComponent } from './device-classes/device-classes.component';
import { DeviceClassesEditDialogComponent } from './device-classes/dialog/device-classes-edit-dialog.component';
import { FunctionsCreateDialogComponent } from './functions/dialog/functions-create-dialog.component';
import { CharacteristicElementComponent } from './characteristics/dialogs/characteristic-element/characteristic-element.component';
import { MatTreeModule } from '@angular/material/tree';
import {DragDropModule} from '@angular/cdk/drag-drop';

const deviceTypes: Route = {
    path: 'metadata/devicetypesoverview',
    pathMatch: 'full',
    component: DeviceTypesOverviewComponent,
    data: { header: 'Device Types' },
};
const concepts: Route = { path: 'metadata/concepts', pathMatch: 'full', component: ConceptsComponent, data: { header: 'Concepts' } };
const characteristics: Route = {
    path: 'metadata/characteristics',
    pathMatch: 'full',
    component: CharacteristicsComponent,
    data: { header: 'Characteristics' },
};
const functions: Route = { path: 'metadata/functions', pathMatch: 'full', component: FunctionsComponent, data: { header: 'Functions' } };
const aspects: Route = { path: 'metadata/aspects', pathMatch: 'full', component: AspectsComponent, data: { header: 'Aspects' } };
const deviceClasses: Route = {
    path: 'metadata/deviceclasses',
    pathMatch: 'full',
    component: DeviceClassesComponent,
    data: { header: 'Device Classes' },
};

@NgModule({
    imports: [
        MatGridListModule,
        MatCardModule,
        FlexLayoutModule,
        MatIconModule,
        MatButtonModule,
        CommonModule,
        CoreModule,
        MatTooltipModule,
        MatRadioModule,
        InfiniteScrollModule,
        MatDialogModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatListModule,
        MatDividerModule,
        FormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatOptionModule,
        MatSelectModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatStepperModule,
        MatSelectModule,
        MatExpansionModule,
        MatTabsModule,
        MatCheckboxModule,
        MatSortModule,
        MatProgressSpinnerModule,
        DeviceTypesOverviewModule,
        RouterModule.forChild([deviceTypes, concepts, characteristics, functions, aspects, deviceClasses]),
        MatTreeModule,
        DragDropModule,
    ],
    declarations: [
        DeviceTypesOverviewComponent,
        ConceptsComponent,
        ConceptsNewDialogComponent,
        CharacteristicsComponent,
        CharacteristicElementComponent,
        ConceptsEditDialogComponent,
        CharacteristicsEditDialogComponent,
        FunctionsComponent,
        FunctionsEditDialogComponent,
        FunctionsCreateDialogComponent,
        AspectsComponent,
        DeviceClassesComponent,
        DeviceClassesEditDialogComponent,
    ],
})
export class MetadataModule {}
