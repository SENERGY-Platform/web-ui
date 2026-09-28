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

import { aspectTreeFromAspectNodes, classifyAspects, collidingAspectNames, withStoredAspects } from './aspect-select.model';
import { DeviceTypeAspectNodeModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';

const node = (id: string, parentId: string, rootId: string, childIds: string[]): DeviceTypeAspectNodeModel => ({
    id,
    name: id.toUpperCase(),
    root_id: rootId,
    parent_id: parentId,
    child_ids: childIds,
    ancestor_ids: [],
    descendent_ids: [],
});

describe('aspectTreeFromAspectNodes', () => {
    it('builds the hierarchy of a complete node list', () => {
        const tree = aspectTreeFromAspectNodes([node('inside', '', 'inside', ['air']), node('air', 'inside', 'inside', [])]);
        expect(tree).toEqual([{ id: 'inside', name: 'INSIDE', sub_aspects: [{ id: 'air', name: 'AIR', sub_aspects: [] }] }]);
    });

    it('keeps a node whose ancestors the list leaves out, as a root of its own', () => {
        // /aspect-nodes?function=measuring-function returns the used aspects and their descendants, not their ancestors
        const tree = aspectTreeFromAspectNodes([node('air', 'inside', 'inside', ['co2']), node('co2', 'air', 'inside', [])]);
        expect(tree).toEqual([{ id: 'air', name: 'AIR', sub_aspects: [{ id: 'co2', name: 'CO2', sub_aspects: [] }] }]);
    });

    it('lists a node once, below its parent, when the parent is present', () => {
        const tree = aspectTreeFromAspectNodes([node('air', 'inside', 'inside', []), node('inside', '', 'inside', ['air'])]);
        expect(tree.map((root) => root.id)).toEqual(['inside']);
    });

    it('treats a missing child list as a leaf', () => {
        const leaf = { ...node('air', '', 'air', []), child_ids: null as unknown as string[] };
        expect(aspectTreeFromAspectNodes([leaf])).toEqual([{ id: 'air', name: 'AIR', sub_aspects: [] }]);
    });
});

describe('aspectTreeFromAspectNodes classification', () => {
    const environment = 'urn:infai:ses:aspect-class:environment';
    const withClass = (n: DeviceTypeAspectNodeModel, classId: string): DeviceTypeAspectNodeModel => ({ ...n, aspect_class_id: classId });
    // the device-repository copies the class of a root to every node of its hierarchy
    const inside = withClass(node('inside', '', 'inside', ['air', 'water']), environment);
    const air = withClass(node('air', 'inside', 'inside', []), environment);
    const water = withClass(node('water', 'inside', 'inside', []), environment);
    const outside = withClass(node('outside', '', 'outside', []), 'urn:infai:ses:aspect-class:other');

    const collisions = (nodes: DeviceTypeAspectNodeModel[], selected: string[]) =>
        collidingAspectNames(classifyAspects(aspectTreeFromAspectNodes(nodes)), selected);

    it('carries the class of a node onto its tree node', () => {
        const [root] = aspectTreeFromAspectNodes([inside, air]);
        expect(root.aspect_class_id).toBe(environment);
    });

    it('rejects two siblings of one classified hierarchy', () => {
        expect(collisions([inside, air, water], ['air', 'water'])).toEqual(['AIR', 'WATER']);
    });

    it('rejects a parent together with its child', () => {
        expect(collisions([inside, air, water], ['inside', 'air'])).toEqual(['INSIDE', 'AIR']);
    });

    it('accepts aspects of different classified hierarchies', () => {
        expect(collisions([inside, air, outside], ['air', 'outside'])).toEqual([]);
    });

    it('rejects siblings whose common ancestor the list leaves out, as the listing of measuring aspects does', () => {
        expect(collisions([air, water], ['air', 'water'])).toEqual(['AIR', 'WATER']);
    });

    it('accepts nodes without a class, as before', () => {
        expect(collisions([node('air', '', 'air', []), node('water', '', 'water', [])], ['air', 'water'])).toEqual([]);
        expect(collisions([{ ...air, aspect_class_id: null }, { ...water, aspect_class_id: null }], ['air', 'water'])).toEqual([]);
    });
});

describe('withStoredAspects', () => {
    const tree = [{ id: 'inside', name: 'Inside', sub_aspects: [{ id: 'air', name: 'Air', sub_aspects: [] }] }];

    it('returns the tree itself when it holds every stored id, at any depth', () => {
        expect(withStoredAspects(tree, ['air', 'inside'])).toBe(tree);
    });

    it('appends a stored id the tree lacks once, named by its id', () => {
        expect(withStoredAspects(tree, ['gone', 'air', 'gone', ''])).toEqual([...tree, { id: 'gone', name: 'gone', sub_aspects: [] }]);
    });
});
