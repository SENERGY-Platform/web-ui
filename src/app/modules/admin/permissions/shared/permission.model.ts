/*
 *
 *     Copyright 2020  InfAI (CC SES)
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

export interface PermissionApiModel {
    id: string;
    description: string;
    subjects: string[];
    effect: string;
    resources: string[];
    actions: string[];
    conditions: any;
    meta: string;
}

export interface PermissionModel {
    id: string;
    subject: string;
    resource: string;
    actions: string[];
    mode?: string;
}

export function permissionApiToPermission(model: PermissionApiModel): PermissionModel {
    let resource: string;
    try {
        resource = model.resources[0].split('(')[1].split(')')[0]
            .replace(/:/g, '/').replace('endpoints', '');
    } catch (e) {
        resource = model.resources[0];
    }
    return {
        id: model.id,
        subject: model.subjects[0],
        resource,
        actions: model.actions,
    };
}

export function permissionToPermissionApi(model: PermissionModel): PermissionApiModel {
    if (model.resource.startsWith('/')) {
        model.resource = model.resource.substring(1);
    }
    model.resource = model.resource.split('/').join(':');
    return {
        id: model.id,
        description: '',
        subjects: [model.subject],
        effect: 'allow',
        resources: ['<^(endpoints:' + model.resource + ').*>'],
        actions: model.actions,
        conditions: {},
        meta: 'e30=', // why?
    } as PermissionApiModel;
}

export interface PermissionTestResponse {
    GET: boolean; 
    POST: boolean; 
    PUT: boolean; 
    PATCH: boolean; 
    DELETE: boolean; 
    HEAD: boolean;
}

export type AllowedMethods = "GET" | "DELETE" | "POST" | "PATCH" | "PUT" | "HEAD"

export interface AuthorizationRequest {
    method: string;
    endpoint: string;
}

export interface AuthorizationRequestResponse {
    allowed: boolean[];
}
