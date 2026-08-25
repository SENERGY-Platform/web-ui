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

export type FormulaReferenceGroup = 'channel' | 'context' | 'zone' | 'asset';

export interface FormulaReferenceOption {
    /** What a formula input's value is set to, e.g. "channel.c1" or "context.outdoor_temp". */
    value: string;
    /** What the dropdown shows: "Asset / Channel" for a channel, the bare key otherwise. */
    label: string;
    group: FormulaReferenceGroup;
}

/**
 * Every reference a formula input could point at: every channel anywhere in the environment
 * (a formula may read a sensor on a different asset or zone, not just its own), plus every
 * context/zone/asset state key that already appears somewhere in the document. Keys are
 * collected rather than a fixed list because they are free-form (see Environment.context) --
 * a fixed dropdown would hide keys a different zone already uses. Walks nested zones, since
 * a zone's own `zones` can hold further zones to any depth.
 */
export function collectFormulaReferences(environment: Environment): FormulaReferenceOption[] {
    const channelOptions: FormulaReferenceOption[] = [];
    const contextKeys = new Set<string>(Object.keys(environment.context || {}));
    const zoneKeys = new Set<string>();
    const assetKeys = new Set<string>();

    const walkZones = (zones: Zone[] | undefined): void => {
        (zones || []).forEach((zone) => {
            Object.keys(zone.initial_states || {}).forEach((key) => zoneKeys.add(key));
            Object.keys(zone.time_constants || {}).forEach((key) => zoneKeys.add(key));
            (zone.assets || []).forEach((asset) => {
                Object.keys(asset.initial_states || {}).forEach((key) => assetKeys.add(key));
                (asset.channels || []).forEach((channel) => {
                    if (!channel.id) {
                        return; // not saved yet: no stable id to reference
                    }
                    channelOptions.push({
                        value: 'channel.' + channel.id,
                        label: (asset.name || 'Asset') + ' / ' + (channel.name || 'Channel'),
                        group: 'channel',
                    });
                });
            });
            walkZones(zone.zones);
        });
    };
    walkZones(environment.zones);

    const keyOptions = (keys: Set<string>, group: FormulaReferenceGroup): FormulaReferenceOption[] =>
        Array.from(keys).map((key) => ({ value: group + '.' + key, label: key, group }));

    return [
        ...channelOptions,
        ...keyOptions(contextKeys, 'context'),
        ...keyOptions(zoneKeys, 'zone'),
        ...keyOptions(assetKeys, 'asset'),
    ];
}
