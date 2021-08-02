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

import {
    DeviceTypePermSearchModel,
    PermissionsModel
} from '../../../metadata/device-types-overview/shared/device-type-perm-search.model';
import {DeviceTypeServiceModel} from '../../../metadata/device-types-overview/shared/device-type.model';
import {ImportInstancesModel} from '../../../imports/import-instances/shared/import-instances.model';
import {ImportTypeModel} from '../../../imports/import-types/shared/import-types.model';

export interface Attribute {
    key: string;
    value: string;
}

export interface DeviceInstancesBaseModel {
    id: string;
    local_id: string;
    name: string;
    attributes: Attribute[];
}

export interface DeviceInstancesIntermediateModel extends DeviceInstancesBaseModel {
    creator: string;
    permissions: PermissionsModel;
    shared: boolean;
}

export interface DeviceInstancesPermSearchModel extends DeviceInstancesIntermediateModel {
    device_type_id: string;
}

export interface DeviceInstancesModel extends DeviceInstancesIntermediateModel {
    device_type: DeviceTypePermSearchModel;
    log_state: boolean;
}

export interface DeviceFilterCriteriaModel {
    function_id ?: string;
    device_class_id ?: string;
    aspect_id ?: string;
}

export interface DeviceSelectablesModel {
    device: DeviceInstancesPermSearchModel;
    services: DeviceTypeServiceModel[];
}

export interface DeviceSelectablesFullModel {
    device?: DeviceInstancesPermSearchModel;
    services?: DeviceTypeServiceModel[];
    import?: ImportInstancesModel;
    importType?: ImportTypeModel;
    device_group?: {
        id: string;
        name: string;
    };
    servicePathOptions?: Map<string, {path: string, characteristicId: string}>;
}
