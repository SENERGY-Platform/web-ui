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

import {OnInit, Component, AfterViewInit, ViewChild, HostListener} from '@angular/core';
import {IOModel, OperatorModel} from '../operator-repo/shared/operator.model';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';
import { ActivatedRoute } from '@angular/router';
import { OperatorRepoService } from '../operator-repo/shared/operator-repo.service';
import { FlowModel } from '../flow-repo/shared/flow.model';
import { DiagramEditorComponent } from '../../../core/components/diagram-editor/diagram-editor.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import MouseMoveEvent = JQuery.MouseMoveEvent;

@Component({
    selector: 'senergy-flow-designer',
    templateUrl: './flow-designer.component.html',
    styleUrls: ['./flow-designer.component.css'],
})
export class FlowDesignerComponent implements OnInit, AfterViewInit {

    @ViewChild(DiagramEditorComponent, { static: false }) diagram!: DiagramEditorComponent;

    operators: OperatorModel[] = [];
    ready = false;
    flow = {} as FlowModel;
    listHeight = 600;

    constructor(
        private route: ActivatedRoute,
        private operatorRepoService: OperatorRepoService,
        private flowRepoService: FlowRepoService,
        public snackBar: MatSnackBar
    ) {}


    ngOnInit() {
        this.operatorRepoService.getOperators('', 9999, 0, 'name', 'asc').subscribe((resp: { operators: OperatorModel[] }) => {
            this.operators = resp.operators;
        });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            const id = this.route.snapshot.paramMap.get('id');
            if (id !== null) {
                this.flowRepoService.getFlow(id).subscribe((resp: FlowModel | null) => {
                    if (resp !== null) {
                        this.flow = resp;
                        const elements = [];
                        for (const cell of this.flow.model.cells) {
                            if (cell.type === 'link') {
                                elements.push(this.diagram.prepareLink(cell.source, cell.target));
                            } else if (cell.type === 'senergy.NodeElement'){
                                if (cell.deploymentType === 'local') {
                                    elements.push(this.diagram.prepareLocalNode(
                                        cell.id,
                                        cell.name,
                                        cell.image,
                                        cell.inPorts,
                                        cell.outPorts,
                                        cell.config,
                                        cell.operatorId,
                                        cell.position
                                    ));
                                } else {
                                    elements.push(this.diagram.prepareCloudNode(
                                        cell.id,
                                        cell.name,
                                        cell.image,
                                        cell.inPorts,
                                        cell.outPorts,
                                        cell.config,
                                        cell.operatorId,
                                        cell.position
                                    ));
                                }
                            }
                        }
                        this.diagram.addElementsToGraph(elements);
                    }
                });
            }
            this.ready = true;
        }, 500);
        this.listHeight = this.diagram.paperHeight;
    }


    public addNode(operator: OperatorModel) {
        if (
            operator.name !== undefined &&
            operator.inputs !== undefined &&
            operator.outputs !== undefined &&
            operator.image !== undefined &&
            operator.config_values !== undefined &&
            operator._id !== undefined
        ) {
            switch (operator.deploymentType) {
            case 'local':
                this.diagram.newLocalNode(
                    operator.name,
                    operator.image,
                    this.getPortNames(operator.inputs),
                    this.getPortNames(operator.outputs),
                    operator.config_values,
                    operator._id,
                );
                break;
            default:
                this.diagram.newCloudNode(
                    operator.name,
                    operator.image,
                    this.getPortNames(operator.inputs),
                    this.getPortNames(operator.outputs),
                    operator.config_values,
                    operator._id,
                );
                break;
            }
        }
    }

    private getPortNames(inputs: IOModel[]): string[]{
        const ports = [];
        if (inputs !== undefined) {
            for (const input of inputs) {
                if (input.name !== undefined) {
                    ports.push(input.name);
                }
            }
        }
        return ports;
    }

    public saveModel() {
        const svg = this.diagram.paper.svg.cloneNode(true) as SVGElement;
        this.flow.image = this.createSVGFromModel(svg);
        this.flow.model = this.diagram.getGraph();
        const flow = Object.assign({}, this.flow);
        this.flowRepoService.saveFlow(flow).subscribe(resp => {
            if (resp != null) {
                if (resp.status == 200){
                    this.snackBar.open('Flow saved', undefined, {
                        duration: 2000,
                    });
                }
            }
        });
    }

    createSVGFromModel(svg: SVGElement): string {
        let source = '';
        const serializer = new XMLSerializer();

        // Get minimal coordinates to include everything + some space at the sides
        const box = (document.getElementsByClassName('joint-layers')[0] as any).getBBox();
        const viewbox = [box.x -10, box.y, box.width + 20, box.height];

        const tags = ['text', 'g', 'circle', 'rect', 'tspan', 'path'];
        const classes = [
            'link-tools',
            'marker-vertices',
            'marker-arrowhead',
            'marker-arrowhead-group-target',
            'marker-arrowhead-group',
            'marker-arrowheads',
        ];
        this.removeSVGNodesByClassNames(svg, tags, classes);
        this.removeSVGAttributesByTagNames(svg, tags);
        source = serializer.serializeToString(svg);
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(
                /^<svg/,
                '<svg xmlns="http://www.w3.org/2000/svg" viewbox="' +
                    viewbox[0] +
                    ' ' +
                    viewbox[1] +
                    ' ' +
                    viewbox[2] +
                    ' ' +
                    viewbox[3] +
                    '"',
            );
        } else {
            source = source.replace(
                /^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/,
                '<svg xmlns="http://www.w3.org/2000/svg" viewbox="' +
                    viewbox[0] +
                    ' ' +
                    viewbox[1] +
                    ' ' +
                    viewbox[2] +
                    ' ' +
                    viewbox[3] +
                    '"',
            );
        }

        source = source.replace('joint-element', '');
        source = source.replace(/class="joint-layers" transform=".*?"/, 'class="joint-layers"');

        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        return source;
    }

    scaleContentToFit(){
        this.diagram.paper.scaleContentToFit();
    }

    @HostListener('wheel', ['$event'])
    Wheel(event: WheelEvent) {
        if((event.target as HTMLInputElement).nodeName === 'svg'){
            event.preventDefault();
            if (event.deltaY > 0) {
                this.diagram.zoomOut();
            }
            if (event.deltaY < 0) {
                this.diagram.zoomIn();
            }
        }
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseMoveEvent) {
        if (this.diagram.dragStartPosition != null) {
            this.diagram.paper.translate(
                e.offsetX - this.diagram.dragStartPosition.x,
                e.offsetY - this.diagram.dragStartPosition.y);
        }
    }

    private removeSVGNodesByClassNames(svg: SVGElement, tags: string[], classes: string[]) {
        tags.forEach((tag) => {
            const elements = svg.getElementsByTagName(tag);
            // @ts-ignore
            for (const element of elements) {
                classes.forEach((cl: string) => {
                    if (element.classList.contains(cl)) {
                        element.remove();
                    }
                });
            }
        });
    }

    private removeSVGAttributesByTagNames(svg: SVGElement, tags: string[]) {
        tags.forEach((tag) => {
            const elements = svg.getElementsByTagName(tag) as HTMLCollectionOf<any>;
            // @ts-ignore
            for (const element of elements) {
                element.removeAttribute('magnet');
                element.removeAttribute('cursor');
                element.removeAttribute('event');
                element.removeAttribute('pointer-events');
                element.removeAttribute('port');
                element.removeAttribute('port-group');
                element.removeAttribute('joint-selector');
            }
        });
    }
}
