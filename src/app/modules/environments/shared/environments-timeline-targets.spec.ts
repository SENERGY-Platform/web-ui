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

import { collectTimelineTargets } from './environments-timeline-targets';
import { Environment } from './environments.model';

describe('collectTimelineTargets', () => {
    it('offers base and spread_percent for a profile-sourced channel', () => {
        const env: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ id: 'c1', name: 'Power', source: { kind: 'profile', profile: {} } }] }] }],
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).toContain('channel.c1.profile.base');
        expect(values).toContain('channel.c1.profile.spread_percent');
    });

    it('offers dataset.scale for a dataset-sourced channel that is not cumulative', () => {
        const env: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ id: 'c1', source: { kind: 'dataset', dataset: {} } }] }] }],
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).toContain('channel.c1.dataset.scale');
    });

    it('excludes dataset.scale for a channel whose dataset is cumulative', () => {
        const env: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ id: 'c1', source: { kind: 'dataset', dataset: { cumulative: true } } }] }] }],
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).not.toContain('channel.c1.dataset.scale');
    });

    it('excludes dataset.scale for a context source whose dataset is cumulative', () => {
        const env: Environment = {
            context_sources: {
                counting: { kind: 'dataset', dataset: { cumulative: true } },
                plain: { kind: 'dataset', dataset: {} },
            },
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).not.toContain('context_source.counting.dataset.scale');
        expect(values).toContain('context_source.plain.dataset.scale');
    });

    it('offers a value and spread_percent target per named schedule state, skipping an unnamed one', () => {
        const env: Environment = {
            zones: [{
                name: 'Z',
                assets: [{
                    name: 'A',
                    channels: [{
                        id: 'c1',
                        source: { kind: 'schedule', schedule: { states: [{ name: 'idle', value: 0 }, { value: 1 }] } },
                    }],
                }],
            }],
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).toContain('channel.c1.schedule.states.idle.value');
        expect(values).toContain('channel.c1.schedule.states.idle.spread_percent');
        expect(values.filter((v) => v.includes('.states..'))).toEqual([]);
    });

    it('offers the gate threshold only when the schedule has a gate', () => {
        const withGate: Environment = {
            zones: [{
                name: 'Z',
                assets: [{ name: 'A', channels: [{ id: 'c1', source: { kind: 'schedule', schedule: { gate: { context_key: 'shift', threshold: 0 } } } }] }],
            }],
        };
        expect(collectTimelineTargets(withGate).map((o) => o.value)).toContain('channel.c1.schedule.gate.threshold');

        const withoutGate: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ id: 'c1', source: { kind: 'schedule', schedule: {} } }] }] }],
        };
        expect(collectTimelineTargets(withoutGate).map((o) => o.value)).not.toContain('channel.c1.schedule.gate.threshold');
    });

    it('skips a channel that has no id yet (not saved, nothing stable to reference)', () => {
        const env: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ name: 'New Channel', source: { kind: 'profile', profile: {} } }] }] }],
        };
        expect(collectTimelineTargets(env)).toEqual([]);
    });

    it('offers profile/dataset fields for a context source, grouped separately from plain context keys', () => {
        const env: Environment = {
            context: { energy_price: 0.3 },
            context_sources: { outdoor_temp: { kind: 'profile', profile: {} } },
        };
        const options = collectTimelineTargets(env);
        expect(options).toContain({ value: 'context_source.outdoor_temp.profile.base', label: 'outdoor_temp -- base', group: 'Context source' });
        expect(options).toContain({ value: 'context_source.outdoor_temp.profile.spread_percent', label: 'outdoor_temp -- spread %', group: 'Context source' });
        expect(options).toContain({ value: 'context.energy_price', label: 'energy_price', group: 'Context' });
    });

    it('offers dataset.scale for a dataset-sourced context source', () => {
        const env: Environment = { context_sources: { outdoor_temp: { kind: 'dataset', dataset: {} } } };
        expect(collectTimelineTargets(env).map((o) => o.value)).toContain('context_source.outdoor_temp.dataset.scale');
    });

    it('does not offer context.<key> for a key that is also driven by a context source', () => {
        const env: Environment = {
            context: { outdoor_temp: 5 },
            context_sources: { outdoor_temp: { kind: 'profile', profile: {} } },
        };
        const values = collectTimelineTargets(env).map((o) => o.value);
        expect(values).not.toContain('context.outdoor_temp');
    });

    it('returns an empty list for an environment with nothing in it', () => {
        expect(collectTimelineTargets({})).toEqual([]);
    });
});
