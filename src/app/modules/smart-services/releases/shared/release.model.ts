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


import {SafeUrl} from '@angular/platform-browser';

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
    }
}


export interface SmartServiceReleaseInfo {
    parameter_descriptions: SmartServiceReleaseParameterDescription[]
}

export interface SmartServiceReleaseParameterDescription {
    id: string
    label: string
    description: string
    type: string
    default_value: string
    multiple: boolean
    options?: {[key: string]:any}
    iot_description?: SmartServiceReleaseIotDescription
    order: number
}

export interface SmartServiceReleaseIotDescription {
    type_filter: string[]
    criteria: SmartServiceReleaseCriteria[]
    entity_only: boolean
    needs_same_entity_id_in_parameter: string
}

export interface SmartServiceReleaseCriteria {
    interaction ?: string
    function_id ?: string
    device_class_id ?: string
    aspect_id ?: string
}