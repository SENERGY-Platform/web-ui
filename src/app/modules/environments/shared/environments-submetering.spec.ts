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

import { submeteredChildren, submeteringTargets } from './environments-submetering';
import { Environment } from './environments.model';

const env: Environment = {
    zones: [
        {
            name: 'Site A',
            assets: [
                { id: 'a1', name: 'Main meter' },
                { id: 'a2', name: 'Sub meter' },
            ],
            zones: [
                {
                    name: 'Floor 1',
                    assets: [{ id: 'a3', name: 'Room meter' }, { name: 'Draft asset (no id)' }],
                },
            ],
        },
        {
            name: 'Site B',
            assets: [{ id: 'b1', name: 'Other site meter' }],
        },
    ],
};

describe('submeteringTargets', () => {
    it('lists every asset with an id under the same top level zone, labelled with its own zone', () => {
        const options = submeteringTargets(env, { zoneIndexes: [0], assetIndex: 1 });
        expect(options).toEqual([
            { id: 'a1', label: 'Main meter (Site A)' },
            { id: 'a3', label: 'Room meter (Floor 1)' },
        ]);
    });

    it('excludes the asset at the given location', () => {
        const options = submeteringTargets(env, { zoneIndexes: [0], assetIndex: 0 });
        expect(options.some((o) => o.id === 'a1')).toBe(false);
    });

    it('does not offer an asset from a different top level zone', () => {
        const options = submeteringTargets(env, { zoneIndexes: [0], assetIndex: 0 });
        expect(options.some((o) => o.id === 'b1')).toBe(false);
    });

    it('returns an empty list when the top level zone cannot be resolved', () => {
        expect(submeteringTargets(env, { zoneIndexes: [9], assetIndex: 0 })).toEqual([]);
    });

    it('joins the zone path below the top level zone so two same-named nested zones stay distinguishable', () => {
        const twoWings: Environment = {
            zones: [
                {
                    name: 'Site',
                    zones: [
                        { name: 'Wing A', zones: [{ name: 'Room', assets: [{ id: 'r1', name: 'Meter' }] }] },
                        { name: 'Wing B', zones: [{ name: 'Room', assets: [{ id: 'r2', name: 'Meter' }] }] },
                    ],
                },
            ],
        };
        const options = submeteringTargets(twoWings, { zoneIndexes: [0], assetIndex: 0 });
        expect(options).toEqual([
            { id: 'r1', label: 'Meter (Wing A / Room)' },
            { id: 'r2', label: 'Meter (Wing B / Room)' },
        ]);
    });

    it('excludes an asset sharing the self asset\'s id, even at a different index', () => {
        const duplicateIds: Environment = {
            zones: [
                {
                    name: 'Site',
                    assets: [
                        { id: 'a1', name: 'First' },
                        { id: 'a1', name: 'Duplicate id' },
                        { id: 'a2', name: 'Other' },
                    ],
                },
            ],
        };
        const options = submeteringTargets(duplicateIds, { zoneIndexes: [0], assetIndex: 0 });
        expect(options).toEqual([{ id: 'a2', label: 'Other (Site)' }]);
    });
});

describe('submeteredChildren', () => {
    const meter = { id: 'a1', name: 'Main meter' };

    it('returns every asset whose submetered_by names the given asset', () => {
        const withChildren: Environment = {
            zones: [
                {
                    name: 'Site',
                    assets: [
                        meter,
                        { id: 'c1', name: 'Sub 1', submetered_by: 'a1', channels: [{ characteristic_id: 'kwh' }] },
                        { id: 'c2', name: 'Sub 2', submetered_by: 'a1', channels: [{ characteristic_id: 'temperature' }] },
                        { id: 'c3', name: 'Unrelated', submetered_by: 'other' },
                    ],
                },
            ],
        };
        const children = submeteredChildren(withChildren, meter, 'kwh');
        expect(children).toEqual([
            { id: 'c1', name: 'Sub 1', hasMatchingChannel: true },
            { id: 'c2', name: 'Sub 2', hasMatchingChannel: false },
        ]);
    });

    it('finds children nested below sub-zones too', () => {
        const withNesting: Environment = {
            zones: [
                {
                    name: 'Site',
                    assets: [meter],
                    zones: [{ name: 'Floor', assets: [{ id: 'c1', name: 'Sub', submetered_by: 'a1', channels: [] }] }],
                },
            ],
        };
        expect(submeteredChildren(withNesting, meter, 'kwh')).toEqual([{ id: 'c1', name: 'Sub', hasMatchingChannel: false }]);
    });

    it('returns an empty list when nothing is sub-metered by this asset', () => {
        expect(submeteredChildren(env, { id: 'a1' }, 'kwh')).toEqual([]);
    });

    it('returns an empty list when the asset itself has no id', () => {
        expect(submeteredChildren(env, {}, 'kwh')).toEqual([]);
    });

    it('compares characteristic_id trimmed on both sides, like the server\'s strings.TrimSpace', () => {
        const withPadding: Environment = {
            zones: [
                {
                    name: 'Site',
                    assets: [meter, { id: 'c1', name: 'Sub', submetered_by: 'a1', channels: [{ characteristic_id: '  kwh  ' }] }],
                },
            ],
        };
        expect(submeteredChildren(withPadding, meter, ' kwh ')).toEqual([{ id: 'c1', name: 'Sub', hasMatchingChannel: true }]);
    });
});
