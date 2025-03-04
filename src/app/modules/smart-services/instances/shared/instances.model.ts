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
    ready: boolean;
    created_at: number; // unix timestamp
    updated_at: number; // unix timestamp
}

export interface SmartServiceParameterModel {
    id: string;
    value: string; // This can be anything. For devices and device groups this is a JSON encoded object
    label: string;
    value_label: string;
}