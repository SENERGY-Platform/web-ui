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

export type TimelineTargetGroup = 'Channel' | 'Context source' | 'Context';

export interface TimelineTargetOption {
    /** What a timeline entry's target is set to, e.g. "channel.c1.profile.base" or "context.energy_price". */
    value: string;
    /** What the dropdown shows, e.g. "Meter 1 / Power -- base" or the bare key. */
    label: string;
    group: TimelineTargetGroup;
}

/**
 * Every point the timeline's closed target grammar allows a jump on: the writable field(s) of
 * every channel, per its own source kind, plus the writable field(s) of every driven context
 * source and every static context key. Unlike collectFormulaReferences (one entry per channel),
 * a channel can contribute several suffixes here -- which ones depends on source.kind, since the
 * grammar is closed server-side and an out-of-grammar target only wastes a round trip to find
 * out. context.<key> excludes a key also in context_sources: that one is driven, and the grammar
 * reserves context.<key> for a key that would otherwise just sit at its inline value.
 */
export function collectTimelineTargets(environment: Environment): TimelineTargetOption[] {
    const options: TimelineTargetOption[] = [];
    const seen = new Set<string>();
    const add = (value: string, label: string, group: TimelineTargetGroup): void => {
        if (seen.has(value)) {
            return; // e.g. two schedule states sharing a name
        }
        seen.add(value);
        options.push({ value, label, group });
    };

    const walkZones = (zones: Zone[] | undefined): void => {
        (zones || []).forEach((zone) => {
            (zone.assets || []).forEach((asset) => {
                (asset.channels || []).forEach((channel) => {
                    if (!channel.id) {
                        return; // not saved yet: no stable id to reference
                    }
                    const label = (asset.name || 'Asset') + ' / ' + (channel.name || 'Channel');
                    const prefix = 'channel.' + channel.id;
                    const source = channel.source;
                    if (source?.kind === 'profile') {
                        add(prefix + '.profile.base', label + ' -- base', 'Channel');
                        add(prefix + '.profile.spread_percent', label + ' -- spread %', 'Channel');
                    } else if (source?.kind === 'dataset' && !source.dataset?.cumulative) {
                        add(prefix + '.dataset.scale', label + ' -- scale', 'Channel');
                    } else if (source?.kind === 'schedule') {
                        (source.schedule?.states || []).forEach((state) => {
                            if (!state.name) {
                                return;
                            }
                            const statePrefix = prefix + '.schedule.states.' + state.name;
                            add(statePrefix + '.value', label + ' -- ' + state.name + ' value', 'Channel');
                            add(statePrefix + '.spread_percent', label + ' -- ' + state.name + ' spread %', 'Channel');
                        });
                        if (source.schedule?.gate) {
                            add(prefix + '.schedule.gate.threshold', label + ' -- gate threshold', 'Channel');
                        }
                    }
                });
            });
            walkZones(zone.zones);
        });
    };
    walkZones(environment.zones);

    Object.entries(environment.context_sources || {}).forEach(([key, source]) => {
        const prefix = 'context_source.' + key;
        if (source.kind === 'profile') {
            add(prefix + '.profile.base', key + ' -- base', 'Context source');
            add(prefix + '.profile.spread_percent', key + ' -- spread %', 'Context source');
        } else if (source.kind === 'dataset' && !source.dataset?.cumulative) {
            //the server refuses a scale on a cumulative replay for a context
            //source too: it would restate everything the meter already counted
            add(prefix + '.dataset.scale', key + ' -- scale', 'Context source');
        }
    });

    const contextSourceKeys = new Set(Object.keys(environment.context_sources || {}));
    Object.keys(environment.context || {}).forEach((key) => {
        if (!contextSourceKeys.has(key)) {
            add('context.' + key, key, 'Context');
        }
    });

    return options;
}
