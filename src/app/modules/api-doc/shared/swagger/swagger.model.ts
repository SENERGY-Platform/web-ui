/*
 *
 *     Copyright 2020 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

export interface SwaggerModel {
    basePath: string;
    consumes: string[];
    definitions: any;
    host: string;
    info: {
        description: string;
        title: string;
        version: any;
    };
    paths: any;
    produces: string[];
    responses: any;
    schemes: string[];
    swagger: string; // Swagger version
    tags: {
        description: string;
        name: string;
    }[];
}

export interface DocInfo {
    description: string;
    title: string;  
    version: any;
    id: string;
}