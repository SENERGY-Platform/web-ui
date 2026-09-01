/*
 * Copyright 2025 InfAI (CC SES)
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

export interface SmartServiceInstanceModel {
    name: string;
    description: string;
    parameters: SmartServiceParameterModel[],
    id: string;
    user_id: string;
    design_id: string;
    release_id: string;
    /** set by the repository when a newer release of the same design exists, the instance can be upgraded to it */
    new_release_id?: string;
    ready: boolean;
    created_at: number; // unix timestamp
    updated_at: number; // unix timestamp
    permissions_info: {
        shared: boolean;
        permissions: {
            administrate: boolean;
            execute: boolean;
            read: boolean;
            write: boolean;
        };
    };
    error?: string | null;
}

export interface SmartServiceParameterModel {
    id: string;
    value: any; // This can be anything. For devices and device groups this is a JSON encoded object
    label: string;
    value_label?: string;
}

/** What POST /releases/{id}/instances expects */
export interface SmartServiceInstanceInitModel {
    name: string;
    description: string;
    parameters: SmartServiceParameterModel[];
}

/** What PUT /instances/{id}/info expects */
export interface SmartServiceInstanceInfoModel {
    name: string;
    description: string;
}