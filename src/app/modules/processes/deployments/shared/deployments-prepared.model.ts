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

import {DeviceInstancesUpdateModel} from '../../../devices/device-instances/shared/device-instances-update.model';
import {
    DeviceTypeAspectModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeServiceModel
} from '../../../devices/device-types-overview/shared/device-type.model';

export interface DeploymentsPreparedModel {
    elements: DeploymentsPreparedElementModel[];
    id: string;
    lanes: DeploymentsPreparedLaneElementModel[];
    name: string;
    svg: string;
    xml: string;
    xml_raw: string;
    description: string;
}

export interface DeploymentsPreparedElementModel {
    order: number;
    task: DeploymentsPreparedTaskModel;
    multi_task: DeploymentsPreparedMultiTaskModel;
    receive_task_event: DeploymentsPreparedMsgEventModel;
    msg_event: DeploymentsPreparedMsgEventModel;
    time_event: DeploymentsPreparedTimeEventModel;
}

export interface DeploymentsPreparedTaskModel {
    label: string;
    device_description: DeploymentsPreparedDeviceDescriptionModel,
    bpmn_element_id: string;
    input: any;
    selectables: DeploymentsPreparedSelectableModel[];
    selectableIndex: number;
    selection: DeploymentsPreparedSelectionModel;
    parameter: any;
    retries: number;
}

export interface DeploymentsPreparedLaneElementModel {
    order: number;
    lane: DeploymentsPreparedLaneModel;
}

export interface DeploymentsPreparedLaneModel {
    label: string;
    bpmn_element_id: string;
    device_descriptions: DeploymentsPreparedDeviceDescriptionModel[];
    selectables: DeploymentsPreparedSelectableModel[];
    selection: DeviceInstancesUpdateModel;
    elements: DeploymentsPreparedLaneSubElementModel[];
}

export interface DeploymentsPreparedLaneSubElementModel {
    order: number;
    task: DeploymentsPreparedLaneTaskElementModel;
    msg_event: any;
    receive_task_event: any;
    time_event: DeploymentsPreparedTimeEventModel;
}

export interface DeploymentsPreparedLaneTaskElementModel {
    label: string;
    retries: number;
    device_description: DeploymentsPreparedDeviceDescriptionModel[];
    input: any;
    bpmn_element_id: string;
    multi_task: boolean;
    selected_service: DeviceTypeServiceModel;
    parameter: any;
}

export interface DeploymentsPreparedTimeEventModel {
    bpmn_element_id: string;
    kind: string;
    time: string;
    label: string;
}

export interface DeploymentsPreparedDeviceDescriptionModel {
    characteristic_id: string;
    function: DeviceTypeFunctionModel;
    device_class: DeviceTypeDeviceClassModel;
    aspect: DeviceTypeAspectModel;
}

export interface DeploymentsPreparedMultiTaskModel {
    label: number;
    retries: number;
}

export interface DeploymentsPreparedMsgEventModel {
    label: number;
}

export interface DeploymentsPreparedSelectableModel {
    device: DeviceInstancesUpdateModel;
    services: DeviceTypeServiceModel[];
}

export interface DeploymentsPreparedSelectionModel {
    device: DeviceInstancesUpdateModel;
    service: DeviceTypeServiceModel;
    show: boolean;
}

