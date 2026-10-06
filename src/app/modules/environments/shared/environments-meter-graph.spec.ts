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

import {
    countMeterReferences,
    meterGroupParentTargets,
    meterParentTargets,
    meterWeightHint,
    meterWeightProblem,
    removeMeterReferences,
} from './environments-meter-graph';
import { Environment } from './environments.model';

function makeEnv(): Environment {
    return {
        meter_groups: [
            { id: 'g1', name: 'Feeders', parents: [{ id: 'a1' }, { id: 'b1' }] },
            { id: 'g2', name: 'Sum of sums', parents: [{ id: 'g1' }] },
        ],
        zones: [
            {
                name: 'Site A',
                assets: [
                    { id: 'a1', name: 'Main meter' },
                    { id: 'a2', name: 'Feeder', meter_parents: [{ id: 'a1', weight: 40 }, { id: 'g1', weight: 60 }] },
                ],
                zones: [{ name: 'Floor 1', assets: [{ id: 'a3', name: 'Room meter', meter_parents: [{ id: 'g1' }] }] }],
            },
            { name: 'Site B', assets: [{ id: 'b1', name: 'Other site meter' }] },
        ],
    };
}

describe('meterParentTargets', () => {
    it('lists the assets of the same top level zone, then every meter group labelled as a group', () => {
        expect(meterParentTargets(makeEnv(), { zoneIndexes: [0], assetIndex: 1 })).toEqual([
            { id: 'a1', label: 'Main meter (Site A)' },
            { id: 'a3', label: 'Room meter (Floor 1)' },
            { id: 'g1', label: 'Meter group: Feeders' },
            { id: 'g2', label: 'Meter group: Sum of sums' },
        ]);
    });

    it('does not offer the asset itself or an asset of another top level zone', () => {
        const ids = meterParentTargets(makeEnv(), { zoneIndexes: [0], assetIndex: 0 }).map((o) => o.id);
        expect(ids).not.toContain('a1');
        expect(ids).not.toContain('b1');
    });

    it('labels a group without a name by its id', () => {
        const env: Environment = { meter_groups: [{ id: 'g9', name: '', parents: [] }], zones: [{ name: 'S', assets: [{ id: 'x' }, { id: 'y' }] }] };
        expect(meterParentTargets(env, { zoneIndexes: [0], assetIndex: 0 }).map((o) => o.label)).toContain('Meter group: g9');
    });

    it('offers only the groups when the top level zone cannot be resolved', () => {
        expect(meterParentTargets(makeEnv(), { zoneIndexes: [9], assetIndex: 0 }).map((o) => o.id)).toEqual(['g1', 'g2']);
    });
});

describe('meterGroupParentTargets', () => {
    it('lists the assets of every top level zone with their full zone path, then the other groups', () => {
        expect(meterGroupParentTargets(makeEnv(), 'g1')).toEqual([
            { id: 'a1', label: 'Main meter (Site A)' },
            { id: 'a2', label: 'Feeder (Site A)' },
            { id: 'a3', label: 'Room meter (Site A / Floor 1)' },
            { id: 'b1', label: 'Other site meter (Site B)' },
            { id: 'g2', label: 'Meter group: Sum of sums' },
        ]);
    });

    it('never offers the group itself', () => {
        expect(meterGroupParentTargets(makeEnv(), 'g2').map((o) => o.id)).not.toContain('g2');
    });
});

