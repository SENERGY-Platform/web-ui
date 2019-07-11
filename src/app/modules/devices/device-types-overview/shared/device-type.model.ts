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
    name: string;
    description: string;
    image: string;
    services: DeviceTypeServiceModel[];
    device_class: DeviceTypeDeviceClassModel;
}

export interface DeviceTypeDeviceClassModel {
    id: string;
    name: string;
}

export interface DeviceTypeServiceModel {
    id: string;
    local_id: string;
    name: string;
    description: string;
    aspects: DeviceTypeAspectModel[];
    protocol_id: string;
    inputs: DeviceTypeContentModel[];
    outputs: DeviceTypeContentModel[];
    functions: DeviceTypeFunctionModel[];
}

export interface DeviceTypeAspectModel {
    id: string;
    name: string;
}

export interface DeviceTypeContentModel {
    id: string;
    variable: DeviceTypeVariableModel;
    serialization_options: DeviceTypeSerializationOptionModel[];
    serialization_id: string;
    protocol_segment_id: string;
}

export interface DeviceTypeSerializationOptionModel {
    id: string;
    option: string;
}

export interface DeviceTypeVariableModel {
    id?: string;
    name?: string | number;
    type?: string;
    skala?: string[];
    semantic_label?: string;
    mapping?: DeviceTypeMappingModel[];
    property?: DeviceTypePropertyModel;
    sub_variables?: DeviceTypeVariableModel[];
}

export interface DeviceTypePropertyModel {
    id?: string;
    unit?: string;
    value?: string | boolean | number;
    max_value?: number;
    min_value?: number;
}

export interface DeviceTypeSerializationModel {
    id: string;
    name: string;
}

export interface DeviceTypeMappingModel {
    conversion?: string | null;
    input: string[];
    output: string[];
}

export interface DeviceTypeFunctionModel {
    id: string;
    name: string;
    type: DeviceTypeFunctionTypeEnum;
    input: DeviceTypeVariableModel;
    output: DeviceTypeVariableModel;
}

export interface DeviceTypeMsgSegmentModel {
    uri: string;
}

export enum DeviceTypeFunctionTypeEnum {
    Controlling = 'Controlling',
    Measuring = 'Measuring',
}

export interface DeviceTypeProtocolModel {
    id: string;
    name: string;
    handler: string;
    protocol_segment: DeviceTypeProtocolSegmentModel[];
}

export interface DeviceTypeProtocolSegmentModel {
    id: string;
    name: string;
}

export interface DeviceTypeAssignmentModel {
    id: string;
    name: string;
    msg_segment: DeviceTypeMsgSegmentModel;
    type: ValueTypesModel;
    format: string;
    additional_formatinfo: DeviceTypeAdditionalFormatInfoModel[];
}

export interface DeviceTypeAdditionalFormatInfoModel {
    id: string;
    field: ValueTypesFieldTypeModel;
    format_flag: string;
}

export interface DeviceTypePropertiesModel {
    uri: string | null;
    label: string;
    feature_of_interest: DeviceTypeFeatureOfInterestModel | null;
}

export interface DeviceTypeFeatureOfInterestModel {
    uri: string | null;
    label: string;
}

export interface DeviceTypeSensorActuatorModel {
    type: SystemType;
    label: string;
    property: DeviceTypePropertiesModel;
}

export interface DeviceTypeCreateSensorModel {
    label: string;
    property: DeviceTypePropertiesModel;
}

export interface DeviceTypeCreateActuatorModel {
    label: string;
    property: DeviceTypePropertiesModel;
}

export interface DeviceTypeSensorModel {
    uri: string;
    label: string;
}

export interface DeviceTypeActuatorModel {
    uri: string;
    label: string;
}

export enum SystemType {
    Sensor = 'sensor',
    Actuator = 'actuator',
}
