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

import { DeviceTypeModel, DeviceTypeServiceModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { ImportInstancesModel } from '../../../imports/import-instances/shared/import-instances.model';
import { ImportTypeModel } from '../../../imports/import-types/shared/import-types.model';
import { PermissionsRightsModel } from 'src/app/modules/permissions/shared/permissions-rights.model';

export interface Attribute {
    key: string;
    value: string;
    origin: string;
}

export interface DeviceInstancesBaseModel {
    attributes?: Attribute[];
    device_type_id: string;
    id: string;
    local_id: string;
    name: string;
    owner_id: string;
}

export interface DeviceInstancesTotalModel {
    result: DeviceInstanceModel[];
    total: number;
}

export interface DeviceInstancesWithDeviceTypeTotalModel {
    result: DeviceInstanceWithDeviceTypeModel[];
    total: number;
}

export interface DeviceInstanceModel extends DeviceInstancesBaseModel {
    connection_state: '' | 'online' | 'offline';
    device_type_name: string;
    display_name: string;
    permissions: PermissionsRightsModel;
    shared: boolean;
}

export interface DeviceInstanceWithDeviceTypeModel extends DeviceInstanceModel {
    device_type: DeviceTypeModel;
}

export interface DeviceFilterCriteriaModel {
    function_id?: string;
    device_class_id?: string;
    aspect_id?: string;
    interaction?: string;
}

export interface DeviceSelectablesModel {
    device: DeviceInstanceModel; // some fields will be missing SNRGY-3518
    services: DeviceTypeServiceModel[];
}

export interface DeviceSelectablesFullModel {
    device?: DeviceInstanceModel; // some fields will be missing SNRGY-3518
    services?: DeviceTypeServiceModel[];
    import?: ImportInstancesModel;
    importType?: ImportTypeModel;
    device_group?: {
        id: string;
        name: string;
    };
    servicePathOptions?: Map<string, { path: string; characteristicId: string }>;
}

export interface DeviceConnectionState {
    value: DeviceInstancesRouterStateTabEnum;
    name: string;
}

export interface SelectedTag {
    value: boolean | string | string[];
    name: string;
    type: string;
}

export interface FilterSelection {
    connectionState?: DeviceInstancesRouterStateTabEnum;
    deviceTypes?: string[];
    location?: string;
    network?: string;
}

 
export enum DeviceInstancesRouterStateTabEnum {
    ALL,
    ONLINE,
    OFFLINE,
    UNKNOWN,
}