describe('meterWeightHint', () => {
    it('has nothing to say about no parents or parents without weights', () => {
        expect(meterWeightHint(undefined)).toBeUndefined();
        expect(meterWeightHint([])).toBeUndefined();
        expect(meterWeightHint([{ id: 'a' }, { id: 'b' }])).toBeUndefined();
    });

    it('has nothing to say about weights that add up to 100', () => {
        expect(meterWeightHint([{ id: 'a', weight: 30 }, { id: 'b', weight: 70 }])).toBeUndefined();
        expect(meterWeightHint([{ id: 'a', weight: 100 }])).toBeUndefined();
    });

    // Fractions are invalid (see meterWeightProblem, reported per row), but the sum message must still
    // not print floating point noise such as 100.00000000000034 for them.
    it('does not print floating point noise for fractional weights that add up to 100', () => {
        // 250 x 0.4 sums to 100.00000000000034 in doubles
        const drifting = Array.from({ length: 250 }, (_, i) => ({ id: 'p' + i, weight: 0.4 }));
        expect(drifting.reduce((sum, parent) => sum + parent.weight, 0)).not.toBe(100);
        expect(meterWeightHint(drifting)).toBeUndefined();
        expect(meterWeightProblem(0.4)).toBeDefined();
    });

    it('says so when only some parents carry a weight', () => {
        expect(meterWeightHint([{ id: 'a', weight: 100 }, { id: 'b' }])).toContain('every parent or on none');
    });

    it('names the sum when the weights do not add up to 100', () => {
        expect(meterWeightHint([{ id: 'a', weight: 30 }, { id: 'b', weight: 60 }])).toBe('The weights add up to 90, they should add up to 100.');
        expect(meterWeightHint([{ id: 'a', weight: 99 }])).toContain('add up to 99');
        expect(meterWeightHint([{ id: 'a', weight: 100 }, { id: 'b', weight: 1 }])).toContain('add up to 101');
    });
});

describe('meterWeightProblem', () => {
    it('has nothing to say about an unset weight or one from 1 to 100', () => {
        expect(meterWeightProblem(undefined)).toBeUndefined();
        expect(meterWeightProblem(1)).toBeUndefined();
        expect(meterWeightProblem(100)).toBeUndefined();
    });

    it('asks for a whole number when the weight has a fraction, also inside the range', () => {
        expect(meterWeightProblem(33.5)).toContain('whole number');
        expect(meterWeightProblem(0.5)).toContain('whole number');
        expect(meterWeightProblem(NaN)).toContain('whole number');
    });

    it('names the range for a whole weight outside it, and says what 0 would do', () => {
        expect(meterWeightProblem(0)).toContain('0 counts as no weight');
        expect(meterWeightProblem(-3)).toContain('from 1 to 100');
        expect(meterWeightProblem(101)).toContain('from 1 to 100');
    });
});

describe('countMeterReferences', () => {
    it('counts the assets and groups that list one of the ids', () => {
        // a2, a3 and g2 list g1
        expect(countMeterReferences(makeEnv(), ['g1'])).toBe(3);
    });

    it('does not count a node twice for naming two of the ids', () => {
        // a2 names a1 and g1; g1 names a1 -> a2, g1, a3, g2 (via g1)
        expect(countMeterReferences(makeEnv(), ['a1', 'g1'])).toBe(4);
    });

    it('leaves out assets that are removed together with the ids', () => {
        expect(countMeterReferences(makeEnv(), ['a1', 'a2'], ['a1', 'a2'])).toBe(1); // only group g1 still names a1
    });

    it('is zero without references or without an environment', () => {
        expect(countMeterReferences(makeEnv(), ['a3'])).toBe(0);
        expect(countMeterReferences(undefined, ['a3'])).toBe(0);
    });
});

describe('removeMeterReferences', () => {
    it('drops the entries naming the ids from assets and groups and keeps the others', () => {
        const env = makeEnv();
        removeMeterReferences(env, ['a1']);
        expect(env.zones![0].assets![1].meter_parents).toEqual([{ id: 'g1', weight: 60 }]);
        expect(env.meter_groups![0].parents).toEqual([{ id: 'b1' }]);
    });

    it('deletes an asset\'s list that becomes empty instead of leaving an empty array', () => {
        const env = makeEnv();
        removeMeterReferences(env, ['g1']);
        const room = env.zones![0].zones![0].assets![0];
        expect(Object.prototype.hasOwnProperty.call(room, 'meter_parents')).toBe(false);
    });

    it('keeps a group\'s emptied parents as an empty list, since a group always has the field', () => {
        const env = makeEnv();
        removeMeterReferences(env, ['g1']);
        expect(env.meter_groups![1].parents).toEqual([]);
    });
});
