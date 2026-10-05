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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

import { FlowDesignerComponent } from './flow-designer.component';
import { DiagramEditorComponent } from '../diagram-editor/diagram-editor.component';
import { OperatorModel } from '../operator-repo/shared/operator.model';
import { environment } from '../../../../environments/environment';
import { adderFlow, edgeCaseFlow, estimatorFlow, localFlow } from './testing/stored-flows';

type StoredFlow = typeof adderFlow | typeof estimatorFlow | typeof localFlow | typeof edgeCaseFlow;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** What analytics-flow-repo-v2 keeps of a cell: a JSON decode into its lib.Cell and the encode on the way back. */
function asStoredByFlowRepo(cell: any): any {
    const out: any = {};
    const keep = (key: string, value: unknown) => {
        if (value !== undefined && value !== null) {
            out[key] = value;
        }
    };
    if (cell.type) {
        out.type = cell.type;
    }
    if (cell.inPorts?.length) {
        out.inPorts = [...cell.inPorts];
    }
    if (cell.outPorts?.length) {
        out.outPorts = [...cell.outPorts];
    }
    keep('name', cell.name);
    keep('image', cell.image);
    keep('operatorId', cell.operatorId);
    if (cell.position) {
        out.position = { x: cell.position.x ?? 0, y: cell.position.y ?? 0 };
    }
    for (const end of ['source', 'target']) {
        if (cell[end]) {
            out[end] = { id: cell[end].id ?? '', magnet: cell[end].magnet ?? '', port: cell[end].port ?? '' };
        }
    }
    if (cell.id) {
        out.id = cell.id;
    }
    if (cell.config) {
        out.config = cell.config.map((c: any) => {
            const value: any = {};
            if (c.name) {
                value.name = c.name;
            }
            if (c.type) {
                value.type = c.type;
            }
            return value;
        });
    }
    keep('cost', cell.cost);
    keep('deploymentType', cell.deploymentType);
    keep('version', cell.version);
    return out;
}

/** The stored cells after one open and save in the designer, as this designer has always produced them. */
function expectedAfterSave(flow: StoredFlow): any[] {
    return flow.model.cells.map((stored: any) => {
        if (stored.type === 'link') {
            // links are rebuilt from source and target: they get a new id and lose the magnet
            return {
                type: 'link',
                source: { id: stored.source.id, magnet: '', port: stored.source.port },
                target: { id: stored.target.id, magnet: '', port: stored.target.port },
                id: jasmine.stringMatching(UUID),
            };
        }
        const cell = asStoredByFlowRepo(stored);
        cell.deploymentType = stored.deploymentType === 'local' ? 'local' : 'cloud';
        // a node without a version takes the default of the node definition
        cell.version = stored.version ?? 0;
        return cell;
    });
}

function operatorsOf(flow: StoredFlow): OperatorModel[] {
    return flow.model.cells
        .filter((c: any) => c.type === 'senergy.NodeElement')
        .map((c: any) => ({
            _id: c.operatorId,
            name: c.name,
            image: c.image,
            description: undefined,
            deploymentType: c.deploymentType,
            userId: undefined,
            inputs: (c.inPorts || []).map((name: string) => ({ name, type: 'string' })),
            outputs: (c.outPorts || []).map((name: string) => ({ name, type: 'string' })),
            config_values: c.config,
            version: c.version,
        }));
}

function center(el: Element): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function mouse(type: string, target: EventTarget, at: { x: number; y: number }) {
    target.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window, clientX: at.x, clientY: at.y, button: 0, buttons: type === 'mouseup' ? 0 : 1,
    }));
}

