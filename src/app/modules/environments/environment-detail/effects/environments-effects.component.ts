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

import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import type { Core, StylesheetJsonBlock } from 'cytoscape';
import type { DagreLayoutOptions } from 'cytoscape-dagre';
import type { CytoscapeFactory } from './environments-effects-cytoscape-loader';
import { EffectsEdge, EffectsGraph, EffectsNode, EffectsResult, EffectsUnresolved } from '../../shared/environments.model';
import {
    buildEffectsElements,
    defaultEffectsFilterState,
    edgesForNode,
    EFFECTS_EDGE_KINDS,
    effectsEdgeKindLabel,
    EffectsEdgeGroup,
    EffectsFilterState,
    effectsNodeById,
    effectsNodeMatchesSearch,
    effectsNodeVisible,
    EffectsSiteOption,
    effectsSiteOptions,
    groupEffectsEdgesByKind,
    unresolvedEffectsNodeId,
    visibleEffectsEdgeIndexes,
    visibleEffectsNodeIds,
} from '../../shared/environments-effects';

/**
 * Node/edge look by kind, applied once per (re)built graph (see renderGraph) -- filtering
 * and search then only toggle the classes/display these rules key off, never rebuild this.
 */
const EFFECTS_STYLESHEET: StylesheetJsonBlock[] = [
    {
        selector: 'node',
        style: {
            label: 'data(label)',
            'font-size': 9,
            'text-wrap': 'wrap',
            'text-max-width': '90',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 34,
            height: 34,
            'border-width': 2,
            'background-color': '#9e9e9e',
            'border-color': '#616161',
        },
    },
    { selector: 'node.effects-node-context-static', style: { shape: 'round-rectangle', 'background-color': '#90caf9', 'border-color': '#1565c0' } },
    {
        selector: 'node.effects-node-context-sourced',
        style: { shape: 'round-rectangle', 'background-color': '#1565c0', color: '#ffffff', 'border-style': 'dashed', 'border-color': '#0d47a1' },
    },
    {
        selector: 'node.effects-node-context-undeclared',
        style: { shape: 'round-rectangle', 'background-color': '#fff3e0', 'border-style': 'dashed', 'border-color': '#e65100' },
    },
    { selector: 'node.effects-node-timeline', style: { shape: 'round-rectangle', 'background-color': '#ab47bc', 'border-color': '#6a1b9a', width: 46, height: 30 } },
    { selector: 'node.effects-node-zone', style: { shape: 'round-rectangle', 'background-color': '#eeeeee', 'border-color': '#9e9e9e', color: '#424242', width: 46, height: 30 } },
    { selector: 'node.effects-node-asset-meter', style: { 'background-color': '#4caf50', 'border-color': '#2e7d32' } },
    { selector: 'node.effects-node-asset-inverter', style: { 'background-color': '#ff9800', 'border-color': '#e65100' } },
    { selector: 'node.effects-node-asset-machine', style: { 'background-color': '#ff7043', 'border-color': '#bf360c' } },
    { selector: 'node.effects-node-asset-sensor', style: { 'background-color': '#26c6da', 'border-color': '#00838f' } },
    { selector: 'node.effects-node-asset-actuator', style: { 'background-color': '#ec407a', 'border-color': '#ad1457' } },
    { selector: 'node.effects-node-match', style: { 'border-width': 4, 'border-color': '#fdd835' } },
    { selector: 'node.effects-dim', style: { opacity: 0.2 } },
    { selector: 'node.effects-highlight', style: { 'border-width': 4 } },
    {
        selector: 'edge',
        style: {
            width: 1.5,
            'line-color': '#90a4ae',
            'target-arrow-color': '#90a4ae',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            label: '',
            'font-size': 8,
            'text-background-color': '#ffffff',
            'text-background-opacity': 1,
            'text-rotation': 'autorotate',
        },
    },
    { selector: 'edge.effects-edge-reads', style: { 'line-color': '#42a5f5', 'target-arrow-color': '#42a5f5' } },
    { selector: 'edge.effects-edge-writes', style: { 'line-color': '#66bb6a', 'target-arrow-color': '#66bb6a' } },
    { selector: 'edge.effects-edge-gates', style: { 'line-style': 'dashed', 'line-color': '#ab47bc', 'target-arrow-color': '#ab47bc' } },
    { selector: 'edge.effects-edge-scales', style: { 'line-style': 'dashed', 'line-color': '#ffa726', 'target-arrow-color': '#ffa726' } },
    { selector: 'edge.effects-edge-submeters', style: { width: 1, 'line-color': '#bdbdbd', 'target-arrow-color': '#bdbdbd' } },
    { selector: 'edge.effects-edge-aggregates', style: { width: 1, 'line-style': 'dotted', 'line-color': '#bdbdbd', 'target-arrow-color': '#bdbdbd' } },
    { selector: 'edge.effects-edge-dated_change', style: { 'line-style': 'dashed', 'line-color': '#8d6e63', 'target-arrow-color': '#8d6e63' } },
    { selector: 'edge.effects-hover', style: { label: 'data(label)' } },
    { selector: 'edge.effects-dim', style: { opacity: 0.15 } },
    { selector: 'edge.effects-highlight', style: { width: 3 } },
];

