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

import {Route, RouterModule} from '@angular/router';
import {DeviceTypesComponent} from './device-types/device-types.component';
import {FlexLayoutModule} from '@angular/flex-layout';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
    DeviceTypesNewDeviceClassDialogComponent
} from './device-types/dialogs/device-types-new-device-class-dialog.component';
import {DeviceTypesNewFunctionDialogComponent} from './device-types/dialogs/device-types-new-function-dialog.component';
import {DeviceTypesNewAspectDialogComponent} from './device-types/dialogs/device-types-new-aspect-dialog.component';
import {DeviceTypesShowConceptDialogComponent} from './device-types/dialogs/device-types-show-concept-dialog.component';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyChipsModule as MatChipsModule} from '@angular/material/legacy-chips';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatDividerModule} from '@angular/material/divider';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';
import {MatLegacyOptionModule as MatOptionModule} from '@angular/material/legacy-core';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatStepperModule} from '@angular/material/stepper';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatSortModule} from '@angular/material/sort';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatTreeModule} from '@angular/material/tree';
import {
    DeviceTypesContentVariableDialogComponent
} from './device-types/dialogs/device-types-content-variable-dialog.component';
import {WidgetModule} from '../../../widgets/widget.module';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {
    DeviceTypesContentVariableJsonDialogComponent,
} from './device-types/dialogs/device-types-content-variable-json-dialog.component';
import {IsNotProhibitedNameValidatorDirective} from './device-types/shared/is-not-prohibited-name.directive';

const devicetypes: Route = {
    path: 'metadata/devicetypesoverview/devicetypes',
    pathMatch: 'full',
    component: DeviceTypesComponent,
    data: { header: 'Device Types' },
};
const devicetypesEdit: Route = {
    path: 'metadata/devicetypesoverview/devicetypes/:id',
    pathMatch: 'full',
    component: DeviceTypesComponent,
    data: { header: 'Device Types' },
};

@NgModule({
    imports: [
        MatCardModule,
        FlexLayoutModule,
        MatIconModule,
        MatButtonModule,
        CommonModule,
        CoreModule,
        MatTooltipModule,
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
        MatRadioModule,
        RouterModule.forChild([devicetypes, devicetypesEdit]),
        MatTreeModule,
        WidgetModule,
        DragDropModule,
        MatCheckboxModule
    ],
    declarations: [
        DeviceTypesComponent,
        DeviceTypesNewDeviceClassDialogComponent,
        DeviceTypesNewFunctionDialogComponent,
        DeviceTypesNewAspectDialogComponent,
        DeviceTypesShowConceptDialogComponent,
        DeviceTypesContentVariableDialogComponent,
        DeviceTypesContentVariableJsonDialogComponent,
        IsNotProhibitedNameValidatorDirective
    ],
    entryComponents: [
        DeviceTypesNewDeviceClassDialogComponent,
        DeviceTypesNewFunctionDialogComponent,
        DeviceTypesNewAspectDialogComponent,
        DeviceTypesShowConceptDialogComponent,
        DeviceTypesContentVariableDialogComponent,
    ],
})
export class DeviceTypesOverviewModule {}
