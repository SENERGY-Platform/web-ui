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
import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';
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
import { DeviceInstancesExportDialogComponent } from './device-instances/dialogs/device-instances-export-dialog.component';
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
import {MatDatepickerModule} from "@angular/material/datepicker";

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
        DeviceInstancesExportDialogComponent,
        DeviceGroupsComponent,
        DeviceGroupsEditComponent,
        DeviceGroupsSelectDialogComponent,
        LocationsComponent,
        LocationsEditComponent,
        DeviceGroupsPipelineHelperDialogComponent,
        WaitingRoomComponent,
        WaitingRoomDeviceEditDialogComponent,
        WaitingRoomMultiWmbusKeyEditDialogComponent,
    ],
})
export class DevicesModule {}
