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

import { Environment, Zone } from './environments.model';

/**
 * Fields the server stores as an int64 and rejects outright on a non-integer value, with
 * an opaque json.Unmarshal error (e.g. "cannot unmarshal number 900.5 into ... int64")
 * that names a Go struct field, not a document path -- there is no ValidationError problem
 * to place in the tree for it. Checking these client-side, before ever sending the PUT,
 * turns that dead end into an actionable message next to the field that caused it.
 *
 * Returns human-readable document paths (the same bracket/dot notation as a Problem.path)
 * for every offending field, or an empty array if the document is clean.
 */
export function findNonIntegerFields(env: Environment): string[] {
    const problems: string[] = [];
    if (env.seed !== undefined && !Number.isInteger(env.seed)) {
        problems.push('seed');
    }

    const walkZones = (zones: Zone[] | undefined, prefix: string): void => {
        (zones || []).forEach((zone, zoneIndex) => {
            const zonePath = prefix + 'zones[' + zoneIndex + ']';
            Object.entries(zone.time_constants || {}).forEach(([key, value]) => {
                if (!Number.isInteger(value)) {
                    problems.push(zonePath + '.time_constants.' + key);
                }
            });
            (zone.assets || []).forEach((asset, assetIndex) => {
                (asset.channels || []).forEach((channel, channelIndex) => {
                    const channelPath = zonePath + '.assets[' + assetIndex + '].channels[' + channelIndex + ']';
                    if (channel.interval_seconds !== undefined && !Number.isInteger(channel.interval_seconds)) {
                        problems.push(channelPath + '.interval_seconds');
                    }
                    if (channel.source?.interval_seconds !== undefined && !Number.isInteger(channel.source.interval_seconds)) {
                        problems.push(channelPath + '.source.interval_seconds');
                    }
                });
            });
            walkZones(zone.zones, zonePath + '.');
        });
    };
    walkZones(env.zones, '');

    return problems;
}
