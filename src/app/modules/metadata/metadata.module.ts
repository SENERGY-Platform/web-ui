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

import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {FlexLayoutModule} from '@angular/flex-layout';
import {CommonModule} from '@angular/common';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';

import {DeviceTypesOverviewComponent} from './device-types-overview/device-types-overview.component';
import {CoreModule} from '../../core/core.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DeviceTypesOverviewModule} from './device-types-overview/device-types-overview.module';
import {ConceptsComponent} from './concepts/concepts.component';
import {ConceptsNewDialogComponent} from './concepts/dialogs/concepts-new-dialog.component';
import {CharacteristicsComponent} from './characteristics/characteristics.component';
import {ConceptsEditDialogComponent} from './concepts/dialogs/concepts-edit-dialog.component';
import {CharacteristicsEditDialogComponent} from './characteristics/dialogs/characteristics-edit-dialog.component';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatRadioModule} from '@angular/material/radio';
import {MatDialogModule} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatChipsModule} from '@angular/material/chips';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatOptionModule} from '@angular/material/core';
import {MatSelectModule} from '@angular/material/select';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatStepperModule} from '@angular/material/stepper';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatTabsModule} from '@angular/material/tabs';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSortModule} from '@angular/material/sort';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {FunctionsComponent} from './functions/functions.component';
import {FunctionsEditDialogComponent} from './functions/dialog/functions-edit-dialog.component';
import {AspectsComponent} from './aspects/aspects.component';
import {AspectsEditDialogComponent} from './aspects/dialog/aspects-edit-dialog.component';
import {DeviceClassesComponent} from './device-classes/device-classes.component';
import {DeviceClassesEditDialogComponent} from './device-classes/dialog/device-classes-edit-dialog.component';
import {FunctionsCreateDialogComponent} from './functions/dialog/functions-create-dialog.component';
import {CharacteristicElementComponent} from './characteristics/dialogs/characteristic-element/characteristic-element.component';
import {MatTreeModule} from '@angular/material/tree';

const deviceTypes = {path: 'metadata/devicetypesoverview', pathMatch: 'full', component: DeviceTypesOverviewComponent, data: {header: 'Device Types'}};
const concepts = {path: 'metadata/concepts', pathMatch: 'full', component: ConceptsComponent, data: {header: 'Concepts'}};
const characteristics = {path: 'metadata/characteristics', pathMatch: 'full', component: CharacteristicsComponent, data: {header: 'Characteristics'}};
const functions = {path: 'metadata/functions', pathMatch: 'full', component: FunctionsComponent, data: {header: 'Functions'}};
const aspects = {path: 'metadata/aspects', pathMatch: 'full', component: AspectsComponent, data: {header: 'Aspects'}};
const deviceClasses = {path: 'metadata/deviceclasses', pathMatch: 'full', component: DeviceClassesComponent, data: {header: 'Device Classes'}};

@NgModule({
    imports: [MatGridListModule,
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
        RouterModule.forChild([
            deviceTypes,
            concepts,
            characteristics,
            functions,
            aspects,
            deviceClasses]), MatTreeModule],
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
        AspectsEditDialogComponent,
        DeviceClassesComponent,
        DeviceClassesEditDialogComponent
    ],
})

export class MetadataModule {
}
