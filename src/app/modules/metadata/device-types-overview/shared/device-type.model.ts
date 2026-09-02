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
import { Attribute } from 'src/app/modules/devices/device-instances/shared/device-instances.model';


export interface DeviceTypeModel {
    id: string;
    name: string;
    description: string;
    attributes?: Attribute[];
    services: DeviceTypeServiceModel[];
    service_groups?: DeviceTypeServiceGroupModel[];
    device_class_id: string;
}

export interface DeviceTypeServiceGroupModel {
    key: string;
    name: string;
    description: string;
}

export interface DeviceTypeDeviceClassModel {
    id: string;
    image: string;
    name: string;
}

export interface DeviceTypeServiceModel {
    id: string;
    local_id: string;
    service_group_key?: string;
    name: string;
    description: string;
    protocol_id: string;
    interaction: DeviceTypeInteractionEnum | null;
    inputs: DeviceTypeContentModel[];
    outputs: DeviceTypeContentModel[];
    attributes?: Attribute[];
}

export interface DeviceTypeAspectClassModel {
    id: string;
    name: string;
}

/**
 * Marks an aspect that an aspect class has replaced. It rides in the name because an aspect carries
 * nothing else: models.Aspect has id, name, aspect_class_id and sub_aspects, and a field beyond those
 * is dropped silently when the device-repository unmarshals the request.
 */
export const DEPRECATED_ASPECT_SUFFIX = ' (deprecated)';

export function aspectIsDeprecated(aspect: { name: string }): boolean {
    return aspect.name.endsWith(DEPRECATED_ASPECT_SUFFIX);
}

export function deprecatedAspectName(name: string): string {
    return name.endsWith(DEPRECATED_ASPECT_SUFFIX) ? name : name + DEPRECATED_ASPECT_SUFFIX;
}

export function withoutDeprecatedSuffix(name: string): string {
    return name.endsWith(DEPRECATED_ASPECT_SUFFIX) ? name.slice(0, -DEPRECATED_ASPECT_SUFFIX.length) : name;
}

export interface DeviceTypeAspectModel {
    id: string;
    name: string;
    // Assigned at the root of the hierarchy; the device-repository copies it down to every
    // sub-aspect on write, so a sub-aspect carrying a different value is rejected.
    aspect_class_id?: string | null;
    sub_aspects?: DeviceTypeAspectModel[] | null;
}

export interface DeviceTypeAspectNodeModel {
    id: string;
    name: string;
    root_id: string;
    parent_id: string;
    child_ids: string[];
    ancestor_ids: string[];
    descendent_ids: string[];
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
    /** @deprecated kept in sync with aspect_ids by the device-repository; use aspect_ids */
    aspect_id?: string;
    aspect_ids?: string[];
    function_id?: string;
    is_void: boolean;
    omit_empty?: boolean;
}

/**
 * The device-repository deprecated ContentVariable.aspect_id in favor of aspect_ids and keeps both
 * in sync: on read aspect_id is the alphabetically first entry of aspect_ids, on write aspect_id is
 * added to aspect_ids. Reading through this function keeps the web-ui working against a
 * device-repository that predates the change and still sends aspect_id alone.
 */
export function contentVariableAspectIds(contentVariable: DeviceTypeContentVariableModel): string[] {
    if (contentVariable.aspect_ids !== undefined && contentVariable.aspect_ids !== null) {
        return contentVariable.aspect_ids;
    }
    return contentVariable.aspect_id ? [contentVariable.aspect_id] : [];
}

export interface DeviceTypeConceptModel {
    id: string;
    name: string;
    base_characteristic_id: string;
    characteristic_ids: string[];
    conversions?: ConverterExtension[];
}

export interface ConverterExtension {
    from: string;
    to: string;
    distance: number;
    formula: string;
    placeholder_name: string;
}

export interface DeviceTypeCharacteristicsModel {
    id?: string;
    name: string;
    display_unit: string;
    type: string;
    rdf_type?: string;
    min_value?: number;
    max_value?: number;
    allowed_values?: any[];
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
    constraints: string[];
}

export const senergyConnectorLocalIdConstraint = 'senergy_connector_local_id';

export interface DeviceTypeProtocolSegmentModel {
    id: string;
    name: string;
}

 
export enum DeviceTypeInteractionEnum {
    Event = 'event',
    Request = 'request',
    EventAndRequest = 'event+request',
}

export interface ConverterExtensionTryRequest {
    extension: ConverterExtension;
    input: any;
}

export interface ConverterExtensionTryResult {
    error: string | null | undefined;
    output: any;
}
