/*
 * Copyright 2018 InfAI (CC SES)
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
import {
    MatButtonModule,
    MatCardModule, MatChipsModule,
    MatDialogModule, MatDividerModule, MatFormFieldModule,
    MatGridListModule,
    MatIconModule, MatInputModule, MatListModule, MatMenuModule,
    MatTooltipModule
} from '@angular/material';
import {FlexLayoutModule} from '@angular/flex-layout';
import {CommonModule} from '@angular/common';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';

import {DeviceInstancesComponent} from './device-instances/device-instances.component';
import {NetworksComponent} from './networks/networks.component';
import {ValueTypesComponent} from './value-types/value-types.component';
import {DeviceTypesComponent} from './device-types/device-types.component';
import {MaintenanceComponent} from './maintenance/maintenance.component';
import {CoreModule} from '../../core/core.module';
import {NetworksEditDialogComponent} from './networks/dialogs/networks-edit-dialog.component';
import {DeviceInstancesServiceDialogComponent} from './device-instances/dialogs/device-instances-service-dialog.component';
import {DeviceInstancesEditDialogComponent} from './device-instances/dialogs/device-instances-edit-dialog.component';
import {FormsModule} from '@angular/forms';
import {NetworksClearDialogComponent} from './networks/dialogs/networks-clear-dialog.component';

const networks = {path: 'devices/networks', pathMatch: 'full', component: NetworksComponent, data: {header: 'Devices'}};
const deviceInstances = {
    path: 'devices/deviceinstances',
    pathMatch: 'full',
    component: DeviceInstancesComponent,
    data: {header: 'Devices'}
};
const deviceTypes = {path: 'devices/devicetypes', pathMatch: 'full', component: DeviceTypesComponent, data: {header: 'Devices'}};
const valueTypes = {path: 'devices/valuetypes', pathMatch: 'full', component: ValueTypesComponent, data: {header: 'Devices'}};
const maintenance = {path: 'devices/maintenance', pathMatch: 'full', component: MaintenanceComponent, data: {header: 'Devices'}};

@NgModule({
    imports: [MatGridListModule,
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
        MatChipsModule,
        RouterModule.forChild([networks, deviceInstances, deviceTypes, valueTypes, maintenance])],
    declarations: [
        NetworksComponent,
        NetworksEditDialogComponent,
        DeviceInstancesComponent,
        DeviceTypesComponent,
        ValueTypesComponent,
        MaintenanceComponent,
        DeviceInstancesServiceDialogComponent,
        DeviceInstancesEditDialogComponent,
        NetworksClearDialogComponent,
    ],
    entryComponents: [NetworksEditDialogComponent,
        DeviceInstancesServiceDialogComponent,
        DeviceInstancesEditDialogComponent,
        NetworksClearDialogComponent,
    ]
})

export class DevicesModule {
}
