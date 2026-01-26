/*
 * Copyright 2021 InfAI (CC SES)
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

import { Attribute } from '../../device-instances/shared/device-instances.model';



export interface WaitingDeviceModel {
    local_id: string;
    name: string;
    device_type_id: string;
    attributes?: Attribute[];
    hidden: boolean;
    created_at: string;
    updated_at: string;
}

export interface WaitingDeviceListModel {
    total: number;
    result: WaitingDeviceModel[];
}

export interface WaitingRoomEvent {
    type: string;
    payload: string | null | undefined | WaitingDeviceModel;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeError = 'error';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeSet = 'update_set';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeDelete = 'update_delete';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeUse = 'update_use';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeAuthRequest = 'auth_request';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeAuth = 'auth';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const WaitingRoomEventTypeAuthOk = 'auth_ok';
