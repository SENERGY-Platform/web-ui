/*
 * Copyright 2026 InfAI (CC SES)
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
import { DeviceTypeContentVariableModel } from '../../../metadata/device-types-overview/shared/device-type.model';

/** Permissions-v2 topic of things in the device-repository. */
export const THING_TOPIC = 'things';

/**
 * A consumer without measurements of its own. The device-repository manages `device_links` only through
 * their own endpoints: a create or update ignores them and keeps the stored links.
 */
export interface ThingModel {
    id: string;
    name: string;
    attributes: Attribute[];
    content_variables: DeviceTypeContentVariableModel[];
    owner_id: string;
    device_links: ThingDeviceLinkModel[];
}

/** A device measures the thing during the half-open period [from, until); `until` null means open. RFC3339 times. */
export interface ThingDeviceLinkModel {
    id: string;
    device_id: string;
    from: string;
    until: string | null;
}

/** Body of a new device link: `from` defaults to now, `until` to open. */
export interface ThingDeviceLinkCreateModel {
    device_id: string;
    from?: string;
    until?: string;
}

export interface ThingTotalModel {
    result: ThingModel[];
    total: number;
}
