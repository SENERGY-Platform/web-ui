/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DeviceTypeCharacteristicsModel } from '../../../metadata/device-types-overview/shared/device-type.model';

export interface SmartServiceReleaseCreateModel {
    design_id: string;
    name: string;
    description: string;
}

export interface SmartServiceReleaseModel extends SmartServiceReleaseCreateModel {
    id: string;
    created_at: string;
    error?: string;
}

export interface SmartServiceExtendedReleaseModel extends SmartServiceReleaseModel {
    bpmn_xml: string;
    svg_xml: string;
    parsed_info: SmartServiceReleaseInfo;
    permissions_info: {
        shared: boolean;
        permissions: {
            a: boolean;
            x: boolean;
            r: boolean;
            w: boolean;
        };
    };
}


export interface SmartServiceReleaseInfo {
    parameter_descriptions: SmartServiceReleaseParameterDescription[];
}

export interface SmartServiceReleaseParameterDescription {
    id: string;
    label: string;
    description: string;
    type: string;
    default_value: string;
    multiple: boolean;
    options?: {[key: string]: any};
    iot_description?: SmartServiceReleaseIotDescription;
    order: number;
}

export interface SmartServiceReleaseIotDescription {
    type_filter: string[];
    criteria: SmartServiceReleaseCriteria[];
    entity_only: boolean;
    needs_same_entity_id_in_parameter: string;
}

export interface SmartServiceReleaseCriteria {
    interaction?: string;
    function_id?: string;
    device_class_id?: string;
    aspect_id?: string;
}

/**
 * A release parameter as the repository hands it out under /releases/{id}/parameters: the
 * description above, but with the criteria of an iot parameter already resolved into concrete
 * options and the list sorted by order. `value` is always null here - the values of an existing
 * instance have to be merged in by the caller.
 */
export interface SmartServiceExtendedParameterModel {
    id: string;
    label: string;
    value: any;
    value_label?: string;
    description: string;
    default_value: any;
    type: string;
    /** null means free input of `type`; an empty list next to has_no_valid_option means nothing is selectable */
    options: SmartServiceParameterOptionModel[] | null;
    multiple: boolean;
    order: number;
    characteristic_id?: string;
    characteristic?: DeviceTypeCharacteristicsModel;
    optional: boolean;
    /** the parameter is mandatory and iot-based, but nothing the user may use matches its criteria */
    has_no_valid_option: boolean;
}

export interface SmartServiceParameterOptionModel {
    value: any;
    label: string;
    /** groups options in the frontend, e.g. Devices or Imports */
    kind: string;
    /** the device, group or import this option belongs to, matched against needs_same_entity_id_in_parameter */
    entity_id: string;
    /** the option only applies while the referenced parameter is set to an option of the same entity */
    needs_same_entity_id_in_parameter?: string;
}
