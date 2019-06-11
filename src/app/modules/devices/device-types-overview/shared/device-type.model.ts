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

import {ValueTypesFieldTypeModel, ValueTypesModel} from '../../value-types/shared/value-types.model';

export interface DeviceTypeModel {
    id: string;
    name: string | null;
    description: string;
    generated: boolean;
    maintenance: string[];
    device_class: DeviceTypeClassModel;
    services: DeviceTypeServiceModel [];
    config_parameter: DeviceTypeConfigFieldTypeModel[];
    img: string;
}

export interface DeviceTypeClassModel {
    uri: string;
    label: string;
}

export interface DeviceTypeServiceModel {
    id: string;
    service_type: string;
    name: string;
    description: string;
    protocol: DeviceTypeProtocolModel;
    input: DeviceTypeAssignmentModel[];
    output: DeviceTypeAssignmentModel[];
    url: string;
    // endpoint_format: string // for future use
}

export interface DeviceTypeMsgStructureModel {
    id: string;
    name: string;
    constraints: string[];
}

export interface DeviceTypeProtocolModel {
    id: string;
    protocol_handler_url: string;
    name: string;
    description: string;
    msg_structure: DeviceTypeMsgStructureModel[];
}

export interface DeviceTypeAssignmentModel {
    id: string;
    name: string;
    msg_segment: DeviceTypeMsgStructureModel;
    type: ValueTypesModel;
    format: string;
    additional_formatinfo: DeviceTypeAdditionalFormatInfoModel[];
}

export interface DeviceTypeAdditionalFormatInfoModel {
    id: string;
    field: ValueTypesFieldTypeModel;
    format_flag: string;
}

export interface DeviceTypeVendorModel {
    id: string;
    name: string;
}

export interface DeviceTypeConfigFieldTypeModel {
    id: string;
    name: string;
}

export interface DeviceTypePropertiesModel {
    uri: string;
    label: string;
}

export interface DeviceTypeFeatureOfInterestModel {
    uri: string;
    label: string;
}