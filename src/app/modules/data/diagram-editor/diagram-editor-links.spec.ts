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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { dia } from '@joint/core';

import { DiagramEditorComponent } from './diagram-editor.component';

const SOURCE = 'b0000000-0000-4000-8000-000000000001';
const TARGET = 'b0000000-0000-4000-8000-000000000002';

function center(el: Element): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function mouse(type: string, target: EventTarget, at: { x: number; y: number }) {
    target.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window, clientX: at.x, clientY: at.y, button: 0, buttons: type === 'mouseup' ? 0 : 1,
    }));
}

/** The link tools JointJS 3 drew for a hovered link, now added by the paper service. */
describe('DiagramEditorComponent links', () => {
    let fixture: ComponentFixture<DiagramEditorComponent>;
    let editor: DiagramEditorComponent;
    let paper: dia.Paper;
    let link: dia.Link;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatSnackBarModule, DiagramEditorComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DiagramEditorComponent);
        editor = fixture.componentInstance;
        fixture.detectChanges();
        editor.onResize();
        paper = editor.paperService.getPaper();
        editor.addElementsToGraph([
            editor.createNode('cloud', 'source', 'image', [], ['out'], undefined, 'op-1', 1, { x: 40, y: 100 }, SOURCE),
            editor.createNode('cloud', 'sink', 'image', ['a', 'b'], [], undefined, 'op-2', 1, { x: 440, y: 100 }, TARGET),
        ]);
        link = editor.prepareLink({ id: SOURCE, port: 'out-out', magnet: '' }, { id: TARGET, port: 'in-a', magnet: '' });
        editor.addElementsToGraph([link]);
    });

    afterEach(() => fixture.destroy());

    const linkNode = () => paper.findViewByModel(link).el;
    const wrapper = () => linkNode().querySelector('.connection-wrap')!;
    const tool = (name: string) => linkNode().querySelector(`.joint-tool[data-tool-name="${name}"]`);
    const at = (local: { x: number; y: number }) => paper.localToClientPoint(local.x, local.y);

    /** Moves the pointer the way a browser reports it: mouseover on whatever is under the pointer, then mousemove. */
    function moveTo(point: { x: number; y: number }) {
        const under = document.elementFromPoint(point.x, point.y) || document.body;
        mouse('mouseover', under, point);
        mouse('mousemove', under, point);
    }

    function release(point: { x: number; y: number }) {
        mouse('mouseup', document.elementFromPoint(point.x, point.y) || document.body, point);
    }

    /** The paper still reacts: the X button of the source node removes it. */
    function expectPaperResponsive() {
        expect(paper.model.hasActiveBatch()).withContext('active batch').toBeFalse();
        const button = paper.findViewByModel(SOURCE).el.querySelector('[joint-selector="button"]')!;
        mouse('mousedown', button, center(button));
        mouse('mouseup', button, center(button));
        expect(editor.getGraph().cells.map((c) => c.id)).toEqual([TARGET]);
    }

    it('offers the tools on a hovered link and keeps them hidden by the stylesheet otherwise', () => {
        expect(tool('remove')).toBeNull();
        mouse('mouseover', wrapper(), center(wrapper()));
        for (const name of ['remove', 'vertices', 'source-arrowhead', 'target-arrowhead']) {
            expect(tool(name)).withContext(name).not.toBeNull();
        }
        expect(tool('remove')!.querySelector('circle')!.getAttribute('fill')).toEqual('#FF0000');

        // as in JointJS 3 the tools stay in the link and only CSS :hover shows them
        mouse('mouseover', paper.svg, { x: 1, y: 1 });
        const tools = linkNode().querySelector('.joint-tools')!;
        expect(tools).not.toBeNull();
        expect(getComputedStyle(tools).opacity).toEqual('0');
    });

    it('gives the link body a wide hover strip in the editor', () => {
        const style = getComputedStyle(wrapper());
        expect(style.strokeWidth).toEqual('15px');
        expect(style.opacity).toEqual('0');
        expect(style.fill).toEqual('none');
    });

    it('reconnects by the target arrowhead while the pointer crosses blank paper', () => {
        mouse('mouseover', wrapper(), center(wrapper()));
        const arrowhead = tool('target-arrowhead')!;
        const port = paper.findViewByModel(TARGET).el.querySelector('[port="in-b"][magnet]')!;
        mouse('mousedown', arrowhead, center(arrowhead));
        moveTo(at({ x: 300, y: 320 }));
        moveTo(at({ x: 320, y: 340 }));
        moveTo(center(port));
        release(center(port));

        expect(link.target()).toEqual({ id: TARGET, magnet: 'portBody', port: 'in-b' });
        expectPaperResponsive();
    });

    it('moves a new vertex while the pointer runs ahead of the link', () => {
        const start = center(wrapper());
        mouse('mouseover', wrapper(), start);
        mouse('mousedown', wrapper(), start);
        moveTo({ x: start.x + 40, y: start.y + 120 });
        const end = { x: start.x + 60, y: start.y + 160 };
        moveTo(end);
        release(end);

        expect(link.vertices()).toEqual([paper.snapToGrid(end.x, end.y).toJSON()]);
        expectPaperResponsive();
    });

    it('finishes an arrowhead drag that leaves the paper and comes back', () => {
        mouse('mouseover', wrapper(), center(wrapper()));
        const arrowhead = tool('target-arrowhead')!;
        const port = paper.findViewByModel(TARGET).el.querySelector('[port="in-b"][magnet]')!;
        mouse('mousedown', arrowhead, center(arrowhead));
        moveTo(at({ x: 300, y: 320 }));
        const outside = { x: paper.el.getBoundingClientRect().right + 40, y: center(port).y };
        paper.el.dispatchEvent(new MouseEvent('mouseleave', { clientX: outside.x, clientY: outside.y, relatedTarget: document.body }));
        moveTo(outside);
        moveTo(center(port));
        release(center(port));

        expect(link.target()).toEqual({ id: TARGET, magnet: 'portBody', port: 'in-b' });
        expectPaperResponsive();
    });

    it('adds a vertex where the link body is dragged and removes it with its button', () => {
        const start = center(wrapper());
        mouse('mouseover', wrapper(), start);
        mouse('mousedown', wrapper(), start);
        const end = { x: start.x + 13, y: start.y + 87 };
        mouse('mousemove', document, end);
        mouse('mouseup', document, end);

        expect(link.vertices()).toEqual([paper.snapToGrid(end.x, end.y).toJSON()]);
        expect(link.source()).toEqual({ id: SOURCE, port: 'out-out' });
        expect(link.target()).toEqual({ id: TARGET, port: 'in-a' });

        const remove = linkNode().querySelector('.marker-vertex-remove')!;
        mouse('mousedown', remove, center(remove));
        mouse('mouseup', remove, center(remove));
        expect(link.vertices()).toEqual([]);
    });

    it('reconnects the link by dragging its target arrowhead to another input', () => {
        mouse('mouseover', wrapper(), center(wrapper()));
        const arrowhead = tool('target-arrowhead')!;
        const port = paper.findViewByModel(TARGET).el.querySelector('[port="in-b"][magnet]')!;
        mouse('mousedown', arrowhead, center(arrowhead));
        mouse('mousemove', document, at({ x: 300, y: 300 }));
        mouse('mousemove', document, center(port));
        mouse('mouseup', document, center(port));

        expect(link.target()).toEqual({ id: TARGET, magnet: 'portBody', port: 'in-b' });
    });

    it('removes the link with its remove tool', () => {
        mouse('mouseover', wrapper(), center(wrapper()));
        const button = tool('remove')!.querySelector('circle')!;
        mouse('mousedown', button, center(button));
        mouse('mouseup', button, center(button));

        expect(editor.getGraph().cells.map((c) => c.id)).toEqual([SOURCE, TARGET]);
    });

    it('draws the link with a filled arrow at the target end', () => {
        const node = linkNode();
        expect(node.getAttribute('data-type')).toEqual('link');
        const line = node.querySelector('path.connection')!;
        const marker = node.querySelector('path.marker-target')!;
        expect(line.getAttribute('stroke')).toEqual('black');
        expect(marker.getAttribute('fill')).toEqual('black');
        const toLocal = (el: Element, x: number, y: number) => new DOMPoint(x, y)
            .matrixTransform((el as SVGGraphicsElement).getCTM()!)
            .matrixTransform((paper.layers as SVGGraphicsElement).getCTM()!.inverse());
        const path = line as SVGPathElement;
        const source = toLocal(path, path.getPointAtLength(0).x, path.getPointAtLength(0).y);
        const end = toLocal(path, path.getPointAtLength(path.getTotalLength()).x, path.getPointAtLength(path.getTotalLength()).y);
        const outline = marker as SVGPathElement;
        const points = Array.from({ length: 41 }, (_, i) => {
            const p = outline.getPointAtLength(outline.getTotalLength() * i / 40);
            return toLocal(outline, p.x, p.y);
        });
        const distance = (a: DOMPoint, b: DOMPoint) => Math.hypot(a.x - b.x, a.y - b.y);
        // the tip is the marker point farthest along the link, and it sits on the link end
        const tip = points.reduce((best, p) => (distance(p, source) > distance(best, source) ? p : best));
        expect(distance(tip, end)).toBeLessThan(0.5);
        expect(Math.max(...points.map((p) => distance(p, end)))).toBeCloseTo(Math.hypot(10, 5), 0);
    });
});
