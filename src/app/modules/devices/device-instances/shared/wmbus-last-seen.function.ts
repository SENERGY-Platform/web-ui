/*
 * Copyright 2026 InfAI (CC SES)
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

import { Attribute } from './device-instances.model';

/** Prefix of the attributes the senergy-platform-connector sets on a wM-Bus meter, followed by the id of the receiving nimbus. */
export const wmbusLastSeenAttributePrefix = 'wmbus/last_seen/';

/** How far the receive time of a nimbus may be off the last message of the meter for the nimbus to count as its receiver.
 * The connector writes the receive time at most once a minute per nimbus and meter. */
export const wmbusReceiverTolerance = 120 * 1000;

export interface WmbusLastSeenModel {
    nimbusId: string;
    time: Date;
}

/** Returns when each nimbus last received a telegram of the meter, most recent first. Values that are no timestamp are left out. */
export function wmbusLastSeen(attributes: Attribute[] | undefined): WmbusLastSeenModel[] {
    return (attributes || [])
        .filter(attr => attr.key.startsWith(wmbusLastSeenAttributePrefix) && attr.key.length > wmbusLastSeenAttributePrefix.length)
        .map(attr => ({ nimbusId: attr.key.substring(wmbusLastSeenAttributePrefix.length), time: new Date(attr.value) }))
        .filter(entry => !isNaN(entry.time.valueOf()))
        .sort((a, b) => b.time.valueOf() - a.time.valueOf());
}
