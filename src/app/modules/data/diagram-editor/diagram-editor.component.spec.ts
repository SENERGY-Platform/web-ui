/*
 * Copyright 2020 InfAI (CC SES)
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

import { DiagramEditorComponent } from './diagram-editor.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DiagramEditorComponent', () => {
    let component: DiagramEditorComponent;
    let fixture: ComponentFixture<DiagramEditorComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [DiagramEditorComponent],
                schemas: [NO_ERRORS_SCHEMA],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(DiagramEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('operator versions', () => {
        const text = 'https://schema.org/Text';
        const io = (...names: string[]) => names.map(name => ({name, type: text}));

        function add(id: string, inputs: string[], outputs: string[], operatorVersion?: string, newerVersion?: string) {
            component.addNode('cloud', 'op ' + id, 'img', inputs, outputs, io('c'), 'op-id', 3,
                {x: 100, y: 100}, id, operatorVersion, newerVersion);
        }

        function cells(): any[] {
            return component.getGraph().cells as any[];
        }

        it('keeps the pin of a pinned node in the graph', () => {
            add('n1', ['a'], ['o'], 'v1.0.0');
            expect(cells()[0].operatorVersion).toBe('v1.0.0');
        });

        it('leaves the key out for an unpinned node', () => {
            add('n1', ['a'], ['o']);
            add('n2', ['a'], ['o'], '');
            for (const cell of cells()) {
                expect('operatorVersion' in cell).toBeFalse();
            }
        });

        it('shows the pin on the node and names the newer version in its tooltip', () => {
            add('n1', ['a'], ['o'], 'v1.0.0', 'v1.2.0');
            add('n2', ['a'], ['o'], 'v1.2.0');
            const label = (id: string) => ((component as any).graph.getCell(id)).findView(component.paperService.getPaper())
                .el.querySelector('[joint-selector="versionlabel"]') as SVGElement;
            const shownText = (element: SVGElement) => {
                const copy = element.cloneNode(true) as SVGElement;
                copy.querySelector('title')?.remove();
                // JointJS renders spaces as no-break spaces
                return copy.textContent?.replace(/\u00a0/g, ' ');
            };

            expect(shownText(label('n1'))).toBe('v1.0.0 - update available');
            expect(label('n1').querySelector('title')?.textContent).toContain('v1.2.0');
            expect(shownText(label('n2'))).toBe('v1.2.0');
        });

        it('emits the id of a double-clicked node', () => {
            add('n1', ['a'], ['o']);
            const emitted: string[] = [];
            component.nodeDoubleClick.subscribe((id: string) => emitted.push(id));
            const node = (component as any).graph.getCell('n1');
            component.paperService.getPaper().trigger('element:pointerdblclick', node.findView(component.paperService.getPaper()));
            expect(emitted).toEqual(['n1']);
        });

        it('shows a Version button on a node that emits the same event as the double click', () => {
            add('n1', ['a'], ['o']);
            const emitted: string[] = [];
            component.nodeDoubleClick.subscribe((id: string) => emitted.push(id));
            const paper = component.paperService.getPaper();
            const view = (component as any).graph.getCell('n1').findView(paper);
            const label = view.el.querySelector('[joint-selector="buttonLabel3"]') as SVGElement;
            const button = view.el.querySelector('[joint-selector="button3"]') as SVGElement;
            expect(label.textContent).toBe('Version');
            expect(button.getAttribute('event')).toBe('element:button3:pointerdown');

            let stopped = false;
            paper.trigger('element:button3:pointerdown', view, {stopPropagation: () => (stopped = true)});
            expect(emitted).toEqual(['n1']);
            expect(stopped).toBeTrue();
        });

        it('does not open the version dialog twice for a double click on the Version button', () => {
            add('n1', ['a'], ['o']);
            const emitted: string[] = [];
            component.nodeDoubleClick.subscribe((id: string) => emitted.push(id));
            const paper = component.paperService.getPaper();
            const view = (component as any).graph.getCell('n1').findView(paper);
            paper.trigger('element:pointerdblclick', view, {target: view.el.querySelector('[joint-selector="button3"]')});
            expect(emitted).toEqual([]);
        });

        it('ignores a double click on a button or a port of the node', () => {
            add('n1', ['a'], ['o']);
            const emitted: string[] = [];
            component.nodeDoubleClick.subscribe((id: string) => emitted.push(id));
            const paper = component.paperService.getPaper();
            const view = (component as any).graph.getCell('n1').findView(paper);
            const part = (selector: string) => view.el.querySelector(`[joint-selector="${selector}"]`);

            paper.trigger('element:pointerdblclick', view, {target: part('button')});
            paper.trigger('element:pointerdblclick', view, {target: part('portBody')});
            expect(emitted).toEqual([]);

            paper.trigger('element:pointerdblclick', view, {target: part('body')});
            expect(emitted).toEqual(['n1']);
        });

        it('reports empty ports for a node loaded without any', () => {
            component.addNode('cloud', 'sink', 'img', undefined as any, undefined as any, undefined, 'op-id', 3, {x: 0, y: 0}, 'n1');
            const info = component.getNodeInfo('n1');
            expect(info?.inPorts).toEqual([]);
            expect(info?.outPorts).toEqual([]);
        });

        it('reports the links of a node by port name and direction', () => {
            add('n1', ['a'], ['o']);
            add('n2', ['a', 'b'], ['o']);
            (component as any).graph.addCell(component.prepareLink({id: 'n1', magnet: '', port: 'out-o'}, {id: 'n2', magnet: '', port: 'in-b'}));
            const info = component.getNodeInfo('n2');
            expect(info?.links.length).toBe(1);
            expect(info?.links[0]).toEqual(jasmine.objectContaining({direction: 'in', port: 'b', peerName: 'op n1'}));
            expect(component.getNodeInfo('n1')?.links[0]).toEqual(jasmine.objectContaining({direction: 'out', port: 'o', peerName: 'op n2'}));
        });

        it('pins a node, replaces its ports and config and removes the listed links', () => {
            add('n1', ['a'], ['o']);
            add('n2', ['a', 'b'], ['o', 'p']);
            const link = component.prepareLink({id: 'n1', magnet: '', port: 'out-o'}, {id: 'n2', magnet: '', port: 'in-b'});
            (component as any).graph.addCell(link);

            component.applyNodeVersion('n2', {
                operatorVersion: 'v1.0.0',
                newerVersion: 'v1.2.0',
                version: 4,
                image: 'img:v1.0.0',
                inPorts: ['a'],
                outPorts: ['o'],
                config: io('d'),
                removeLinkIds: [link.id as string],
            });

            const node = cells().find(cell => cell.id === 'n2');
            expect(node.operatorVersion).toBe('v1.0.0');
            expect(node.inPorts).toEqual(['a']);
            expect(node.outPorts).toEqual(['o']);
            expect(node.config).toEqual(io('d'));
            expect(node.image).toBe('img:v1.0.0');
            expect(node.version).toBe(4);
            expect(node.ports.items.map((item: any) => item.id)).toEqual(['in-a', 'out-o']);
            expect(cells().filter(cell => cell.type === 'link').length).toBe(0);
        });

        it('drops the key again when the pin is cleared', () => {
            add('n1', ['a'], ['o'], 'v1.0.0');
            component.applyNodeVersion('n1', {
                operatorVersion: undefined, image: 'img', inPorts: ['a'], outPorts: ['o'], config: [], removeLinkIds: [],
            });
            expect('operatorVersion' in cells()[0]).toBeFalse();
        });
    });
});
