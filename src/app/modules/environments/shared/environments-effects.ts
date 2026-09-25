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

// Type-only: cytoscape's runtime is loaded lazily by environments-effects-cytoscape-loader.ts,
// and importing only its types here does not pull the library into this file's bundle.
import type { EdgeDefinition, NodeDefinition } from 'cytoscape';
import { EffectsEdge, EffectsEdgeKind, EffectsGraph, EffectsNode, EffectsUnresolved } from './environments.model';

export const EFFECTS_EDGE_KINDS: EffectsEdgeKind[] = [
    'reads',
    'writes',
    'gates',
    'scales',
    'submeters',
    'aggregates',
    'dated_change',
];

const EDGE_KIND_LABELS: Record<EffectsEdgeKind, string> = {
    reads: 'Reads',
    writes: 'Writes',
    gates: 'Gates',
    scales: 'Scales',
    submeters: 'Sub-meters',
    aggregates: 'Aggregates',
    dated_change: 'Dated change',
};

export function effectsEdgeKindLabel(kind: EffectsEdgeKind): string {
    return EDGE_KIND_LABELS[kind] || kind;
}

export interface EffectsFilterState {
    edgeKinds: Record<EffectsEdgeKind, boolean>;
    /** '' means every site. */
    site: string;
    /** Case-insensitive substring match against a node's label; '' highlights nothing. */
    search: string;
}

/**
 * submeters and aggregates are structural bookkeeping the tree already shows (an asset's
 * "Sub-metered by" field, an aggregate channel's own kind) -- switched off by default so the
 * first view of a ~75 node/~300 edge graph reads as the data flow, not the accounting behind
 * it. Every other kind starts on.
 */
export function defaultEffectsFilterState(): EffectsFilterState {
    return {
        edgeKinds: {
            reads: true,
            writes: true,
            gates: true,
            scales: true,
            submeters: false,
            aggregates: false,
            dated_change: true,
        },
        site: '',
        search: '',
    };
}

export interface EffectsSiteOption {
    id: string;
    label: string;
}

/**
 * Every distinct site (a top-level zone's id) an asset or zone node names, labelled via
 * siteNames (the environment document's own top-level zone names, see topLevelZoneNames in
 * environments-tree.ts) and falling back to the id. Deliberately not read off a zone node's own
 * label: moses only emits a zone node when that zone's state is itself read or written, so a
 * real graph (e.g. Musterwerke: 51 assets, 21 context keys, 1 timeline) can carry zero zone
 * nodes while still having assets spread across several sites.
 */
