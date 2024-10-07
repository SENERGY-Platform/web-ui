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

import {Attribute, DeviceInstancesBaseModel } from '../../device-instances/shared/device-instances.model';

export interface DeviceGroupModel {
    id: string;
    image: string;
    name: string;
    device_ids: string[];
    criteria: DeviceGroupCriteriaModel[];
    attributes?: Attribute[];
    auto_generated_by_device?: string;
    criteria_short?: string[]; // TODO what is that??
}

export interface DeviceGroupCriteriaModel {
    interaction: string;
    function_id: string;
    aspect_id: string;
    device_class_id: string;
}

export interface DeviceGroupHelperResultModel {
    criteria: DeviceGroupCriteriaModel[];
    options: DeviceGroupHelperOptionsModel[];
}

export interface DeviceGroupHelperOptionsModel {
    device: DeviceInstancesBaseModel;
    removes_criteria: DeviceGroupCriteriaModel[];
    maintains_group_usability: boolean;
}

export interface DeviceGroupCapability extends DeviceGroupCriteriaModel {
    function_type: string;
    function_name: string;
    function_description: string;
    aspect_name: string;
    device_class_name: string;
}
