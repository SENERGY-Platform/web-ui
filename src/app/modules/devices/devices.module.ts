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
import { Route, RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { CommonModule, DatePipe } from '@angular/common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { DeviceInstancesComponent } from './device-instances/device-instances.component';
import { NetworksComponent } from './networks/networks.component';
import { CoreModule } from '../../core/core.module';
import { NetworksEditDialogComponent } from './networks/dialogs/networks-edit-dialog.component';
import { DeviceInstancesServiceDialogComponent } from './device-instances/dialogs/device-instances-service-dialog.component';
import { DeviceInstancesEditDialogComponent } from './device-instances/dialogs/device-instances-edit-dialog.component';
import { DeviceInstancesSelectDialogComponent } from './device-instances/dialogs/device-instances-select-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NetworksClearDialogComponent } from './networks/dialogs/networks-clear-dialog.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTreeModule } from '@angular/material/tree';
import { DeviceGroupsComponent } from './device-groups/device-groups.component';
import { DeviceGroupsEditComponent } from './device-groups/edit/device-groups-edit.component';
import { LocationsComponent } from './locations/locations.component';
import { LocationsEditComponent } from './locations/edit/locations-edit.component';
import { DeviceGroupsPipelineHelperDialogComponent } from './device-groups/edit/device-groups-pipeline-helper-dialog/device-groups-pipeline-helper-dialog.component';
import { DeviceGroupsSelectDialogComponent } from './device-groups/dialog/device-groups-select-dialog.component';
import { NetworksDeleteDialogComponent } from './networks/dialogs/networks-delete-dialog.component';
import { WaitingRoomComponent } from './waiting-room/waiting-room.component';
import { WaitingRoomDeviceEditDialogComponent } from './waiting-room/dialogs/waiting-room-device-edit-dialog.component';
import { WaitingRoomMultiWmbusKeyEditDialogComponent } from './waiting-room/dialogs/waiting-room-multi-wmbus-key-edit-dialog.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DeviceInstancesFilterDialogComponent } from './device-instances/dialogs/device-instances-filter-dialog/device-instances-filter-dialog.component';
import { DeviceInstancesReplaceDialogComponent } from './device-instances/dialogs/device-instances-replace-dialog/device-instances-replace-dialog.component';
import { WidgetModule } from 'src/app/widgets/widget.module';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { CloseMtxSelectOnScrollDirective } from 'src/app/core/directives/close-mtx-select-on-scroll.directive';
import { DeviceInstancesDefaultAttributesDialogComponent } from './device-instances/dialogs/device-instances-default-attributes-dialog.component';

const networks: Route = { path: 'devices/networks', pathMatch: 'full', component: NetworksComponent, data: { header: 'Networks' } };
const deviceInstances: Route = {
    path: 'devices/deviceinstances',
    pathMatch: 'full',
    component: DeviceInstancesComponent,
    data: { header: 'Devices' },
};
const deviceGroups: Route = {
    path: 'devices/devicegroups',
    pathMatch: 'full',
    component: DeviceGroupsComponent,
    data: { header: 'Groups' },
};
const deviceGroupsCreate: Route = {
    path: 'devices/devicegroups/edit',
    pathMatch: 'full',
    component: DeviceGroupsEditComponent,
    data: { header: 'Groups' },
};
const deviceGroupsEdit: Route = {
    path: 'devices/devicegroups/edit/:id',
    pathMatch: 'full',
    component: DeviceGroupsEditComponent,
    data: { header: 'Groups' },
};

const locations: Route = {
    path: 'devices/locations',
    pathMatch: 'full',
    component: LocationsComponent,
    data: { header: 'Locations' },
};
const waitingRoom: Route = {
    path: 'devices/waiting-room',
    pathMatch: 'full',
    component: WaitingRoomComponent,
    data: { header: 'Waiting Room' },
};

const locationsCreate: Route = {
    path: 'devices/locations/edit',
    pathMatch: 'full',
    component: LocationsEditComponent,
    data: { header: 'Locations' },
};
const locationsEdit: Route = {
    path: 'devices/locations/edit/:id',
    pathMatch: 'full',
    component: LocationsEditComponent,
    data: { header: 'Locations' },
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
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatStepperModule,
        MatExpansionModule,
        MatTabsModule,
        MatCheckboxModule,
        MatSortModule,
        MatProgressSpinnerModule,
        RouterModule.forChild([
            locations,
            waitingRoom,
            locationsCreate,
            locationsEdit,
            networks,
            deviceInstances,
            deviceGroups,
            deviceGroupsCreate,
            deviceGroupsEdit,
        ]),
        MatTreeModule,
        MatDatepickerModule,
        MatSnackBarModule,
        WidgetModule,
        MtxSelectModule,
        CloseMtxSelectOnScrollDirective,
    ],
    declarations: [
        NetworksComponent,
        NetworksEditDialogComponent,
        NetworksDeleteDialogComponent,
        DeviceInstancesComponent,
        DeviceInstancesServiceDialogComponent,
        DeviceInstancesEditDialogComponent,
        DeviceInstancesSelectDialogComponent,
        NetworksClearDialogComponent,
        DeviceGroupsComponent,
        DeviceGroupsEditComponent,
        DeviceGroupsSelectDialogComponent,
        LocationsComponent,
        LocationsEditComponent,
        DeviceGroupsPipelineHelperDialogComponent,
        WaitingRoomComponent,
        WaitingRoomDeviceEditDialogComponent,
        WaitingRoomMultiWmbusKeyEditDialogComponent,
        DeviceInstancesFilterDialogComponent,
        DeviceInstancesReplaceDialogComponent,
        DeviceInstancesDefaultAttributesDialogComponent,
    ],
    providers: [
        DatePipe,
    ]
})
export class DevicesModule { }
