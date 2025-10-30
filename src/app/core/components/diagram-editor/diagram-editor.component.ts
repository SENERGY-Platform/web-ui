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

import { AfterViewInit, Component } from '@angular/core';
import { dia, shapes, util, Vectorizer } from 'jointjs';
import $ from 'jquery';
import { DiagramModel, LinkIOModel } from './shared/diagram.model';
import { IOModel } from '../../../modules/data/operator-repo/shared/operator.model';
import uuid = util.uuid;

@Component({
    selector: 'senergy-diagram-editor',
    templateUrl: './diagram-editor.component.html',
    styleUrls: ['./diagram-editor.component.css'],
})
export class DiagramEditorComponent implements AfterViewInit {
    private graph: any;

    private graphScale: Vectorizer.Scale = {sx: 1,sy: 1};

    idGenerated = uuid();

    NodeElement: any = dia.Element.define(
        'senergy.NodeElement',
        {
            inPorts: [],
            outPorts: [],
            name: '',
            image: '',
            operatorId: '',
            attrs: {
                '.': {
                    magnet: false,
                },
                header: {
                    refWidth: '100%',
                    refHeight: '20%',
                    strokeWidth: 2,
                    stroke: 'black',
                    fill: 'white',
                },
                body: {
                    refY: '20%',
                    refWidth: '100%',
                    refHeight: '80%',
                    strokeWidth: 2,
                    stroke: 'black',
                    fill: 'white',
                },
                headerlabel: {
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    refX: '50%',
                    refY: '10%',
                    fontSize: 10,
                    fill: 'black',
                },
                label: {
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    refX: '50%',
                    refY: '50%',
                    fontSize: 14,
                    fill: 'black',
                },
                button: {
                    cursor: 'pointer',
                    ref: 'buttonLabel',
                    refWidth: '150%',
                    refHeight: '150%',
                    refX: '-25%',
                    refY: '-25%',
                },
                buttonLabel: {
                    pointerEvents: 'none',
                    refX: '100%',
                    refY: 0,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                },
            },
            ports: {
                groups: {
                    in: {
                        position: {
                            name: 'left',
                        },
                        attrs: {
                            portLabel: {
                                fill: '#000',
                            },
                            portBody: {
                                fill: '#fff',
                                stroke: '#000',
                                r: 10,
                                magnet: true,
                            },
                        },
                        label: {
                            position: {
                                name: 'left',
                                args: {
                                    y: 10,
                                },
                            },
                        },
                    },
                    out: {
                        position: {
                            name: 'right',
                        },
                        attrs: {
                            portLabel: {
                                fill: '#000',
                            },
                            portBody: {
                                fill: '#fff',
                                stroke: '#000',
                                r: 10,
                                magnet: true,
                            },
                        },
                        label: {
                            position: {
                                name: 'right',
                                args: {
                                    y: 10,
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            markup: [
                {
                    tagName: 'rect',
                    selector: 'header',
                },
                {
                    tagName: 'rect',
                    selector: 'body',
                },
                {
                    tagName: 'text',
                    selector: 'headerlabel',
                },
                {
                    tagName: 'text',
                    selector: 'label',
                },
                {
                    tagName: 'rect',
                    selector: 'button',
                },
                {
                    tagName: 'text',
                    selector: 'buttonLabel',
                },
            ],
            portMarkup: [
                {
                    tagName: 'circle',
                    selector: 'portBody',
                },
            ],
            portLabelMarkup: [
                {
                    tagName: 'text',
                    selector: 'portLabel',
                },
            ],

            initialize() {
                // eslint-disable-next-line prefer-rest-params
                shapes.basic.Generic.prototype.initialize.apply(this, arguments as any);
                this.updatePortItems();
            },

            // model,changed
            updatePortItems() {
                // Make sure all ports are unique.
                const inPorts = util.uniq(this.get('inPorts'));
                const outPorts = util.uniq(this.get('outPorts'));

                const inPortItems = this.createPortItems('in', inPorts);
                const outPortItems = this.createPortItems('out', outPorts);

                this.prop('ports/items', inPortItems.concat(outPortItems));
            },

            createPortItem: (group: any, port: any) => ({
                id: group + '-' + port,
                group,
                attrs: {
                    portLabel: {
                        text: port
                    }
                }
            }),

            createPortItems(group: any, ports: any) {
                return util.toArray(ports).map(this.createPortItem.bind(this, group));
            },
        },
    );

    paperWidth = 500;
    paperHeight = 600;
    paper!: any;

    private linkAttrs = {'.marker-target': {d: 'M 10 0 L 0 5 L 10 10 z'}};

    private defaultLink = new dia.Link({
        attrs: this.linkAttrs,
    });

    public dragStartPosition: {x: number; y: number }  | null = null;

    constructor() {
    }

    ngAfterViewInit() {
        this.setPaperWidth(this.getPaperWidthFromWrap());
        this.reinitializePaper();
    }

    onResize() {
        this.paperWidth = this.getPaperWidthFromWrap();
        this.paper.setDimensions(this.paperWidth, this.paperHeight);
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
        this.paper = new dia.Paper({
            el: $('#' + this.idGenerated),
            model: this.graph,
            defaultLink: this.defaultLink,
            width: this.paperWidth,
            height: this.paperHeight,
            gridSize: 20,
            linkPinning: true,
            snapLinks: true,
            drawGrid: {name: 'mesh'},
            embeddingMode: false,
            validateConnection(sourceView, sourceMagnet, targetView, targetMagnet) {
                // Prevent linking from input ports.
                if (sourceMagnet && sourceMagnet.getAttribute('port-group') === 'in') {
                    return false;
                }
                if (sourceView === targetView) {
                    return false;
                }
                return targetMagnet && targetMagnet.getAttribute('port-group') === 'in';
            },
            markAvailable: true,

        });
        this.paper.on('blank:pointerdown', (_: any, x: number, y: number) => {
            this.dragStartPosition = { x: x* this.graphScale.sx, y: y* this.graphScale.sy};
        });
        this.paper.on('cell:pointerup blank:pointerup', () => {
            this.dragStartPosition = null;
        });
        this.paper.on('element:button:pointerdown', (elementView: any, evt: any) => {
            evt.stopPropagation(); // stop any further actions with the element view (e.g. dragging)
            const model = elementView.model;
            model.remove();
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

    prepareCloudNode(id: string | undefined = undefined, name: string, image: string, inputs: string[], outputs: string[], config: IOModel[], operatorId: string, position: Position | undefined = undefined){
        const node = this.newNode(id, name, image, inputs, outputs, config, operatorId, position);
        node.attributes.deploymentType = 'cloud';
        node.attr({
            body: {
                fill: '#4484ce',
            }
        });
        return node;
    }

    prepareLocalNode(id: string | undefined = undefined, name: string, image: string, inputs: string[], outputs: string[], config: IOModel[], operatorId: string, position: Position | undefined = undefined){
        const node = this.newNode(id, name, image, inputs, outputs, config, operatorId, position);
        node.attributes.deploymentType = 'local';
        node.attr({
            body: {
                fill: '#ddd',
            }
        });
        return node;
    }

    public newCloudNode(name: string,
                        image: string,
                        inputs: string[],
                        outputs: string[],
                        config: IOModel[],
                        operatorId: string,
                        position: Position | undefined = undefined): any {
        const node = this.prepareCloudNode(undefined, name, image, inputs, outputs, config, operatorId, position);
        this.graph.addCells([node]);
        this.graph.maxZIndex();
        return node;
    }

    public newLocalNode(name: string,
                        image: string,
                        inputs: string[],
                        outputs: string[],
                        config: IOModel[],
                        operatorId: string,
                        position: Position | undefined = undefined): any {
        const node = this.prepareLocalNode(undefined, name, image, inputs, outputs, config, operatorId, position);
        this.graph.addCells([node]);
        this.graph.maxZIndex();
        return node;
    }

    public newNode(id: string | undefined = undefined, name: string, image: string, inPorts: string[], outPorts: string[], config: any[], operatorId: string, position: Position | undefined = undefined): any {

        const size = this.calculateNodeSize(inPorts, outPorts);

        const node = new this.NodeElement({
            type: 'senergy.NodeElement',
            inPorts,
            outPorts,
            size,
            name,
            image,
            config,
            operatorId,
        });
        if (id !== undefined ){
            node.prop('id', id, { rewrite: true });
        }
        if (position === undefined){
            position = this.calculateNodePosition();
        }
        node.position(position.x, position.y);
        node.attr({
            label: {
                visibility: 'visible',
                text: name,
            },
            headerlabel: {
                text: operatorId,
            },
            body: {
                cursor: 'default',
                visibility: 'visible',
            },
            button: {
                event: 'element:button:pointerdown',
                fill: 'orange',
                stroke: 'black',
                strokeWidth: 2,
            },
            buttonLabel: {
                text: 'X', // fullwidth underscore
                fill: 'black',
                fontSize: 8,
                fontWeight: 'bold',
            },
        });
        return node;
    }

    calculateNodePosition(): Position {
        const box = (document.getElementsByClassName('joint-layers')[0] as any).getBBox();
        return  {x: box.x + box.width + 100, y: 200} as Position;
    }

    calculateNodeSize(inPorts: any[], outPorts: any[]) {
        const outCircleradius = 20;
        const heightBasedOnOut = outCircleradius * outPorts.length + 30;
        const heightBasedOnIn = outCircleradius * inPorts.length + 30;
        let height = heightBasedOnIn > heightBasedOnOut ? heightBasedOnIn : heightBasedOnOut;
        height = height > 100 ? height : 100;
        const size = {height, width: 150};
        return size;
    }

    private paperScale(sx: number, sy: number){
        this.paper.scale(sx,sy);
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
}

export interface Position {
    x: number;
    y: number;
}
