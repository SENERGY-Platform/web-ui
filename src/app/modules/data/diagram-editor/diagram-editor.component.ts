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

import { AfterViewInit, Component, EventEmitter, HostListener, OnDestroy, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import {dia, shapes, util, Vectorizer} from '@joint/core';
import {DiagramModel, LinkIOModel, NodeInfo, NodeLinkInfo, NodeVersionChange} from './shared/diagram.model';
import {IOModel} from '../operator-repo/shared/operator.model';
import {portNameFromItemId} from '../operator-repo/shared/operator-version';
import uuid = util.uuid;
import {MatSnackBar} from '@angular/material/snack-bar';
import {Clipboard} from '@angular/cdk/clipboard';
import {NodeElementDefinition} from './shared/node-element-definition';
import {LinkDefinition} from './shared/link-definition';
import {PaperService} from './shared/paper.service';
import {NodeFactory, NodePosition} from './shared/node-factory.service';
import { snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-diagram-editor',
    templateUrl: './diagram-editor.component.html',
    styleUrls: ['./diagram-editor.component.css'],
    providers: [PaperService],
    changeDetection: ChangeDetectionStrategy.Eager
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
    snackBar = inject(MatSnackBar);
    private readonly clipboard = inject(Clipboard);
    paperService = inject(PaperService);
    nodeFactory = inject(NodeFactory);

    private graph: any;
    private graphScale: Vectorizer.Scale = {sx: 1, sy: 1};
    idGenerated = uuid();
    NodeElement: any = NodeElementDefinition;
    paperWidth = 500;
    paperHeight = 600;

    /** A double click on a node or a click on its Version button. */
    @Output() nodeDoubleClick = new EventEmitter<string>();

    /** Fires for every edit of the graph: nodes and links added, removed or changed. */
    @Output() graphChange = new EventEmitter<void>();
    private resizeObserver?: ResizeObserver;

    public dragStartPosition: { x: number; y: number } | null = null;

    ngAfterViewInit() {
        this.setPaperWidth(this.getPaperWidthFromWrap());
        this.paperHeight = this.getPaperHeightFromWrap();
        this.reinitializePaper();
        // The wrapper follows its host, which may be hidden or resized without a window resize.
        const wrap = document.getElementById('paper-wrap');
        if (wrap !== null && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.onResize());
            this.resizeObserver.observe(wrap);
        }
    }

    onResize() {
        const width = this.getPaperWidthFromWrap();
        const height = this.getPaperHeightFromWrap();
        if (width === this.paperWidth && height === this.paperHeight) {
            return;
        }
        this.paperWidth = width;
        this.paperHeight = height;
        this.paperService.setDimensions(this.paperWidth, this.paperHeight);
    }

    setPaperWidth(paperWidth: number) {
        this.paperWidth = paperWidth;
    }

    private getPaperWidthFromWrap() {
        const paperWrap = document.getElementById('paper-wrap');
        if (paperWrap !== null) {
            return paperWrap.offsetWidth;
        }
        return this.paperWidth;
    }

    /** The wrapper's own height when the host gives it one, else the last height. */
    private getPaperHeightFromWrap() {
        const paperWrap = document.getElementById('paper-wrap');
        if (paperWrap !== null && paperWrap.clientHeight > 0) {
            return paperWrap.clientHeight;
        }
        return this.paperHeight;
    }

    reinitializePaper() {
        const {standard} = shapes;
        this.graph = new dia.Graph(
            {},
            {
                cellNamespace: {
                    standard,
                    link: LinkDefinition,
                    senergy: {NodeElement: this.NodeElement},
                },
            },
        );
        this.paperService.initialize(this.idGenerated, this.paperWidth, this.paperHeight, this.graph);
        this.watchGraph();

        this.paperService.getPaper().on('blank:pointerdown', (_: any, x: number, y: number) => {
            this.dragStartPosition = {x: x * this.graphScale.sx, y: y * this.graphScale.sy};
        });
        this.paperService.getPaper().on('cell:pointerup blank:pointerup', () => {
            this.dragStartPosition = null;
        });
        this.paperService.getPaper().on('element:button:pointerdown', (elementView: any, evt: any) => {
            evt.stopPropagation(); // stop any further actions with the element view (e.g. dragging)
            const model = elementView.model;
            model.remove();
        });
        this.paperService.getPaper().on('element:button2:pointerdown', (elementView: any, evt: any) => {
            evt.stopPropagation(); // stop any further actions with the element view (e.g. dragging)
            const model = elementView.model;
            this.clipboard.copy(model.id);
            snackSuccess(this.snackBar, 'Copied to clipboard');
        });
        this.paperService.getPaper().on('element:button3:pointerdown', (elementView: any, evt: any) => {
            evt.stopPropagation();
            this.nodeDoubleClick.emit(elementView.model.id);
        });
        this.paperService.getPaper().on('element:pointerdblclick', (elementView: any, evt: any) => {
            // The delete and copy buttons and the ports react to clicks themselves.
            if ((evt?.target as Element | undefined)?.closest?.('[event], [magnet="true"], [port]')) {
                return;
            }
            this.nodeDoubleClick.emit(elementView.model.id);
        });
    }

    private watchGraph() {
        this.graph.on('add remove', () => this.graphChange.emit());
        this.graph.on('change', (cell: dia.Cell) => {
            // Stacking order alone is no edit.
            if (!Object.keys(cell.changed).every(key => key === 'z')) {
                this.graphChange.emit();
            }
        });
    }

    public prepareLink(source: LinkIOModel, target: LinkIOModel) {
        const link: dia.Link = new LinkDefinition();
        link.source({id: source.id, port: source.port});
        link.target({id: target.id, port: target.port});
        return link;
    }

    public addElementsToGraph(elements: any[]) {
        this.graph.addCells(elements);
        this.graph.maxZIndex();
    }

    createNode(type: 'cloud' | 'local' | '',
               name: string,
               image: string,
               inputs: string[],
               outputs: string[],
               config: IOModel[] | undefined,
               operatorId: string,
               version: number | undefined = undefined,
               position: NodePosition | undefined = undefined,
               id: string | undefined = undefined,
               operatorVersion: string | undefined = undefined,
               newerVersion: string | undefined = undefined
    ) {
        if (position === undefined) {
            position = this.calculateNodePosition();
        }
        const node = this.nodeFactory.createNode({
            id: id,
            name: name,
            image: image,
            inputs: inputs,
            outputs: outputs,
            config: config,
            operatorId: operatorId,
            position: position,
            deploymentType: type,
            version: version,
            operatorVersion: operatorVersion,
            newerVersion: newerVersion,
        });
        return node;
    }

    addNode(type: 'cloud' | 'local' | '',
            name: string,
            image: string,
            inputs: string[],
            outputs: string[],
            config: IOModel[] | undefined,
            operatorId: string,
            version: number | undefined = undefined,
            position: NodePosition | undefined = undefined,
            id: string | undefined = undefined,
            operatorVersion: string | undefined = undefined,
            newerVersion: string | undefined = undefined
    ) {
        const node = this.createNode(
            type, name, image, inputs, outputs, config, operatorId, version, position, id, operatorVersion, newerVersion);
        this.graph.addCells([node]);
        this.graph.maxZIndex();
    }

    public getNodeInfo(id: string): NodeInfo | undefined {
        const node = this.graph.getCell(id);
        if (node === undefined || node.get('type') !== 'senergy.NodeElement') {
            return undefined;
        }
        const links: NodeLinkInfo[] = [];
        for (const link of this.graph.getConnectedLinks(node)) {
            const source = link.source();
            const target = link.target();
            const outgoing = source.id === node.id;
            const end = outgoing ? source : target;
            const peerId = outgoing ? target.id : source.id;
            if (end.port === undefined) {
                continue;
            }
            links.push({
                id: link.id,
                direction: outgoing ? 'out' : 'in',
                port: portNameFromItemId(end.port),
                peerName: peerId === undefined ? '' : this.graph.getCell(peerId)?.get('name') ?? '',
            });
        }
        return {
            operatorId: node.get('operatorId'),
            name: node.get('name'),
            image: node.get('image'),
            operatorVersion: node.get('operatorVersion') || undefined,
            inPorts: node.get('inPorts') ?? [],
            outPorts: node.get('outPorts') ?? [],
            config: node.get('config'),
            links,
        };
    }

    /**
     * Applies a version choice to a node: removes the links that lost their port, then replaces ports and config.
     */
    public applyNodeVersion(id: string, change: NodeVersionChange) {
        const node = this.graph.getCell(id);
        if (node === undefined) {
            return;
        }
        for (const linkId of change.removeLinkIds) {
            this.graph.getCell(linkId)?.remove();
        }
        this.nodeFactory.applyVersionChange(node, change);
    }

    calculateNodePosition(): NodePosition {
        // the cells layer only: in @joint/core the layers group also holds the grid
        const box = (document.getElementsByClassName('joint-cells-layer')[0] as any).getBBox();
        return {x: box.x + box.width + 100, y: 200};
    }

    private paperScale(sx: number, sy: number) {
        this.paperService.scale(sx, sy);
    }

    public getGraph(): DiagramModel {
        return this.graph.toJSON();
    }

    public zoomOut() {
        this.graphScale.sx -= 0.1;
        this.graphScale.sy -= 0.1;
        this.paperScale(this.graphScale.sx, this.graphScale.sy);
    }

    public zoomIn() {
        this.graphScale.sx += 0.1;
        this.graphScale.sy += 0.1;
        this.paperScale(this.graphScale.sx, this.graphScale.sy);
    }

    public resetZoom() {
        this.graphScale.sx = 1;
        this.graphScale.sy = 1;
        this.paperScale(this.graphScale.sx, this.graphScale.sy);
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.paperService.destroy();
    }

    @HostListener('wheel', ['$event'])
    Wheel(event: WheelEvent) {
        event.preventDefault();
        if (event.deltaY > 0) {
            this.zoomOut();
        }
        if (event.deltaY < 0) {
            this.zoomIn();
        }
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        if (this.dragStartPosition != null) {
            this.paperService.getPaper().translate(
                e.offsetX - this.dragStartPosition.x,
                e.offsetY - this.dragStartPosition.y);
        }
    }
}
