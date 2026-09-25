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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { EnvironmentsEffectsComponent } from './environments-effects.component';
import { EffectsGraph, EffectsNode } from '../../shared/environments.model';

// Shaped like a real GET .../effects answer: asset nodes carry their site directly and there is
// no zone node at all (moses only emits one when that zone's own state is itself read or
// written). a1 is read from the outdoor temperature and sub-metered by a2; a3 sits on a second
// site, enough to exercise the site filter, the search box and the incoming/outgoing grouping.
const graph: EffectsGraph = {
    nodes: [
        { id: 'context:outdoor_temp', kind: 'context_key', label: 'outdoor_temp', static: false, source_kind: 'profile' },
        { id: 'asset:a1', kind: 'asset', label: 'Main meter', zone: 'z1', site: 'z1', asset_kind: 'meter' },
        { id: 'asset:a2', kind: 'asset', label: 'Sub meter', zone: 'z1', site: 'z1', asset_kind: 'meter' },
        { id: 'asset:a3', kind: 'asset', label: 'Other meter', zone: 'z2', site: 'z2', asset_kind: 'sensor' },
    ],
    edges: [
        { from: 'context:outdoor_temp', to: 'asset:a1', kind: 'reads', via: 'formula' },
        { from: 'asset:a2', to: 'asset:a1', kind: 'submeters', via: 'submetered_by' },
    ],
    unresolved: [],
};

const siteNames = new Map([
    ['z1', 'Site A'],
    ['z2', 'Site B'],
]);

