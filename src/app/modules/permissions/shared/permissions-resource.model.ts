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

import { PermissionsRightsModel } from './permissions-rights.model';

export interface PermissionsResourceModel extends PermissionsResourceBaseModel {
    creator: string;
    resource_id: string;
}

export interface PermissionsResourceBaseModel {
    user_rights: {
        [key: string]: PermissionsRightsModel;
    };
    group_rights: {
        [key: string]: PermissionsRightsModel;
    };
}

export interface PermissionsV2ResourceModel extends PermissionsV2ResourceBaseModel {
    topic_id: string;
    id: string;
}

export interface PermissionsV2ResourceBaseModel {
    user_permissions: {
        [key: string]: PermissionsRightsModel;
    };
    group_permissions: {
        [key: string]: PermissionsRightsModel;
    };
    role_permissions: {
        [key: string]: PermissionsRightsModel;
    };
}

export interface PermissionsV2RightsAndIdModel extends PermissionsRightsModel {
    id: string;
}
