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

export interface ImportTypeModel {
    id: string;
    name: string;
    description: string;
    image: string;
    default_restart: boolean;
    configs: ImportTypeConfigModel[];
    output: ImportTypeContentVariableModel;
    owner: string;
}

export interface ImportTypeConfigModel {
    name: string;
    description: string;
    type: string;
    default_value: any;
}

export interface ImportTypeContentVariableModel {
    name: string;
    type: string;
    characteristic_id?: string;
    sub_content_variables: ImportTypeContentVariableModel[] | null;
    use_as_tag: boolean;
    aspect_id?: string;
    function_id?: string;
}

export interface ImportTypePermissionSearchModel {
    aspect_functions: string[];
    aspect_ids: string[];
    creator: string;
    default_restart: boolean;
    description: string;
    function_ids: string[];
    id: string;
    image: string;
    name: string;
    permissions: {
        a: boolean;
        r: boolean;
        w: boolean;
        x: boolean;
    };
    shared: boolean;
}