/**
 * Renders one environment's effect graph (GET .../effects) with cytoscape + cytoscape-dagre,
 * lazily imported on first view init so neither library ever lands in the app's main chunk
 * (see environments-effects-cytoscape-loader.ts). Purely input-driven: the parent
 * (EnvironmentDetailComponent) owns fetching the graph and reacting to "open in editor";
 * this component only ever reads `result` and emits `openInEditor`.
 */
@Component({
    selector: 'senergy-environments-effects',
    templateUrl: './environments-effects.component.html',
    styleUrls: ['./environments-effects.component.css'],
})
export class EnvironmentsEffectsComponent implements OnChanges, AfterViewInit, OnDestroy {
    @Input() result: EffectsResult | undefined;
    /** Top-level zone id -> name, from the environment document (see topLevelZoneNames) -- labels the site filter, since moses mostly answers with no zone node at all to read a name off. */
    @Input() siteNames: ReadonlyMap<string, string> = new Map();
    @Output() openInEditor = new EventEmitter<EffectsNode>();

    @ViewChild('host', { static: true }) private host!: ElementRef<HTMLElement>;

    readonly edgeKinds = EFFECTS_EDGE_KINDS;
    effectsEdgeKindLabel = effectsEdgeKindLabel;

    graph: EffectsGraph | undefined;
    filters: EffectsFilterState = defaultEffectsFilterState();
    siteOptions: EffectsSiteOption[] = [];
    /** siteOptions with a leading "All sites" entry (id: '') -- the same empty-string-means-unset sentinel mtx-select uses elsewhere in this module. */
    siteSelectItems: EffectsSiteOption[] = [];

    selectedNode: EffectsNode | undefined;
    incomingGroups: EffectsEdgeGroup[] = [];
    outgoingGroups: EffectsEdgeGroup[] = [];

    /** True once the dynamic import of cytoscape/cytoscape-dagre has failed -- shows a hint instead of leaving the canvas blank forever. */
    libraryFailed = false;

    /** result's message when it is an 'error' -- a plain field rather than narrowing `result.kind === 'error'` inline in the template, see tsconfig's optionalChainNotNullable note on that pattern. */
    get errorMessage(): string | undefined {
        return this.result?.kind === 'error' ? this.result.message : undefined;
    }

    private cy: Core | undefined;
    private cytoscapeFactory: CytoscapeFactory | undefined;
    private libraryReady = false;
    private destroyed = false;

