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

export interface V2DeploymentsPreparedModel {
    id: string;
    name: string;
    description: string;
    diagram: V2DeploymentsPreparedDiagramModel;
    elements: V2DeploymentsPreparedElementModel[];
    executable: boolean;
}

export interface V2DeploymentsPreparedDiagramModel {
    xml_raw: string;
    xml_deployed: string;
    svg: string;
}

export interface V2DeploymentsPreparedElementModel {
    bpmn_id: string;
    group: string;
    name: string;
    order: number;
    time_event: V2DeploymentsPreparedTimeEventModel;
    message_event: V2DeploymentsPreparedMsgEventModel;
    task: V2DeploymentsPreparedTaskModel;
    notification: V2DeploymentsPreparedNotificationModel;
}

export interface V2DeploymentsPreparedNotificationModel {
    message: string;
    time: string;
}

export interface V2DeploymentsPreparedTaskModel {
    retries: number;
    parameter: any;
    selection: V2DeploymentsPreparedSelectionModel;
    configurables: V2DeploymentsPreparedConfigurableModel[];
}

export interface V2DeploymentsPreparedConfigurableModel {
    characteristic_id: string;
    values: V2DeploymentsPreparedConfigurableValueModel[];
}

export interface V2DeploymentsPreparedConfigurableValueModel {
    label: string;
    path: string;
    value: any;
    value_type: string;
}

export interface V2DeploymentsPreparedTimeEventModel {
    time: string;
    type: string;
}

export interface V2DeploymentsPreparedMsgEventModel {
    value: string;
    flow_id: string;
    event_id: string;
    selection: V2DeploymentsPreparedSelectionModel;
}

export interface V2DeploymentsPreparedSelectionModel {
    filter_criteria: V2DeploymentsPreparedFilterCriteriaModel;
    selection_options: V2DeploymentsPreparedSelectionOptionModel[];
    selected_device_id: string;
    selected_service_id: string;
    show: boolean;
}

export interface V2DeploymentsPreparedSelectionOptionModel {
    device: V2DeploymentsPreparedDeviceModel;
    services: V2DeploymentsPreparedServiceModel[];
}

export interface V2DeploymentsPreparedServiceModel {
    id: string;
    name: string;
}

export interface V2DeploymentsPreparedDeviceModel {
    id: string;
    name: string;
}

export interface V2DeploymentsPreparedFilterCriteriaModel {
    characteristic_id: string;
    function_id: string;
    device_class_id: string;
    aspect_id: string;
}