describe('EnvironmentsEffectsComponent', () => {
    let component: EnvironmentsEffectsComponent;
    let fixture: ComponentFixture<EnvironmentsEffectsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [EnvironmentsEffectsComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatCheckboxModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatButtonModule,
                MatExpansionModule,
                MtxSelectModule,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EnvironmentsEffectsComponent);
        component = fixture.componentInstance;
    });

    /** Same manual-ngOnChanges pattern as environments-factor-bars.component.spec.ts: this is a bare root fixture, so nothing ever binds `[result]`/`[siteNames]` for Angular to diff on its own. */
    function setResult(result: { kind: 'graph'; graph: EffectsGraph }, withSiteNames = siteNames): void {
        component.result = result;
        component.siteNames = withSiteNames;
        component.ngOnChanges({
            siteNames: { currentValue: withSiteNames, previousValue: undefined, firstChange: true, isFirstChange: () => true },
            result: { currentValue: result, previousValue: undefined, firstChange: true, isFirstChange: () => true },
        });
    }

    // These do not await the async ngAfterViewInit (the dynamic cytoscape import): selectNode,
    // the grouping it derives and the template bindings that read them are plain component
    // state, correct whether or not the graph library has finished loading -- see renderGraph's
    // guard on cytoscapeFactory. Only the smoke test below needs the real library.
    describe('without waiting for cytoscape to load', () => {
        beforeEach(() => {
            setResult({ kind: 'graph', graph });
            fixture.detectChanges();
        });

        it('reads siteOptions/siteSelectItems off the graph, labelled via siteNames', () => {
            expect(component.siteOptions).toEqual([
                { id: 'z1', label: 'Site A' },
                { id: 'z2', label: 'Site B' },
            ]);
            expect(component.siteSelectItems).toEqual([
                { id: '', label: 'All sites' },
                { id: 'z1', label: 'Site A' },
                { id: 'z2', label: 'Site B' },
            ]);
        });

        it('falls back to a site\'s id once siteNames arrives without an entry for it', () => {
            component.siteNames = new Map([['z1', 'Site A']]); // z2 missing
            component.ngOnChanges({
                siteNames: { currentValue: component.siteNames, previousValue: siteNames, firstChange: false, isFirstChange: () => false },
            });

            expect(component.siteOptions).toEqual([
                { id: 'z1', label: 'Site A' },
                { id: 'z2', label: 'z2' },
            ]);
        });

        it('a node click fills the side panel with its edges grouped by kind, respecting the edge-kind checkboxes', () => {
            component.selectNode('asset:a1');

            expect(component.selectedNode?.id).toBe('asset:a1');
            // submeters is off by default (see defaultEffectsFilterState), so it is not listed yet.
            expect(component.incomingGroups.map((g) => g.kind)).toEqual(['reads']);
            expect(component.outgoingGroups).toEqual([]);
        });

        it('checking submeters adds it to the already-selected node\'s side panel, unchecking reads removes that one', () => {
            component.selectNode('asset:a1');

            component.filters.edgeKinds.submeters = true;
            component.onFiltersChanged();
            expect(component.incomingGroups.map((g) => g.kind)).toEqual(['reads', 'submeters']);

            component.filters.edgeKinds.reads = false;
            component.onFiltersChanged();
            expect(component.incomingGroups.map((g) => g.kind)).toEqual(['submeters']);
        });

        it('clicking a neighbour in the side panel selects it', () => {
            component.filters.edgeKinds.submeters = true;
            component.selectNode('asset:a1');
            const submetersEdge = component.incomingGroups.find((g) => g.kind === 'submeters')!.edges[0];

            component.onNeighborClick(submetersEdge, 'incoming');

            expect(component.selectedNode?.id).toBe('asset:a2');
        });

        it('"Open in editor" emits the selected node', () => {
            component.selectNode('asset:a1');
            fixture.detectChanges();
            const emitted: EffectsNode[] = [];
            component.openInEditor.subscribe((node) => emitted.push(node));

            const button = fixture.debugElement.query(By.css('.effects-side-panel button'));
            button.nativeElement.click();

            expect(emitted.length).toBe(1);
            expect(emitted[0].id).toBe('asset:a1');
        });

        it('clears the side panel when the background is deselected', () => {
            component.selectNode('asset:a1');
            component.selectNode(undefined);

            expect(component.selectedNode).toBeUndefined();
            expect(component.incomingGroups).toEqual([]);
        });
    });

    // The one test that lets the real dynamic import resolve and mounts an actual cytoscape
    // instance -- everything else above is tested at the component-state level precisely to
    // keep the rest of the suite off that (real chunk load + real dagre layout) path.
    it('mounts cytoscape with the graph\'s elements, hides an unchecked edge kind, highlights a search match, and reveals a filtered-out node before centering on it', async () => {
        setResult({ kind: 'graph', graph });
        fixture.detectChanges();
        await fixture.whenStable();

        const cy = (component as any).cy;
        expect(cy).toBeTruthy();
        expect(cy.nodes().length).toBe(graph.nodes.length);
        expect(cy.edges().length).toBe(graph.edges.length);
        // submeters is off by default (see defaultEffectsFilterState) -- applied on mount already.
        expect(cy.edges().filter('.effects-edge-submeters').first().style('display')).toBe('none');
        expect(cy.edges().filter('.effects-edge-reads').first().style('display')).not.toBe('none');

        component.filters.edgeKinds.reads = false;
        component.onFiltersChanged();
        expect(cy.edges().filter('.effects-edge-reads').first().style('display')).toBe('none');

        component.filters.search = 'main';
        component.onFiltersChanged();
        expect(cy.getElementById('asset:a1').hasClass('effects-node-match')).toBeTrue();
        expect(cy.getElementById('asset:a2').hasClass('effects-node-match')).toBeFalse();
        // search only highlights, it never hides.
        expect(cy.getElementById('asset:a2').style('display')).not.toBe('none');

        // asset:a3 sits on site z2; filtering the graph down to z1 hides it (display:none),
        // whose empty bounding box a naive center() would jump to instead of the node itself.
        component.filters = { ...component.filters, site: 'z1' };
        component.onFiltersChanged();
        expect(cy.getElementById('asset:a3').style('display')).toBe('none');

        component.selectNode('asset:a3', true);

        expect(component.filters.site).toBe('');
        expect(cy.getElementById('asset:a3').style('display')).not.toBe('none');
    });
});
