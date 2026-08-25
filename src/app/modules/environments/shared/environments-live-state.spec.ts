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

import { buildStateChange, diffTouchedKeys, flattenAssetTargets, flattenZoneTargets, pickTouched } from './environments-live-state';
import { Zone } from './environments.model';

// building carries a sub-zone (floor) with an asset each, so a flattener that only looks
// at the top level would under-report it, same rationale as the other tree helpers' tests.
const zones: Zone[] = [
    {
        id: 'z1',
        name: 'Building',
        initial_states: { occupied: true },
        time_constants: { temperature: 900 },
        assets: [{ id: 'a1', name: 'Meter 1', initial_states: { power: 0 } }],
        zones: [
            {
                id: 'z2',
                name: 'Floor',
                initial_states: {},
                assets: [{ id: 'a2', name: 'Meter 2' }],
            },
            // no id: not saved yet, must not be targetable
            { name: 'Draft Zone', assets: [{ name: 'Draft Asset' }] },
        ],
    },
];

describe('flattenZoneTargets', () => {
    it('collects every zone with an id, recursively, and skips ones without', () => {
        const targets = flattenZoneTargets(zones);
        expect(targets.map((t) => t.id)).toEqual(['z1', 'z2']);
    });

    it('carries the zone name, its initial_states and its time_constants keys', () => {
        const [building] = flattenZoneTargets(zones);
        expect(building.name).toBe('Building');
        expect(building.initialStates).toEqual({ occupied: true });
        expect(building.timeConstantKeys).toEqual(['temperature']);
    });

    it('defaults initialStates to an empty object and timeConstantKeys to none', () => {
        const floor = flattenZoneTargets(zones)[1];
        expect(floor.initialStates).toEqual({});
        expect(floor.timeConstantKeys).toEqual([]);
    });
});

describe('flattenAssetTargets', () => {
    it('collects every asset with an id across all nesting levels, skipping ones without', () => {
        const targets = flattenAssetTargets(zones);
        expect(targets.map((t) => t.id)).toEqual(['a1', 'a2']);
        expect(targets.map((t) => t.name)).toEqual(['Meter 1', 'Meter 2']);
    });
});

describe('diffTouchedKeys', () => {
    it('marks a key touched when its value changed from the previous record', () => {
        const touched = diffTouchedKeys({ a: 1 }, { a: 2 }, new Set());
        expect(touched).toEqual(new Set(['a']));
    });

    it('does not mark untouched keys whose value stayed the same', () => {
        const touched = diffTouchedKeys({ a: 1, b: 'x' }, { a: 1, b: 'y' }, new Set());
        expect(touched).toEqual(new Set(['b']));
    });

    it('marks a newly added key as touched', () => {
        const touched = diffTouchedKeys({}, { a: 1 }, new Set());
        expect(touched).toEqual(new Set(['a']));
    });

    it('keeps a key touched across further diffs even if edited back to nothing new', () => {
        const first = diffTouchedKeys({ a: 1 }, { a: 2 }, new Set());
        const second = diffTouchedKeys({ a: 2 }, { a: 2, b: 3 }, first);
        expect(second).toEqual(new Set(['a', 'b']));
    });
});

describe('pickTouched', () => {
    it('keeps only touched keys', () => {
        expect(pickTouched({ a: 1, b: 2, c: 3 }, new Set(['a', 'c']))).toEqual({ a: 1, c: 3 });
    });

    it('drops a touched key that no longer exists in the record (row was deleted)', () => {
        expect(pickTouched({ a: 1 }, new Set(['a', 'b']))).toEqual({ a: 1 });
    });

    it('returns an empty object when nothing is touched', () => {
        expect(pickTouched({ a: 1 }, new Set())).toEqual({});
    });
});

describe('buildStateChange', () => {
    it('returns undefined for an entirely empty change -- this drives the Apply button\'s disabled state', () => {
        expect(buildStateChange({}, {}, {})).toBeUndefined();
        expect(buildStateChange({}, { z1: {} }, { a1: {} })).toBeUndefined();
    });

    it('includes only the sections that actually have something to send', () => {
        expect(buildStateChange({ outdoor_temp: 5 }, {}, {})).toEqual({ context: { outdoor_temp: 5 } });
        expect(buildStateChange({}, { z1: { occupied: true } }, {})).toEqual({ zones: { z1: { occupied: true } } });
        expect(buildStateChange({}, {}, { a1: { power: 10 } })).toEqual({ assets: { a1: { power: 10 } } });
    });

    it('drops per-entity entries that are empty while keeping ones that are not', () => {
        const change = buildStateChange({}, { z1: {}, z2: { occupied: false } }, {});
        expect(change).toEqual({ zones: { z2: { occupied: false } } });
    });

    it('combines all three sections when all are non-empty', () => {
        const change = buildStateChange({ outdoor_temp: 5 }, { z1: { occupied: true } }, { a1: { power: 10 } });
        expect(change).toEqual({
            context: { outdoor_temp: 5 },
            zones: { z1: { occupied: true } },
            assets: { a1: { power: 10 } },
        });
    });
});
