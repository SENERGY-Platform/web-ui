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

/** Every set weight of a meter parent in the document, groups first, with the path the server would report it under. */
function meterWeights(env: Environment): { path: string; weight: number }[] {
    const weights: { path: string; weight: number }[] = [];
    (env.meter_groups || []).forEach((group, groupIndex) => {
        (group.parents || []).forEach((parent, parentIndex) => {
            if (parent.weight !== undefined) {
                weights.push({ path: 'meter_groups[' + groupIndex + '].parents[' + parentIndex + '].weight', weight: parent.weight });
            }
        });
    });
    const walk = (zones: Zone[] | undefined, prefix: string): void => {
        (zones || []).forEach((zone, zoneIndex) => {
            const zonePath = prefix + 'zones[' + zoneIndex + ']';
            (zone.assets || []).forEach((asset, assetIndex) => {
                (asset.meter_parents || []).forEach((parent, parentIndex) => {
                    if (parent.weight !== undefined) {
                        weights.push({ path: zonePath + '.assets[' + assetIndex + '].meter_parents[' + parentIndex + '].weight', weight: parent.weight });
                    }
                });
            });
            walk(zone.zones, zonePath + '.');
        });
    };
    walk(env.zones, '');
    return weights;
}

/**
 * Meter parent weights outside 1..100, as document paths. The server reads a weight of 0 as
 * "not set" and silently splits equally, so the entered value would vanish on reload; a
 * negative or larger one is refused. NaN counts as outside.
 */
export function findOutOfRangeMeterWeights(env: Environment): string[] {
    return meterWeights(env)
        .filter(({ weight }) => !(weight >= 1 && weight <= 100))
        .map(({ path }) => path);
}

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
    Object.entries(env.context_sources || {}).forEach(([key, source]) => {
        if (source.interval_seconds !== undefined && !Number.isInteger(source.interval_seconds)) {
            problems.push('context_sources.' + key + '.interval_seconds');
        }
    });

    meterWeights(env).forEach(({ path, weight }) => {
        if (!Number.isInteger(weight)) {
            problems.push(path);
        }
    });

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
                    (channel.source?.schedule?.states || []).forEach((state, stateIndex) => {
                        if (state.duration_seconds !== undefined && !Number.isInteger(state.duration_seconds)) {
                            problems.push(channelPath + '.source.schedule.states[' + stateIndex + '].duration_seconds');
                        }
                    });
                    (channel.faults || []).forEach((fault, faultIndex) => {
                        if (fault.duration_seconds !== undefined && !Number.isInteger(fault.duration_seconds)) {
                            problems.push(channelPath + '.faults[' + faultIndex + '].duration_seconds');
                        }
                    });
                });
            });
            walkZones(zone.zones, zonePath + '.');
        });
    };
    walkZones(env.zones, '');

    return problems;
}
