/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
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
    lanes: any;
    name: string;
    svg: string;
    xml: string;
    xml_raw: string;
}

export interface DeploymentsPreparedElementModel {
    order: number;
    task: DeploymentsPreparedTaskModel;
    multi_task: DeploymentsPreparedMultiTaskModel;
    receive_task_event: DeploymentsPreparedMsgEventModel;
    msg_event: DeploymentsPreparedMsgEventModel;
    time_event: any;
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
}

export interface DeploymentsPreparedDeviceDescriptionModel {
    characteristic_id: string;
    function: DeviceTypeFunctionModel;
    device_class: DeviceTypeDeviceClassModel;
    aspect: DeviceTypeAspectModel;
}

export interface DeploymentsPreparedMultiTaskModel {
    label: number;
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

