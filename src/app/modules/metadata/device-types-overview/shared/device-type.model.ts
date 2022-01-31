/*
 * Copyright 2021 InfAI (CC SES)
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

import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';

export interface DeviceTypeBaseModel {
    id: string;
    name: string;
    description: string;
    attributes?: Attribute[];
}

export interface Attribute {
    key: string;
    value: string;
    origin: string;
}

export interface DeviceTypeModel extends DeviceTypeBaseModel {
    services: DeviceTypeServiceModel[];
    device_class_id: string;
}

export interface DeviceTypeDeviceClassModel {
    id: string;
    image: string;
    name: string;
}

export interface DeviceTypeServiceModel {
    id: string;
    local_id: string;
    name: string;
    description: string;
    aspect_ids: string[];
    protocol_id: string;
    interaction: DeviceTypeInteractionEnum | null;
    inputs: DeviceTypeContentModel[];
    outputs: DeviceTypeContentModel[];
    function_ids: string[];
    attributes?: Attribute[];
}

export interface DeviceTypeAspectModel {
    id: string;
    name: string;
}

export interface DeviceTypeContentModel {
    id: string;
    content_variable: DeviceTypeContentVariableModel;
    content_variable_raw: string;
    serialization: string;
    protocol_segment_id: string;
    show?: boolean;
    name?: string;
}

export interface DeviceTypeContentTreeModel extends DeviceTypeContentModel {
    dataSource: MatTreeNestedDataSource<DeviceTypeContentVariableModel>;
    tree: NestedTreeControl<DeviceTypeContentVariableModel>;
}

export interface DeviceTypeContentVariableModel {
    indices?: number[];
    id?: string;
    name?: string;
    type?: string;
    characteristic_id?: string;
    value?: string | boolean | number;
    sub_content_variables?: DeviceTypeContentVariableModel[];
    serialization_options: string[];
    unit_reference?: string;
}

export interface DeviceTypeConceptModel {
    id: string;
    name: string;
    base_characteristic_id: string;
    characteristic_ids: string[];
}

export interface DeviceTypeCharacteristicsModel {
    id?: string;
    name: string;
    display_unit: string;
    type: string;
    rdf_type?: string;
    min_value?: number;
    max_value?: number;
    value?: string | boolean | number;
    sub_characteristics?: DeviceTypeCharacteristicsModel[] | null;
}

export interface DeviceTypeFunctionModel {
    id: string;
    name: string;
    display_name: string;
    description: string;
    rdf_type: string;
    concept_id: string;
}

export interface DeviceTypeFunctionType {
    text: string;
    rdf_type: string;
    urn_part: string;
}

export const functionTypes: DeviceTypeFunctionType[] = [
    { text: 'Controlling', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction', urn_part: 'controlling-function' },
    { text: 'Measuring', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction', urn_part: 'measuring-function' },
];

export interface DeviceTypeProtocolModel {
    id: string;
    name: string;
    handler: string;
    protocol_segments: DeviceTypeProtocolSegmentModel[];
}

export interface DeviceTypeProtocolSegmentModel {
    id: string;
    name: string;
}

// eslint-disable-next-line no-shadow
export enum DeviceTypeInteractionEnum {
    Event = 'event',
    Request = 'request',
    EventAndRequest = 'event+request',
}
