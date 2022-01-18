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
import { OperatorModel } from '../operator-repo/shared/operator.model';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';
import { ActivatedRoute } from '@angular/router';
import { OperatorRepoService } from '../operator-repo/shared/operator-repo.service';
import { FlowModel, FlowShareModel } from '../flow-repo/shared/flow.model';
import { DiagramEditorComponent } from '../../../core/components/diagram-editor/diagram-editor.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from '../../../core/services/authorization.service';
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
    flow = { share: {} as FlowShareModel } as FlowModel;
    write = false;

    constructor(
        private route: ActivatedRoute,
        private operatorRepoService: OperatorRepoService,
        private flowRepoService: FlowRepoService,
        private authService: AuthorizationService,
        public snackBar: MatSnackBar
    ) {}


    ngOnInit() {
        this.operatorRepoService.getOperators('', 9999, 0, 'name', 'asc').subscribe((resp: { operators: OperatorModel[] }) => {
            this.operators = resp.operators;
            this.ready = true;
        });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            const id = this.route.snapshot.paramMap.get('id');
            if (id !== null) {
                this.flowRepoService.getFlow(id).subscribe((resp: FlowModel | null) => {
                    if (resp !== null) {
                        this.flow = resp;
                        if (this.flow.share === null) {
                            this.flow.share = {} as FlowShareModel;
                        }
                        if (this.flow.share.write === true || this.flow.userId === this.authService.getUserId()) {
                            this.write = true;
                        }
                        for (const cell of this.flow.model.cells) {
                            if (cell.type === 'link') {
                                cell.attrs['.marker-target'] = cell.attrs.markerTarget;
                                delete cell.attrs.markerTarget;
                            }
                        }
                        this.diagram.loadGraph(this.flow.model);
                    }
                });
            } else {
                this.write = true;
            }
        }, 0);
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
                    operator.inputs,
                    operator.outputs,
                    operator.config_values,
                    operator._id,
                );
                break;
            default:
                this.diagram.newCloudNode(
                    operator.name,
                    operator.image,
                    operator.inputs,
                    operator.outputs,
                    operator.config_values,
                    operator._id,
                );
                break;
            }
        }
    }

    public saveModel() {
        const svg = this.diagram.paper.svg.cloneNode(true) as SVGElement;
        this.flow.image = this.createSVGFromModel(svg);
        this.flow.model = this.diagram.getGraph();
        if (this.flow.model.cells !== undefined) {
            for (const cell of this.flow.model.cells) {
                if (cell.type === 'link') {
                    cell.attrs.markerTarget = cell.attrs['.marker-target'];
                    delete cell.attrs['.marker-target'];
                }
            }
        }
        const flow = Object.assign({}, this.flow);
        this.flowRepoService.saveFlow(flow).subscribe();
        this.snackBar.open('Flow saved', undefined, {
            duration: 2000,
        });
    }

    createSVGFromModel(svg: SVGElement): string {
        let source = '';
        const serializer = new XMLSerializer();
        const nodes = svg.getElementsByClassName('joint-type-senergy');
        const viewbox = [null, null, 0, 0];
        // @ts-ignore
        for (const node of nodes) {
            let startOffset = 0;
            let endOffset = 0;
            const ports = node.getElementsByClassName('joint-port-label');
            for (const port of ports) {
                if (port.getAttribute('text-anchor') === 'end' && endOffset < port.getBBox().width) {
                    endOffset = port.getBBox().width;
                }
                if (port.getAttribute('text-anchor') === 'start' && startOffset < port.getBBox().width) {
                    startOffset = port.getBBox().width;
                }
            }
            const coords = node.attributes.transform.value.replace('translate(', '').replace(')', '').split(',');
            // x
            if (viewbox[0] === null) {
                viewbox[0] = +coords[0] - startOffset;
            }
            // @ts-ignore
            if (coords[0] < viewbox[0]) {
                viewbox[0] = +coords[0] - startOffset;
            }
            // y
            if (viewbox[1] === null) {
                viewbox[1] = +coords[1] - 20;
            }
            // @ts-ignore
            if (coords[1] < viewbox[1]) {
                viewbox[1] = +coords[1] - 20;
            }
            // x width
            // @ts-ignore
            if (coords[0] > viewbox[2]) {
                // @ts-ignore
                viewbox[2] = +coords[0] + 150 - viewbox[0] + endOffset;
            }
            // y height
            // @ts-ignore
            if (coords[1] > viewbox[3]) {
                // @ts-ignore
                viewbox[3] = +coords[1] + 120 - viewbox[1] + 20;
            }
        }
        let elements: HTMLCollectionOf<Element> = svg.getElementsByTagName('defs');
        // @ts-ignore
        for (const element of elements) {
            element.remove();
        }
        elements = svg.getElementsByClassName('joint-tools-layer');
        // @ts-ignore
        for (const element of elements) {
            element.remove();
        }
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
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        return source;
    }

    scaleContentToFit(){
        this.diagram.paper.scaleContentToFit();
    }

    @HostListener('wheel', ['$event'])
    Wheel(event: WheelEvent) {
        if((event.target as HTMLInputElement).nodeName == "svg"){
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
        if (this.diagram.dragStartPosition != null)
            this.diagram.paper.translate(
                e.offsetX - this.diagram.dragStartPosition.x,
                e.offsetY - this.diagram.dragStartPosition.y);
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
