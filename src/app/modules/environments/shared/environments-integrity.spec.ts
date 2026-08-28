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

import { findNonIntegerFields } from './environments-integrity';
import { Environment } from './environments.model';

describe('findNonIntegerFields', () => {
    it('reports nothing for a clean environment', () => {
        const env: Environment = {
            id: 'e1',
            seed: 42,
            zones: [
                {
                    id: 'z1',
                    time_constants: { temperature: 900 },
                    assets: [
                        {
                            id: 'a1',
                            channels: [{ id: 'c1', interval_seconds: 60, source: { kind: 'script', interval_seconds: 0 } }],
                        },
                    ],
                },
            ],
        };
        expect(findNonIntegerFields(env)).toEqual([]);
    });

    it('flags a non-integer seed', () => {
        expect(findNonIntegerFields({ id: 'e1', seed: 900.5 })).toEqual(['seed']);
    });

    // Boundary: an exact integer expressed as a float literal (e.g. 900.0) must not be
    // flagged -- Number.isInteger is the right check here, not a string/decimal-point test.
    it('does not flag a whole number written with a decimal point', () => {
        expect(findNonIntegerFields({ id: 'e1', seed: 900.0 })).toEqual([]);
    });

    it('flags a non-integer time constant with its zone-indexed path', () => {
        const env: Environment = {
            id: 'e1',
            zones: [{ id: 'z1', time_constants: { temperature: 900.5 } }],
        };
        expect(findNonIntegerFields(env)).toEqual(['zones[0].time_constants.temperature']);
    });

    it('flags a non-integer channel interval_seconds and source interval_seconds separately', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'z1',
                    assets: [
                        {
                            id: 'a1',
                            channels: [{ id: 'c1', interval_seconds: 1.5, source: { kind: 'script', interval_seconds: 2.5 } }],
                        },
                    ],
                },
            ],
        };
        expect(findNonIntegerFields(env)).toEqual([
            'zones[0].assets[0].channels[0].interval_seconds',
            'zones[0].assets[0].channels[0].source.interval_seconds',
        ]);
    });

    // Nested zones (a zone within a zone) must be walked recursively, same rationale as
    // the other tree helpers' tests: a flat implementation would under-report this.
    it('walks nested zones recursively', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'building',
                    zones: [{ id: 'floor', time_constants: { temperature: 12.3 } }],
                },
            ],
        };
        expect(findNonIntegerFields(env)).toEqual(['zones[0].zones[0].time_constants.temperature']);
    });

    it('flags a non-integer context source interval_seconds with its key-indexed path', () => {
        const env: Environment = {
            id: 'e1',
            context_sources: { outdoor_temperature: { kind: 'profile', interval_seconds: 300.5, profile: {} } },
        };
        expect(findNonIntegerFields(env)).toEqual(['context_sources.outdoor_temperature.interval_seconds']);
    });

    // Boundary: a whole number written as a float literal must not be flagged, same as seed.
    it('does not flag a whole context source interval_seconds written with a decimal point', () => {
        const env: Environment = {
            id: 'e1',
            context_sources: { outdoor_temperature: { kind: 'profile', interval_seconds: 300.0, profile: {} } },
        };
        expect(findNonIntegerFields(env)).toEqual([]);
    });

    it('flags a non-integer schedule state duration with its state-indexed path', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'z1',
                    assets: [
                        {
                            id: 'a1',
                            channels: [
                                {
                                    id: 'c1',
                                    source: {
                                        kind: 'schedule',
                                        schedule: {
                                            state_key: 'programme',
                                            states: [
                                                { name: 'idle', duration_seconds: 600 },
                                                { name: 'run', duration_seconds: 300.5 },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(findNonIntegerFields(env)).toEqual(['zones[0].assets[0].channels[0].source.schedule.states[1].duration_seconds']);
    });

    it('does not flag fields that are simply unset', () => {
        const env: Environment = {
            id: 'e1',
            zones: [{ id: 'z1', assets: [{ id: 'a1', channels: [{ id: 'c1' }] }] }],
        };
        expect(findNonIntegerFields(env)).toEqual([]);
    });
});
