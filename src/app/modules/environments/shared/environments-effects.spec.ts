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
    buildEffectsElements,
    defaultEffectsFilterState,
    edgesForNode,
    effectsNodeMatchesSearch,
    effectsNodeVisible,
    effectsSiteOptions,
    groupEffectsEdgesByKind,
    unresolvedEffectsNodeId,
    visibleEffectsEdgeIndexes,
    visibleEffectsNodeIds,
} from './environments-effects';
import { EffectsGraph } from './environments.model';

// Shaped like a real GET .../effects answer (Musterwerke): asset nodes carry their site
// directly, and there is no zone node at all -- moses only emits one when that zone's own state
// is itself read or written, which a formula-only/aggregate-only document never does. z-standort-a
// carries a1 (read from outdoor_temp) and its sub-meter a2; z-standort-b carries the unrelated b1.
const graph: EffectsGraph = {
    nodes: [
        { id: 'context:outdoor_temp', kind: 'context_key', label: 'outdoor_temp', static: false, source_kind: 'profile' },
        { id: 'context:site_name', kind: 'context_key', label: 'site_name', static: true, source_kind: '' },
        { id: 'context:undeclared_key', kind: 'context_key', label: 'undeclared_key', static: false, source_kind: '' },
        { id: 'timeline', kind: 'timeline', label: 'Dated changes' },
        { id: 'asset:a1', kind: 'asset', label: 'Main meter', zone: 'z-standort-a', site: 'z-standort-a', asset_kind: 'meter' },
        { id: 'asset:a2', kind: 'asset', label: 'Sub meter', zone: 'z-standort-a', site: 'z-standort-a', asset_kind: 'meter' },
        { id: 'asset:b1', kind: 'asset', label: 'Other meter', zone: 'z-standort-b', site: 'z-standort-b', asset_kind: 'sensor' },
    ],
    edges: [
        { from: 'context:outdoor_temp', to: 'asset:a1', kind: 'reads', via: 'formula', key: 'outdoor_temp' },
        { from: 'asset:a1', to: 'asset:a1', kind: 'writes', via: 'script', channel: 'c1' },
        { from: 'asset:a2', to: 'asset:a1', kind: 'submeters', via: 'submetered_by' },
        { from: 'timeline', to: 'context:outdoor_temp', kind: 'dated_change', via: 'timeline' },
        { from: 'asset:b1', to: 'asset:b1', kind: 'writes', via: 'script', channel: 'c4', count: 3 },
    ],
    unresolved: [{ asset: 'a1', channel: 'c1', expression: 'inputs.missing', reason: 'no such channel' }, { expression: 'x + 1', reason: 'no asset named' }],
};

describe('defaultEffectsFilterState', () => {
    it('starts with submeters and aggregates off and every other kind on', () => {
        const state = defaultEffectsFilterState();
        expect(state.edgeKinds.submeters).toBeFalse();
        expect(state.edgeKinds.aggregates).toBeFalse();
        expect(state.edgeKinds.reads).toBeTrue();
        expect(state.edgeKinds.writes).toBeTrue();
        expect(state.edgeKinds.gates).toBeTrue();
        expect(state.edgeKinds.scales).toBeTrue();
        expect(state.edgeKinds.dated_change).toBeTrue();
        expect(state.site).toBe('');
        expect(state.search).toBe('');
    });
});

describe('effectsSiteOptions', () => {
    // Real graphs mostly carry no zone node at all (see the fixture's own comment), so the site
    // set has to come from asset nodes' own `site` field, not from a zone node's label.
    it('derives sites from asset nodes alone, labelled via siteNames and falling back to the id when a site has no entry there', () => {
        const siteNames = new Map([['z-standort-a', 'Standort A']]); // z-standort-b deliberately absent
        expect(effectsSiteOptions(graph, siteNames)).toEqual([
            { id: 'z-standort-a', label: 'Standort A' },
            { id: 'z-standort-b', label: 'z-standort-b' },
        ]);
    });

    it('falls back to the id for every site when siteNames is omitted entirely', () => {
        expect(effectsSiteOptions(graph)).toEqual([
            { id: 'z-standort-a', label: 'z-standort-a' },
            { id: 'z-standort-b', label: 'z-standort-b' },
        ]);
    });
});

describe('effectsNodeVisible / visibleEffectsNodeIds', () => {
    it('keeps every node when no site is chosen', () => {
        const ids = visibleEffectsNodeIds(graph, defaultEffectsFilterState());
        expect(ids.size).toBe(graph.nodes.length);
    });

    it('restricts asset nodes to the chosen site but never hides context keys or the timeline', () => {
        const filters = { ...defaultEffectsFilterState(), site: 'z-standort-a' };
        const ids = visibleEffectsNodeIds(graph, filters);

        expect(ids.has('asset:a1')).toBeTrue();
        expect(ids.has('asset:a2')).toBeTrue();
        expect(ids.has('asset:b1')).toBeFalse();
        expect(ids.has('context:outdoor_temp')).toBeTrue();
        expect(ids.has('timeline')).toBeTrue();
    });

    it('effectsNodeVisible agrees with visibleEffectsNodeIds for a single node', () => {
        const filters = { ...defaultEffectsFilterState(), site: 'z-standort-b' };
        const b1 = graph.nodes.find((n) => n.id === 'asset:b1')!;
        const a1 = graph.nodes.find((n) => n.id === 'asset:a1')!;
        expect(effectsNodeVisible(b1, filters)).toBeTrue();
        expect(effectsNodeVisible(a1, filters)).toBeFalse();
    });
});

