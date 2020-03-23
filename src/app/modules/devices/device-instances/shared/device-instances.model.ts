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

import {DeviceTypePermSearchModel} from '../../device-types-overview/shared/device-type-perm-search.model';

export interface DeviceInstancesModel {
    creator: string;
    device_type: DeviceTypePermSearchModel;
    id: string;
    local_id: string;
    log_state: boolean;
    name: string;
    permissions: {
        a: boolean;
        x: boolean;
        r: boolean;
        w: boolean;
    };
    shared: boolean;
}

