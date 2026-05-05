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

import {AfterViewInit, Component, HostListener, OnDestroy} from '@angular/core';
import { dia, shapes, util, Vectorizer } from 'jointjs';
import { DiagramModel, LinkIOModel } from './shared/diagram.model';
import { IOModel } from '../operator-repo/shared/operator.model';
import uuid = util.uuid;
import {MatSnackBar} from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import {NodeElementDefinition} from './shared/node-element-definition';
import {PaperService} from './shared/paper.service';
import {NodeFactory, NodePosition} from './shared/node-factory.service';
import MouseMoveEvent = JQuery.MouseMoveEvent;

@Component({
    selector: 'senergy-diagram-editor',
    templateUrl: './diagram-editor.component.html',
    styleUrls: ['./diagram-editor.component.css'],
    providers: [PaperService]
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
    private graph: any;
    private graphScale: Vectorizer.Scale = {sx: 1,sy: 1};
    idGenerated = uuid();
    NodeElement: any = NodeElementDefinition;
    paperWidth = 500;
    paperHeight = 600;

    private linkAttrs = {'.marker-target': {d: 'M 10 0 L 0 5 L 10 10 z'}};

    private defaultLink = new dia.Link({
        attrs: this.linkAttrs,
    });

    public dragStartPosition: {x: number; y: number }  | null = null;

    constructor(
        public snackBar: MatSnackBar,
        private clipboard: Clipboard,
        public paperService: PaperService,
        public nodeFactory: NodeFactory
    ) {}

    ngAfterViewInit() {
        this.setPaperWidth(this.getPaperWidthFromWrap());
        this.reinitializePaper();
    }

    onResize() {
        this.paperWidth = this.getPaperWidthFromWrap();
        this.paperService.setDimensions(this.paperWidth, this.paperHeight);
    }

    setPaperWidth(paperWidth: number) {
        this.paperWidth = paperWidth;
    }

    private getPaperWidthFromWrap(){
        const paperWrap = document.getElementById('paper-wrap');
        if (paperWrap !== null) {
            return paperWrap.offsetWidth;
        }
        return this.paperWidth;
    }

    reinitializePaper() {
        const {standard, devs} = shapes;
        this.graph = new dia.Graph(
            {},
            {
                cellNamespace: {
                    standard,
                    devs,
                    senergy: {NodeElement: this.NodeElement},
                },
            },
        );
        this.paperService.initialize(this.idGenerated, this.paperWidth, this.paperHeight, this.graph);

        this.paperService.getPaper().on('blank:pointerdown', (_: any, x: number, y: number) => {
            this.dragStartPosition = { x: x* this.graphScale.sx, y: y* this.graphScale.sy};
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
            this.snackBar.open('Copied to clipboard', undefined, {
                duration: 2000,
            });
        });
    }

    public prepareLink(source: LinkIOModel, target: LinkIOModel){
        const link = new dia.Link({
            attrs: this.linkAttrs,
        });
        link.source({id: source.id, port: source.port});
        link.target({id: target.id, port: target.port});
        return link;
    }

    public addElementsToGraph(elements: any[]){
        this.graph.addCells(elements);
        this.graph.maxZIndex();
    }

    createNode(type:'cloud' | 'local' | '',
            name: string,
            image: string,
            inputs: string[],
            outputs: string[],
            config: IOModel[],
            operatorId: string,
            position: NodePosition | undefined = undefined,
            id: string | undefined = undefined
    ){
        if (position === undefined){
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
        });
        return node;
    }

    addNode(type:'cloud' | 'local' | '',
            name: string,
            image: string,
            inputs: string[],
            outputs: string[],
            config: IOModel[],
            operatorId: string,
            position: NodePosition | undefined = undefined,
            id: string | undefined = undefined
    ){
        const node = this.createNode(type, name, image, inputs, outputs, config, operatorId, position, id);
        this.graph.addCells([node]);
        this.graph.maxZIndex();
    }

    calculateNodePosition(): NodePosition {
        const box = (document.getElementsByClassName('joint-layers')[0] as any).getBBox();
        return  {x: box.x + box.width + 100, y: 200} as NodePosition;
    }

    private paperScale(sx: number, sy: number){
        this.paperService.scale(sx,sy);
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
        this.paperService.destroy();
    }

    @HostListener('wheel', ['$event'])
    Wheel(event: WheelEvent) {
        if((event.target as HTMLInputElement).nodeName === 'svg'){
            event.preventDefault();
            if (event.deltaY > 0) {
                this.zoomOut();
            }
            if (event.deltaY < 0) {
                this.zoomIn();
            }
        }
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseMoveEvent) {
        if (this.dragStartPosition != null) {
            this.paperService.getPaper().translate(
                e.offsetX - this.dragStartPosition.x,
                e.offsetY - this.dragStartPosition.y);
        }
    }
}