describe('visibleEffectsEdgeIndexes', () => {
    it('keeps an edge only when its kind is checked and both endpoints are visible', () => {
        const filters = defaultEffectsFilterState(); // submeters off by default
        const visibleNodeIds = visibleEffectsNodeIds(graph, filters);
        const visible = visibleEffectsEdgeIndexes(graph, filters, visibleNodeIds);

        expect(visible.has(0)).toBeTrue(); // reads
        expect(visible.has(1)).toBeTrue(); // writes
        expect(visible.has(2)).toBeFalse(); // submeters: off by default
        expect(visible.has(3)).toBeTrue(); // dated_change
    });

    it('hides an edge whose endpoint the site filter hides, even if its own kind is checked', () => {
        const filters = { ...defaultEffectsFilterState(), site: 'z-standort-a' };
        const visibleNodeIds = visibleEffectsNodeIds(graph, filters);
        const visible = visibleEffectsEdgeIndexes(graph, filters, visibleNodeIds);

        expect(visible.has(4)).toBeFalse(); // asset:b1 -> asset:b1, site z-standort-b
    });
});

describe('effectsNodeMatchesSearch', () => {
    it('matches case-insensitively against the label', () => {
        const node = graph.nodes.find((n) => n.id === 'asset:a1')!;
        expect(effectsNodeMatchesSearch(node, 'main')).toBeTrue();
        expect(effectsNodeMatchesSearch(node, 'MAIN METER')).toBeTrue();
        expect(effectsNodeMatchesSearch(node, 'sub')).toBeFalse();
    });

    it('matches nothing for an empty or blank search', () => {
        const node = graph.nodes.find((n) => n.id === 'asset:a1')!;
        expect(effectsNodeMatchesSearch(node, '')).toBeFalse();
        expect(effectsNodeMatchesSearch(node, '   ')).toBeFalse();
    });
});

describe('buildEffectsElements', () => {
    it('carries every node once, with an id/label and a kind-derived class', () => {
        const elements = buildEffectsElements(graph);
        expect(elements.nodes.length).toBe(graph.nodes.length);
        const a1 = elements.nodes.find((n) => n.data.id === 'asset:a1')!;
        expect(a1.data['label']).toBe('Main meter');
        expect(a1.classes).toContain('effects-node-asset');
        expect(a1.classes).toContain('effects-node-asset-meter');
    });

    it('distinguishes a static, a sourced and an undeclared context key by class', () => {
        const elements = buildEffectsElements(graph);
        const staticKey = elements.nodes.find((n) => n.data.id === 'context:site_name')!;
        const sourcedKey = elements.nodes.find((n) => n.data.id === 'context:outdoor_temp')!;
        const undeclaredKey = elements.nodes.find((n) => n.data.id === 'context:undeclared_key')!;
        expect(staticKey.classes).toContain('effects-node-context-static');
        expect(sourcedKey.classes).toContain('effects-node-context-sourced');
        expect(undeclaredKey.classes).toContain('effects-node-context-undeclared');
    });

    it('gives every edge a unique synthesized id and its own from/to/kind', () => {
        const elements = buildEffectsElements(graph);
        expect(elements.edges.length).toBe(graph.edges.length);
        const ids = elements.edges.map((e) => e.data.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(elements.edges[0].data.source).toBe('context:outdoor_temp');
        expect(elements.edges[0].data.target).toBe('asset:a1');
        expect(elements.edges[0].classes).toContain('effects-edge-reads');
    });

    it('builds a hover/selection label out of via, channel, key and a xN count, leaving out what is absent', () => {
        const elements = buildEffectsElements(graph);
        expect(elements.edges[0].data['label']).toBe('formula · outdoor_temp');
        expect(elements.edges[4].data['label']).toBe('script · ch c4 · x3');
    });
});

describe('edgesForNode / groupEffectsEdgesByKind', () => {
    // asset:a1's own "writes" edge is a self-loop (an asset publishing its own channel), so it
    // counts on both sides -- incoming as the channel's owner, outgoing as the writer.
    it('splits a node\'s edges into incoming and outgoing, a self-loop counting on both sides', () => {
        const edges = edgesForNode(graph, 'asset:a1');
        expect(edges.incoming.map((e) => e.kind).sort()).toEqual(['reads', 'submeters', 'writes']);
        expect(edges.outgoing.map((e) => e.kind)).toEqual(['writes']);
    });

    it('groups by kind in EFFECTS_EDGE_KINDS order, leaving out kinds with nothing to show', () => {
        const groups = groupEffectsEdgesByKind(edgesForNode(graph, 'asset:a1').incoming);
        expect(groups.map((g) => g.kind)).toEqual(['reads', 'writes', 'submeters']);
        expect(groups[0].edges.length).toBe(1);
    });
});

describe('unresolvedEffectsNodeId', () => {
    it('builds the asset node id an unresolved entry names', () => {
        expect(unresolvedEffectsNodeId(graph.unresolved[0])).toBe('asset:a1');
    });

    it('returns undefined when the entry names no asset', () => {
        expect(unresolvedEffectsNodeId(graph.unresolved[1])).toBeUndefined();
    });
});