    constructor(private zone: NgZone) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['siteNames'] && !changes['siteNames'].firstChange) {
            this.refreshSiteOptions();
        }
        if (!changes['result']) {
            return;
        }
        if (this.result?.kind === 'graph' && this.result.graph !== this.graph) {
            this.graph = this.result.graph;
            this.refreshSiteOptions();
            this.selectNode(undefined);
            if (this.libraryReady) {
                this.renderGraph();
            }
        } else if (this.result?.kind !== 'graph') {
            this.graph = undefined;
            this.selectNode(undefined);
            this.destroyCy();
        }
    }

    /** (Re)computes siteOptions/siteSelectItems for the current graph, and drops the site filter if it named a site that no longer exists. Called for a new graph and again if siteNames itself arrives or changes later than the graph did. */
    private refreshSiteOptions(): void {
        if (!this.graph) {
            this.siteOptions = [];
            this.siteSelectItems = [];
            return;
        }
        this.siteOptions = effectsSiteOptions(this.graph, this.siteNames);
        this.siteSelectItems = this.siteOptions.length > 0 ? [{ id: '', label: 'All sites' }, ...this.siteOptions] : [];
        if (this.filters.site && !this.siteOptions.some((option) => option.id === this.filters.site)) {
            this.filters = { ...this.filters, site: '' };
        }
    }

    async ngAfterViewInit(): Promise<void> {
        let loader: typeof import('./environments-effects-cytoscape-loader');
        try {
            loader = await import('./environments-effects-cytoscape-loader');
        } catch {
            this.libraryFailed = true;
            return;
        }
        if (this.destroyed) {
            return; // the view was torn down while the chunk was still downloading
        }
        this.cytoscapeFactory = loader.loadCytoscape();
        this.libraryReady = true;
        if (this.graph) {
            this.renderGraph();
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.destroyCy();
    }

    /** Bound to every checkbox/select/search control -- re-applies visibility/highlight (applyFilters) and, since the edge-kind checkboxes also bear on what the side panel lists, refreshes it too. */
    onFiltersChanged(): void {
        this.applyFilters();
        this.refreshSelectedNodeEdges();
    }

    /** Node tap and side-panel/unresolved-list clicks alike; `center` pans the view to the node when it was not the click's own origin (the graph itself does not need re-centering on a node already visible under the pointer). */
    selectNode(id: string | undefined, center = false): void {
        this.selectedNode = id && this.graph ? effectsNodeById(this.graph, id) : undefined;
        this.refreshSelectedNodeEdges();
        this.updateHighlight();
        if (center && this.cy && this.selectedNode) {
            if (!effectsNodeVisible(this.selectedNode, this.filters)) {
                // Centering on a display:none element lands on an empty bounding box (0,0) --
                // reveal it by dropping the site filter rather than jumping there. Edge kinds
                // never hide a node, only the site filter does (see effectsNodeVisible).
                this.filters = { ...this.filters, site: '' };
                this.applyFilters();
            }
            const ele = this.cy.getElementById(this.selectedNode.id);
            if (ele.nonempty()) {
                this.cy.center(ele);
            }
        }
    }

    /** (Re)computes incomingGroups/outgoingGroups for the current selection, restricted to edge kinds the checkboxes still have on -- so the panel never lists an edge the graph itself is hiding. */
    private refreshSelectedNodeEdges(): void {
        if (!this.selectedNode || !this.graph) {
            this.incomingGroups = [];
            this.outgoingGroups = [];
            return;
        }
        const edges = edgesForNode(this.graph, this.selectedNode.id);
        const kindChecked = (edge: EffectsEdge) => this.filters.edgeKinds[edge.kind] !== false;
        this.incomingGroups = groupEffectsEdgesByKind(edges.incoming.filter(kindChecked));
        this.outgoingGroups = groupEffectsEdgesByKind(edges.outgoing.filter(kindChecked));
    }

    /** The label a neighbour id resolves to, for the side panel's edge rows. */
    nodeLabel(id: string): string {
        return (this.graph && effectsNodeById(this.graph, id)?.label) || id;
    }

    onNeighborClick(edge: EffectsEdge, direction: 'incoming' | 'outgoing'): void {
        this.selectNode(direction === 'incoming' ? edge.from : edge.to, true);
    }

    selectUnresolved(item: EffectsUnresolved): void {
        const id = unresolvedEffectsNodeId(item);
        if (id) {
            this.selectNode(id, true);
        }
    }

    private destroyCy(): void {
        this.cy?.destroy();
        this.cy = undefined;
    }

    /** (Re)builds the cytoscape instance from scratch and runs the dagre layout once -- only called for a genuinely new/reloaded graph, never for a filter change (see applyFilters). */
    private renderGraph(): void {
        const graph = this.graph;
        const factory = this.cytoscapeFactory;
        if (!graph || !factory) {
            return;
        }
        this.destroyCy();
        const elements = buildEffectsElements(graph);
        const layout: DagreLayoutOptions = { name: 'dagre', rankDir: 'LR', nodeSep: 24, rankSep: 90, padding: 20 };
        this.zone.runOutsideAngular(() => {
            const cy = factory({
                container: this.host.nativeElement,
                elements: [...elements.nodes, ...elements.edges],
                style: EFFECTS_STYLESHEET,
                layout,
                wheelSensitivity: 0.2,
            });
            this.cy = cy;
            cy.on('tap', 'node', (evt) => {
                const id = evt.target.id();
                this.zone.run(() => this.selectNode(id));
            });
            cy.on('tap', (evt) => {
                if (evt.target === cy) {
                    this.zone.run(() => this.selectNode(undefined));
                }
            });
            cy.on('mouseover', 'edge', (evt) => evt.target.addClass('effects-hover'));
            cy.on('mouseout', 'edge', (evt) => evt.target.removeClass('effects-hover'));
        });
        this.applyFilters();
    }

    /**
     * Sets display:none on every node/edge the current filters exclude and toggles the
     * search-match class -- never touches the layout, so node positions survive a filter
     * change (see the module doc comment).
     */
    private applyFilters(): void {
        const graph = this.graph;
        const cy = this.cy;
        if (!graph || !cy) {
            return;
        }
        const visibleNodeIds = visibleEffectsNodeIds(graph, this.filters);
        const visibleEdgeIndexes = visibleEffectsEdgeIndexes(graph, this.filters, visibleNodeIds);
        cy.nodes().forEach((node) => {
            const visible = visibleNodeIds.has(node.id());
            node.style('display', visible ? 'element' : 'none');
            const effectsNode = effectsNodeById(graph, node.id());
            node.toggleClass('effects-node-match', !!effectsNode && effectsNodeMatchesSearch(effectsNode, this.filters.search));
        });
        cy.edges().forEach((edge) => {
            const index = parseInt(edge.id().slice(1), 10);
            edge.style('display', visibleEdgeIndexes.has(index) ? 'element' : 'none');
        });
    }

    /** Dims everything outside the selected node's closed neighbourhood; clears back to normal when nothing is selected. */
    private updateHighlight(): void {
        const cy = this.cy;
        if (!cy) {
            return;
        }
        cy.elements().removeClass('effects-dim effects-highlight');
        if (!this.selectedNode) {
            return;
        }
        const node = cy.getElementById(this.selectedNode.id);
        if (node.empty()) {
            return;
        }
        const neighborhood = node.closedNeighborhood();
        cy.elements().difference(neighborhood).addClass('effects-dim');
        neighborhood.addClass('effects-highlight');
    }
}