function drag(from: Element, to: Element) {
    const start = center(from);
    const end = center(to);
    mouse('mousedown', from, start);
    mouse('mousemove', from, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
    mouse('mousemove', to, end);
    mouse('mouseup', to, end);
}

describe('FlowDesignerComponent with the diagram editor', () => {
    let fixture: ComponentFixture<FlowDesignerComponent>;
    let component: FlowDesignerComponent;
    let http: HttpTestingController;
    let routeId: string | null;

    beforeEach(waitForAsync(() => {
        routeId = null;
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FlowDesignerComponent, DiagramEditorComponent],
            imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        }).compileComponents();
    }));

    afterEach(() => {
        http.verify();
        fixture?.destroy();
    });

    async function open(flow: StoredFlow | null, operators: OperatorModel[] = flow ? operatorsOf(flow) : []) {
        routeId = flow ? flow._id : null;
        fixture = TestBed.createComponent(FlowDesignerComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
        http.expectOne((r) => r.url.startsWith(environment.operatorRepoUrl + '/operator?'))
            .flush({ operators, totalCount: operators.length });
        // the designer is shown once the operators are there, before the flow arrives
        await fixture.whenStable();
        fixture.detectChanges();
        expect(component.diagram.paperService.getPaper().el.getClientRects().length).withContext('paper displayed').toBeGreaterThan(0);
        component.diagram.onResize();
        if (flow) {
            http.expectOne(environment.flowRepoUrl + '/flow/' + flow._id).flush(JSON.parse(JSON.stringify(flow)));
        }
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function save(): any {
        component.saveModel();
        const id = component.flow._id;
        const request = http.expectOne(environment.flowRepoUrl + '/flow/' + (id === undefined ? '' : id + '/'));
        const body = request.request.body;
        request.flush(id === undefined ? { _id: 'new-flow' } : null);
        return body;
    }

    function cellNode(id: string): Element {
        return document.querySelector(`.joint-cell[model-id="${CSS.escape(id)}"]`)!;
    }

    function port(cellId: string, portId: string): Element {
        return cellNode(cellId).querySelector(`[port="${CSS.escape(portId)}"][magnet]`)!;
    }

    function graphCells(): any[] {
        return component.diagram.getGraph().cells as any[];
    }

    for (const flow of [adderFlow, estimatorFlow, localFlow, edgeCaseFlow]) {
        it(`saves the stored flow "${flow.name}" unchanged for the flow repo`, async () => {
            await open(flow);
            const saved = save();
            const stored = saved.model.cells.map(asStoredByFlowRepo);

            expect(stored).toEqual(expectedAfterSave(flow));
            const ids = stored.map((c: any) => c.id);
            expect(new Set(ids).size).toEqual(ids.length);
        });
    }

    it('lays out every node from its ports as before', async () => {
        await open(estimatorFlow);
        const nodes = graphCells().filter((c) => c.type === 'senergy.NodeElement');
        for (const node of nodes) {
            const ports = Math.max(node.inPorts.length, node.outPorts.length);
            expect(node.size).toEqual({ width: 250, height: Math.max(20 * ports + 30, 100) });
            expect(node.ports.items.map((p: any) => [p.id, p.group, p.attrs.portLabel.text])).toEqual([
                ...node.inPorts.map((p: string) => ['in-' + p, 'in', p]),
                ...node.outPorts.map((p: string) => ['out-' + p, 'out', p]),
            ]);
        }
    });

    it('creates one port per distinct port name', async () => {
        await open(edgeCaseFlow);
        const source = graphCells().find((c) => c.id === edgeCaseFlow.model.cells[0].id);
        expect(source.outPorts).toEqual(['value', 'value', 'name with spaces/and.dots']);
        expect(source.ports.items.map((p: any) => p.id)).toEqual(['out-value', 'out-name with spaces/and.dots']);
    });

    it('renders an image the pipeline views can read', async () => {
        await open(localFlow);
        component.diagram.zoomIn();
        component.diagram.paperService.getPaper().translate(30, -20);
        const image: string = save().image;

        expect(image.startsWith('<?xml version="1.0" standalone="no"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewbox="')).toBeTrue();
        const svg = new DOMParser().parseFromString(image, 'image/svg+xml').documentElement;
        expect(svg.querySelector('parsererror')).toBeNull();

        // the image is drawn unscaled and unpositioned, whatever the paper shows
        expect(svg.getAttribute('style')).toEqual('overflow: hidden;');
        expect(svg.getElementsByClassName('joint-layers')[0].getAttribute('transform')).toBeNull();
        expect(svg.querySelector('style, pattern, .joint-grid-layer')).toBeNull();

        const [x, y, width, height] = svg.getAttribute('viewbox')!.split(' ').map(Number);
        expect([x, y, width, height].every(Number.isFinite)).toBeTrue();
        // the view box frames the nodes, not the paper or its grid
        expect(x).toBeLessThanOrEqual(100);
        expect(x).toBeGreaterThan(100 - 150);
        expect(x + width).toBeGreaterThanOrEqual(580 + 250);
        expect(x + width).toBeLessThan(580 + 250 + 150);
        expect(y).toBeLessThanOrEqual(200);
        expect(y + height).toBeGreaterThanOrEqual(300);
        expect(height).toBeLessThan(250);

        // deploy-flow, new-export and the smart-service task dialog walk these nodes
        const layer = svg.getElementsByClassName('joint-cells-layer')[0];
        expect(layer).toBeDefined();
        const children = Array.from(layer.childNodes);
        expect(children.every((n) => n.nodeType === Node.ELEMENT_NODE)).toBeTrue();
        const nodes = children.filter((n) => (n as Element).getAttribute('data-type') === 'senergy.NodeElement') as Element[];
        expect(nodes.map((n) => n.getAttribute('model-id'))).toEqual(localFlow.model.cells.slice(0, 2).map((c) => c.id));
        expect(Array.from(svg.getElementsByClassName('joint-cell')).map((n) => n.getAttribute('model-id')))
            .toEqual(jasmine.arrayContaining(localFlow.model.cells.slice(0, 2).map((c) => c.id)));
        for (const node of nodes) {
            expect(node.classList.contains('joint-cell')).toBeTrue();
            const outlined = Array.from(node.childNodes).filter((n) => (n as Element).getAttribute?.('stroke') === 'black');
            expect(outlined.length).toBeGreaterThanOrEqual(2);
        }
        expect(children.filter((n) => (n as Element).getAttribute('data-type') === 'link').length).toEqual(1);
        // a link is a plain black line in the image; the wide hover strip of the editor must not become a click target
        for (const line of Array.from(svg.querySelectorAll('.connection'))) {
            expect(line.getAttribute('stroke')).toEqual('black');
            expect(line.getAttributeNames().filter((n) => !['class', 'id', 'stroke', 'd'].includes(n))).toEqual([]);
        }
        const strips = Array.from(svg.querySelectorAll('.connection-wrap'));
        expect(strips.length).toEqual(1);
        for (const strip of strips) {
            expect(strip.getAttributeNames().filter((n) => !['class', 'id', 'd'].includes(n))).toEqual([]);
        }

        const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
        expect(texts).toEqual(jasmine.arrayContaining(['local-adder', 'addTimestamp', 'value1', 'sum', 'output_value']));
        for (const attribute of ['magnet', 'joint-selector', 'port-group', 'event', 'cursor']) {
            const selector = ['text', 'g', 'circle', 'rect', 'tspan', 'path'].map((tag) => `${tag}[${attribute}]`).join(',');
            expect(svg.querySelector(selector)).withContext(attribute).toBeNull();
        }
    });

    it('connects an output to an input by dragging between the ports', async () => {
        await open(localFlow);
        const [local, timestamp] = localFlow.model.cells;
        drag(port(local.id, 'out-sum'), port(timestamp.id, 'in-original_input_ids'));

        const links = graphCells().filter((c) => c.type === 'link');
        expect(links.length).toEqual(2);
        expect(asStoredByFlowRepo(links[1])).toEqual({
            type: 'link',
            source: { id: local.id, magnet: 'portBody', port: 'out-sum' },
            target: { id: timestamp.id, magnet: 'portBody', port: 'in-original_input_ids' },
            id: jasmine.stringMatching(UUID),
        });
    });

    it('leaves a link that starts at an input pinned to the paper', async () => {
        await open(localFlow);
        const [local, timestamp] = localFlow.model.cells;
        drag(port(timestamp.id, 'in-value'), port(local.id, 'out-sum'));

        const links = graphCells().filter((c) => c.type === 'link');
        expect(links.length).toEqual(2);
        expect(links[1].source).toEqual({ id: timestamp.id, magnet: 'portBody', port: 'in-value' });
        expect(links[1].target.id).toBeUndefined();
        expect(Number.isFinite(links[1].target.x) && Number.isFinite(links[1].target.y)).toBeTrue();
    });

    it('snaps a link dropped on an output to the nearest input of that node', async () => {
        await open(localFlow);
        const [local, timestamp] = localFlow.model.cells;
        drag(port(local.id, 'out-sum'), port(timestamp.id, 'out-timestamp'));

        const links = graphCells().filter((c) => c.type === 'link');
        expect(links.length).toEqual(2);
        expect(links[1].source).toEqual({ id: local.id, magnet: 'portBody', port: 'out-sum' });
        expect(links[1].target).toEqual({ id: timestamp.id, magnet: 'portBody', port: 'in-original_input_ids' });
    });

    it('removes a node with its X button', async () => {
        await open(localFlow);
        const [local, timestamp] = localFlow.model.cells;
        const button = cellNode(local.id).querySelector('[joint-selector="button"]')!;
        mouse('mousedown', button, center(button));
        mouse('mouseup', button, center(button));

        expect(graphCells().map((c) => c.id)).toEqual([timestamp.id]);
    });

    it('copies the node id with its Copy Id button', async () => {
        await open(localFlow);
        const copy = spyOn(TestBed.inject(Clipboard), 'copy');
        const [local] = localFlow.model.cells;
        const button = cellNode(local.id).querySelector('[joint-selector="button2"]')!;
        mouse('mousedown', button, center(button));
        mouse('mouseup', button, center(button));

        expect(copy).toHaveBeenCalledWith(local.id);
        expect(graphCells().length).toEqual(3);
    });

    it('removes a link with the remove tool shown on hover', async () => {
        await open(adderFlow);
        const links = graphCells().filter((c) => c.type === 'link');
        const link = cellNode(links[0].id);
        const path = link.querySelector('path')!;
        mouse('mouseover', path, center(path));
        const tool = document.querySelector(
            `.joint-cell[model-id="${links[0].id}"] .tool-remove, .joint-tool[model-id="${links[0].id}"][data-tool-name="remove"]`)!;
        expect(tool).not.toBeNull();
        const target = tool.querySelector('circle') || tool;
        mouse('mousedown', target, center(target));
        mouse('mouseup', target, center(target));

        expect(graphCells().filter((c) => c.type === 'link').map((c) => c.id)).toEqual([links[1].id]);
    });

    it('places added operators to the right of the existing content', async () => {
        await open(null);
        const operator = operatorsOf(localFlow)[0];
        component.addNode({ ...operator });
        component.addNode({ ...operator, deploymentType: 'cloud' });

        const nodes = graphCells();
        expect(nodes.length).toEqual(2);
        // an empty paper has an empty bounding box, whatever its size or grid
        expect(nodes[0].position).toEqual({ x: 100, y: 200 });
        expect(nodes[1].position.y).toEqual(200);
        expect(nodes[1].position.x).toBeGreaterThan(nodes[0].position.x + 250 + 100 - 1);
        expect(nodes[1].position.x).toBeLessThan(nodes[0].position.x + 250 + 100 + 120);
        expect(nodes.map((n) => [n.deploymentType, n.attrs.body.fill])).toEqual([['local', '#ddd'], ['cloud', '#4484ce']]);
        const saved = save();
        expect(saved.model.cells.map(asStoredByFlowRepo).map((c: any) => c.operatorId)).toEqual([operator._id, operator._id]);
    });

    it('zooms with the mouse wheel and pans the blank paper', async () => {
        await open(adderFlow);
        const editor = fixture.nativeElement.querySelector('senergy-diagram-editor') as HTMLElement;
        editor.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
        editor.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
        const scale = component.diagram.paperService.getScale();
        expect(scale.sx).toBeCloseTo(1.2, 10);
        expect(scale.sy).toBeCloseTo(1.2, 10);

        const paper = component.diagram.paperService.getPaper();
        const svg = paper.svg;
        const box = svg.getBoundingClientRect();
        const start = { x: box.left + 5, y: box.top + 5 };
        mouse('mousedown', svg, start);
        const local = paper.snapToGrid(start.x, start.y);
        const dragStart = component.diagram.dragStartPosition!;
        expect(dragStart.x).toBeCloseTo(local.x * 1.2, 6);
        expect(dragStart.y).toBeCloseTo(local.y * 1.2, 6);

        const move = new MouseEvent('mousemove', { clientX: start.x + 40, clientY: start.y + 30, bubbles: true });
        document.dispatchEvent(move);
        const translation = paper.translate();
        expect(translation.tx).toBeCloseTo(move.offsetX - dragStart.x, 3);
        expect(translation.ty).toBeCloseTo(move.offsetY - dragStart.y, 3);
        mouse('mouseup', svg, { x: start.x + 40, y: start.y + 30 });
        expect(component.diagram.dragStartPosition).toBeNull();
    });
});
