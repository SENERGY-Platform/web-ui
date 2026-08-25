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

import { buildEnvironmentTree, findNodeByKey, locationKey, pathToKey } from './environments-tree';
import { Environment } from './environments.model';

// b2 nests a zone within a zone with an asset at each level, so a builder that only looks
// at the top-level zones array would under-report the tree, same rationale as environments-count.spec.ts.
const nestedEnvironment: Environment = {
    id: 'e1',
    name: 'Plant A',
    zones: [
        {
            id: 'building',
            type: 'building',
            assets: [{ id: 'a1', name: 'Meter 1', channels: [{ id: 'c1', name: 'Power' }] }],
            zones: [
                {
                    id: 'floor',
                    type: 'floor',
                    assets: [{ id: 'a2', name: 'Meter 2', channels: [] }],
                },
            ],
        },
    ],
};

describe('buildEnvironmentTree', () => {
    it('builds a single root node for an environment without zones', () => {
        const env: Environment = { id: 'e1', name: 'Empty' };
        const root = buildEnvironmentTree(env);
        expect(root.kind).toBe('environment');
        expect(root.data).toBe(env);
        expect(root.children).toEqual([]);
    });

    it('links each node\'s data to the actual nested object, not a copy', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        const buildingNode = root.children[0];
        expect(buildingNode.data).toBe(nestedEnvironment.zones![0]);
    });

    it('descends recursively through nested zones and their assets and channels', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        expect(root.children.length).toBe(1);

        const building = root.children[0];
        expect(building.kind).toBe('zone');
        expect(building.icon).toBe('apartment');

        // children of a zone are its sub-zones first, then its own assets
        expect(building.children.length).toBe(2);
        const floor = building.children[0];
        const meter1 = building.children[1];
        expect(floor.kind).toBe('zone');
        expect(floor.icon).toBe('layers');
        expect(meter1.kind).toBe('asset');
        expect(meter1.icon).toBe('precision_manufacturing');

        expect(floor.children.length).toBe(1);
        expect(floor.children[0].kind).toBe('asset');

        expect(meter1.children.length).toBe(1);
        const power = meter1.children[0];
        expect(power.kind).toBe('channel');
        expect(power.icon).toBe('sensors');
        expect(power.data).toBe(nestedEnvironment.zones![0].assets![0].channels![0]);
    });

    it('gives every node a location matching its position in the document', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        const building = root.children[0];
        const floor = building.children[0];
        const meter2 = floor.children[0];

        expect(root.location).toEqual({ zoneIndexes: [] });
        expect(building.location).toEqual({ zoneIndexes: [0] });
        expect(floor.location).toEqual({ zoneIndexes: [0, 0] });
        expect(meter2.location).toEqual({ zoneIndexes: [0, 0], assetIndex: 0 });
    });

    it('gives every node a key derived only from its location, stable across rebuilds', () => {
        const first = buildEnvironmentTree(nestedEnvironment);
        const second = buildEnvironmentTree(nestedEnvironment);
        expect(first.children[0].key).toBe(second.children[0].key);
        expect(first.children[0].key).toBe(locationKey('zone', { zoneIndexes: [0] }));
    });
});

describe('findNodeByKey', () => {
    it('finds a deeply nested node by its key', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        const floor = root.children[0].children[0];
        expect(findNodeByKey(root, floor.key)).toBe(floor);
    });

    it('returns undefined for a key that does not exist in the tree', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        expect(findNodeByKey(root, 'asset:9:9:9')).toBeUndefined();
    });
});

describe('pathToKey', () => {
    it('returns the root-to-node chain, root first', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        const floor = root.children[0].children[0];
        const path = pathToKey(root, floor.key);
        expect(path.map(n => n.kind)).toEqual(['environment', 'zone', 'zone']);
        expect(path[path.length - 1]).toBe(floor);
    });

    it('returns an empty array for an unknown key', () => {
        const root = buildEnvironmentTree(nestedEnvironment);
        expect(pathToKey(root, 'nope')).toEqual([]);
    });
});