export function effectsSiteOptions(graph: EffectsGraph, siteNames: ReadonlyMap<string, string> = new Map()): EffectsSiteOption[] {
    const ids = new Set<string>();
    graph.nodes.forEach((node) => {
        if (isSiteScoped(node) && node.site) {
            ids.add(node.site);
        }
    });
    return Array.from(ids)
        .map((id) => ({ id, label: siteNames.get(id) || id }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

/** Context keys and the timeline node are global rather than sited, so the site filter never hides them. */
function isSiteScoped(node: EffectsNode): boolean {
    return node.kind === 'asset' || node.kind === 'zone';
}

export function effectsNodeVisible(node: EffectsNode, filters: EffectsFilterState): boolean {
    return !filters.site || !isSiteScoped(node) || node.site === filters.site;
}

/** Every node id the current filters keep visible (edge kind checkboxes only bear on edges, see visibleEffectsEdgeIndexes). */
export function visibleEffectsNodeIds(graph: EffectsGraph, filters: EffectsFilterState): Set<string> {
    return new Set(graph.nodes.filter((node) => effectsNodeVisible(node, filters)).map((node) => node.id));
}

/** Every edge index the current filters keep visible: its own kind is checked and both endpoints are visible nodes. */
export function visibleEffectsEdgeIndexes(graph: EffectsGraph, filters: EffectsFilterState, visibleNodeIds: Set<string>): Set<number> {
    const indexes = new Set<number>();
    graph.edges.forEach((edge, index) => {
        if (filters.edgeKinds[edge.kind] !== false && visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)) {
            indexes.add(index);
        }
    });
    return indexes;
}

/** Whether a node's label (or id, absent one) matches the search box -- an empty search matches nothing, so nothing is highlighted by default. */
export function effectsNodeMatchesSearch(node: EffectsNode, search: string): boolean {
    const term = search.trim().toLowerCase();
    return term.length > 0 && (node.label || node.id).toLowerCase().includes(term);
}

function nodeClasses(node: EffectsNode): string {
    const classes = ['effects-node', 'effects-node-' + node.kind];
    if (node.kind === 'context_key') {
        if (node.static) {
            classes.push('effects-node-context-static');
        } else if (node.source_kind) {
            classes.push('effects-node-context-sourced');
        } else {
            // Referenced (e.g. by a formula) but declared nowhere in the document -- see the
            // `static`/`source_kind` field comments on EffectsNode.
            classes.push('effects-node-context-undeclared');
        }
    }
    if (node.kind === 'asset' && node.asset_kind) {
        classes.push('effects-node-asset-' + node.asset_kind);
    }
    return classes.join(' ');
}

/** What an edge's hover/selection label reads: via, then channel/key, then a xN count -- empty parts are left out rather than shown blank. */
function edgeLabel(edge: EffectsEdge): string {
    const parts: string[] = [];
    if (edge.via) {
        parts.push(edge.via);
    }
    if (edge.channel) {
        parts.push('ch ' + edge.channel);
    }
    if (edge.key) {
        parts.push(edge.key);
    }
    if (edge.count && edge.count > 1) {
        parts.push('x' + edge.count);
    }
    return parts.join(' · ');
}

export interface EffectsElements {
    nodes: NodeDefinition[];
    edges: EdgeDefinition[];
}

/**
 * Pure translation of the effect graph contract into cytoscape element definitions: every
 * node and edge the response carries, exactly once, with the classes their stylesheet keys
 * off of and a synthesized edge id (the contract's edges carry none, and several can share
 * the same from/to/kind). Built once per loaded graph; visibility and highlighting are then
 * layered on by toggling classes/style on these same elements (see the component) rather
 * than rebuilding or re-filtering this array, so a filter change never disturbs the layout
 * already computed for them.
 */
export function buildEffectsElements(graph: EffectsGraph): EffectsElements {
    const nodes: NodeDefinition[] = graph.nodes.map((node) => ({
        data: { id: node.id, label: node.label || node.id },
        classes: nodeClasses(node),
    }));
    const edges: EdgeDefinition[] = graph.edges.map((edge, index) => ({
        data: { id: 'e' + index, source: edge.from, target: edge.to, label: edgeLabel(edge) },
        classes: 'effects-edge effects-edge-' + edge.kind,
    }));
    return { nodes, edges };
}

export function effectsNodeById(graph: EffectsGraph, id: string): EffectsNode | undefined {
    return graph.nodes.find((node) => node.id === id);
}

export interface EffectsNodeEdges {
    incoming: EffectsEdge[];
    outgoing: EffectsEdge[];
}

/** A node's incoming and outgoing edges -- what the side panel lists once a node is selected. */
export function edgesForNode(graph: EffectsGraph, nodeId: string): EffectsNodeEdges {
    return {
        incoming: graph.edges.filter((edge) => edge.to === nodeId),
        outgoing: graph.edges.filter((edge) => edge.from === nodeId),
    };
}

export interface EffectsEdgeGroup {
    kind: EffectsEdgeKind;
    edges: EffectsEdge[];
}

/** Groups a node's edges by kind, in EFFECTS_EDGE_KINDS order, leaving out kinds with nothing to show. */
export function groupEffectsEdgesByKind(edges: EffectsEdge[]): EffectsEdgeGroup[] {
    return EFFECTS_EDGE_KINDS.map((kind) => ({ kind, edges: edges.filter((edge) => edge.kind === kind) })).filter(
        (group) => group.edges.length > 0,
    );
}

/**
 * The graph node id an unresolved entry's asset links to, or undefined if it names none --
 * mirrors the "asset:<assetId>" id an asset node itself carries.
 */
export function unresolvedEffectsNodeId(item: EffectsUnresolved): string | undefined {
    return item.asset ? 'asset:' + item.asset : undefined;
}
