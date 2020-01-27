/*
 * Copyright 2018 InfAI (CC SES)
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

import {OnInit, Component, AfterViewInit, ViewChild} from '@angular/core';
import {OperatorModel} from '../operator-repo/shared/operator.model';
import {FlowRepoService} from '../flow-repo/shared/flow-repo.service';
import {ActivatedRoute} from '@angular/router';
import {OperatorRepoService} from '../operator-repo/shared/operator-repo.service';
import {FlowModel} from '../flow-repo/shared/flow.model';
import {DiagramEditorComponent} from '../../../core/components/diagram-editor/diagram-editor.component';
import {MatSnackBar} from '@angular/material';

@Component({
    selector: 'senergy-flow-designer',
    templateUrl: './flow-designer.component.html',
    styleUrls: ['./flow-designer.component.css']
})
export class FlowDesignerComponent implements OnInit, AfterViewInit {

    constructor(private route: ActivatedRoute,
                private operatorRepoService: OperatorRepoService,
                private flowRepoService: FlowRepoService,
                public snackBar: MatSnackBar
    ) {
    }

    @ViewChild(DiagramEditorComponent, {static: false}) diagram!: DiagramEditorComponent;

    operators: OperatorModel[] = [];
    ready = false;
    flow = {} as FlowModel;

    ngOnInit() {
        this.operatorRepoService.getOperators().subscribe((resp: { operators: OperatorModel[] }) => {
            this.operators = resp.operators;
            this.ready = true;
        });
    }

    ngAfterViewInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.flowRepoService.getFlow(id).subscribe((resp: FlowModel | null) => {
                if (resp !== null) {
                    this.flow = resp;
                    for (const cell of this.flow.model.cells) {
                        if (cell.type === 'link') {
                            cell.attrs['.marker-target'] = cell.attrs.markerTarget;
                            delete cell.attrs.markerTarget;
                        }
                    }
                    this.diagram.loadGraph(this.flow.model);
                }
            });
        }
    }

    public addNode(operator: OperatorModel) {
        if (operator.name !== undefined && operator.inputs !== undefined && operator.outputs !== undefined
            && operator.image !== undefined && operator.config_values !== undefined && operator._id !== undefined) {
            switch (operator.deploymentType) {
                case 'cloud':
                    this.diagram.newCloudNode(
                        operator.name, operator.image, operator.inputs, operator.outputs, operator.config_values, operator._id);
                    break;
                case 'local':
                    this.diagram.newLocalNode(
                        operator.name, operator.image, operator.inputs, operator.outputs, operator.config_values, operator._id);
                    break;
                default:
                    this.diagram.newCloudNode(
                        operator.name, operator.image, operator.inputs, operator.outputs, operator.config_values, operator._id);
            }
        }
    }

    public saveModel() {
        const svg = this.diagram.paper.svg;
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

    createSVGFromModel(svg: any): string {
        let source = '';
        if (svg !== null) {
            const serializer = new XMLSerializer();
            const nodes = svg.getElementsByClassName('joint-type-senergy');
            const viewbox = [null, null, 0, 0];
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
                const coords = node.attributes.transform.value.replace('translate(', '')
                    .replace(')', '').split(',');
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
                if (coords[0] > viewbox [2]) {
                    // @ts-ignore
                    viewbox[2] = +coords[0] + 150 - viewbox[0] + endOffset;
                }
                // y height
                // @ts-ignore
                if (coords[1] > viewbox [3]) {
                    // @ts-ignore
                    viewbox[3] = +coords[1] + 120 - viewbox[1] + 20;
                }
            }
            source = serializer.serializeToString(svg);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/,
                    '<svg xmlns="http://www.w3.org/2000/svg" viewbox="'
                    + viewbox[0] + ' ' + viewbox[1] + ' ' + viewbox[2] + ' ' + viewbox[3] + '"');
            } else {
                source = source.replace(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/,
                    '<svg xmlns="http://www.w3.org/2000/svg" viewbox="'
                    + viewbox[0] + ' ' + viewbox[1] + ' ' + viewbox[2] + ' ' + viewbox[3] + '"');
            }
            source = source.replace( 'class="connection-wrap"', 'style="display:none;"');
            source = source.replace( 'class="marker-vertices"', 'style="display:none;"');
            source = source.replace( 'class="marker-arrowheads"', 'style="display:none;"');
            source = source.replace( 'class="link-tools"', 'style="display:none;"');
            source = source.replace( 'class="joint-port-body"', 'class=""');
            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        }
        return source;
    }
}
