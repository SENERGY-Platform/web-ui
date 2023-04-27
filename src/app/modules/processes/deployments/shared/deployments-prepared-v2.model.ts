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

import { ImportInstancesModel } from '../../../imports/import-instances/shared/import-instances.model';
import { ImportTypeModel } from '../../../imports/import-types/shared/import-types.model';
import {DeviceTypeAspectNodeModel} from '../../../metadata/device-types-overview/shared/device-type.model';

export interface V2DeploymentsPreparedModel {
    id: string;
    name: string;
    description: string;
    diagram: V2DeploymentsPreparedDiagramModel;
    elements: V2DeploymentsPreparedElementModel[];
    incident_handling?: V2DeploymentsPreparedIncidentHandlingModel;
    start_parameter?: V2DeploymentsPreparedStartParameterModel[];
    executable: boolean;
    version: number;
}

export interface V2DeploymentsPreparedStartParameterModel{
    id: string;
    label: string;
    type: string;
    default: string;
}

export interface V2DeploymentsPreparedIncidentHandlingModel{
    restart: boolean;
    notify: boolean;
}

export interface V2DeploymentsPreparedDiagramModel {
    xml_raw: string;
    xml_deployed: string;
    svg: string;
}

export interface V2DeploymentsPreparedElementModel {
    bpmn_id: string;
    group: string | null;
    name: string;
    order: number;
    time_event: V2DeploymentsPreparedTimeEventModel | null;
    message_event: V2DeploymentsPreparedMsgEventModel | null;
    conditional_event: ConditionalEventModel | null;
    task: V2DeploymentsPreparedTaskModel | null;
    notification: V2DeploymentsPreparedNotificationModel | null;
}

export interface V2DeploymentsPreparedNotificationModel {
    message: string;
    time: string;
}

export interface V2DeploymentsPreparedTaskModel {
    retries: number;
    parameter: any;
    selection: V2DeploymentsPreparedSelectionModel;
}

export interface V2DeploymentsPreparedConfigurableModel {
    characteristic_id: string;
    values: V2DeploymentsPreparedConfigurableValueModel[];
}

export interface V2DeploymentsPreparedConfigurableValueModel {
    label: string;
    path: string;
    value: string;
}

export interface V2DeploymentsPreparedTimeEventModel {
    time: string;
    type: string;
    durationUnits?: V2DeploymentsPreparedDurationUnitsModel;
}

export interface V2DeploymentsPreparedDurationUnitsModel {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export interface V2DeploymentsPreparedMsgEventModel {
    value: string;
    flow_id: string;
    event_id: string;
    use_marshaller: boolean;
    selection: V2DeploymentsPreparedSelectionModel;
}

export interface ConditionalEventModel {
    script: string;
    value_variable: string;
    variables: any;
    qos: number;
    event_id: string;
    selection: V2DeploymentsPreparedSelectionModel;
}

export interface V2DeploymentsPreparedSelectionModel {
    filter_criteria: V2DeploymentsPreparedFilterCriteriaModel;
    selection_options: V2DeploymentsPreparedSelectionOptionModel[];
    selection_options_index?: number;
    selected_device_id: string | null;
    selected_service_id: string | null;
    selected_device_group_id: string | null;
    selected_import_id: string | null;
    selected_path: DeploymentsSelectionPathOptionModel | null;
    show?: boolean;
}

export interface V2DeploymentsPreparedSelectionOptionModel {
    device: V2DeploymentsPreparedDeviceModel | null;
    services: V2DeploymentsPreparedServiceModel[] | null;
    device_group: V2DeploymentsPreparedGroupModel | null;
    import: ImportInstancesModel | null;
    importType: ImportTypeModel | null;
    path_options: Map<string, DeploymentsSelectionPathOptionModel[]> | null;
}

export interface DeploymentsSelectionPathOptionModel {
    path: string;
    characteristicId: string;
    aspectNode: DeviceTypeAspectNodeModel;
    functionId: string;
    isVoid: boolean;
    value: any;
    type: string;
    configurables: DeploymentsSelectionConfigurableModel[];
}

export interface DeploymentsSelectionConfigurableModel {
    path: string;
    characteristic_id: string;
    aspect_node: DeviceTypeAspectNodeModel;
    function_id: string;
    value: any;
    type: string;
}

export interface V2DeploymentsPreparedServiceModel {
    id: string;
    name: string;
}

export interface V2DeploymentsPreparedDeviceModel {
    id: string;
    name: string;
}

export interface V2DeploymentsPreparedGroupModel {
    id: string;
    name: string;
}

export interface V2DeploymentsPreparedFilterCriteriaModel {
    characteristic_id: string | null;
    function_id: string | null;
    device_class_id: string | null;
    aspect_id: string | null;
}
