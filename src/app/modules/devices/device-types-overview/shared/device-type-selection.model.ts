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
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel
} from './device-type.model';

export interface DeviceTypeSelectionRefModel {
    aspect: DeviceTypeAspectModel;
    function: DeviceTypeFunctionModel;
    device_class: DeviceTypeDeviceClassModel;
    completionStrategy: string;
    retries: number;
}

export interface DeviceTypeSelectionResultModel {
    aspect: DeviceTypeAspectModel;
    function: DeviceTypeFunctionModel;
    device_class: DeviceTypeDeviceClassModel;
    characteristic: DeviceTypeCharacteristicsModel;
    completionStrategy: string;
    retries: number;
}

export interface DeviceTypeInfoModel {
    id: string;
    name: string;
}

export interface ServiceInfoModel {
    id: string;
    name: string;
}

export interface BpmnSkeletonModel {
    inputs ?: InputOutput;
    outputs ?: InputOutput;
}

interface InputOutput {
    [key: string]: InputOutput | (InputOutput | string | number | boolean)[] | string | number | boolean;
}
