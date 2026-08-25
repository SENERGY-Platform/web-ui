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

import { collectFormulaReferences } from './environments-formula-refs';
import { Environment } from './environments.model';

describe('collectFormulaReferences', () => {
    it('collects context keys', () => {
        const env: Environment = { context: { outdoor_temp: 5, irradiation: 100 } };
        const options = collectFormulaReferences(env);
        expect(options).toContain({ value: 'context.outdoor_temp', label: 'outdoor_temp', group: 'context' });
        expect(options).toContain({ value: 'context.irradiation', label: 'irradiation', group: 'context' });
    });

    // Regression target: zones nest arbitrarily deep via Zone.zones, and an early version
    // that only looked at the top-level zones array would miss everything below it.
    it('walks nested zones to find channels and state keys at every depth', () => {
        const env: Environment = {
            zones: [
                {
                    name: 'Building',
                    initial_states: { heating_on: 1 },
                    zones: [
                        {
                            name: 'Room',
                            time_constants: { room_temp: 300 },
                            assets: [
                                {
                                    name: 'Meter 1',
                                    initial_states: { total_kwh: 0 },
                                    channels: [{ id: 'c1', name: 'Power' }],
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const options = collectFormulaReferences(env);

        expect(options).toContain({ value: 'channel.c1', label: 'Meter 1 / Power', group: 'channel' });
        expect(options).toContain({ value: 'zone.heating_on', label: 'heating_on', group: 'zone' });
        expect(options).toContain({ value: 'zone.room_temp', label: 'room_temp', group: 'zone' });
        expect(options).toContain({ value: 'asset.total_kwh', label: 'total_kwh', group: 'asset' });
    });

    it('skips a channel that has no id yet (not saved, nothing stable to reference)', () => {
        const env: Environment = {
            zones: [{ name: 'Z', assets: [{ name: 'A', channels: [{ name: 'New Channel' }] }] }],
        };
        const options = collectFormulaReferences(env);
        expect(options.filter((o) => o.group === 'channel')).toEqual([]);
    });

    it('does not duplicate a key used by more than one zone or asset', () => {
        const env: Environment = {
            zones: [
                { name: 'Z1', initial_states: { heating_on: 1 } },
                { name: 'Z2', initial_states: { heating_on: 0 } },
            ],
        };
        const options = collectFormulaReferences(env);
        expect(options.filter((o) => o.value === 'zone.heating_on').length).toBe(1);
    });

    it('returns an empty list for an environment with nothing in it', () => {
        expect(collectFormulaReferences({})).toEqual([]);
    });
});
