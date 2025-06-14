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
import {FlexLayoutModule} from '@ngbracket/ngx-layout';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
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
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatStepperModule} from '@angular/material/stepper';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatTabsModule} from '@angular/material/tabs';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSortModule} from '@angular/material/sort';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
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
import {UsedInDeviceTypesDialogComponent} from './dialogs/used-in-device-types-dialog.component';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { CloseMtxSelectOnScrollDirective } from 'src/app/core/directives/close-mtx-select-on-scroll.directive';

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
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatStepperModule,
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
        MtxSelectModule,
        CloseMtxSelectOnScrollDirective,
    ],
    declarations: [
        DeviceTypesComponent,
        DeviceTypesContentVariableDialogComponent,
        DeviceTypesContentVariableJsonDialogComponent,
        IsNotProhibitedNameValidatorDirective,
        UsedInDeviceTypesDialogComponent,
        DeviceTypesContentVariableDialogComponent,
    ],
})
export class DeviceTypesOverviewModule {}
