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

import {Component, AfterViewInit, ViewChild} from '@angular/core';
import {IOModel, OperatorModel} from '../operator-repo/shared/operator.model';
import {FlowRepoService} from '../flow-repo/shared/flow-repo.service';
import {ActivatedRoute} from '@angular/router';
import {OperatorRepoService} from '../operator-repo/shared/operator-repo.service';
import {FlowModel} from '../flow-repo/shared/flow.model';
import {DiagramEditorComponent} from '../diagram-editor/diagram-editor.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogData, FlowUpdateDialogComponent} from './update-dialog/flow-update-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {CellModel} from '../diagram-editor/shared/diagram.model';

@Component({
    selector: 'senergy-flow-designer',
    templateUrl: './flow-designer.component.html',
    styleUrls: ['./flow-designer.component.css'],
})
export class FlowDesignerComponent implements AfterViewInit {

    @ViewChild(DiagramEditorComponent, {static: false}) diagram!: DiagramEditorComponent;

    operators: OperatorModel[] = [];
    ready = false;
    flow = {} as FlowModel;
    listHeight = 600;

    constructor(
        private route: ActivatedRoute,
        private operatorRepoService: OperatorRepoService,
        private flowRepoService: FlowRepoService,
        public snackBar: MatSnackBar,
        public dialog: MatDialog
    ) {
    }

    ngAfterViewInit() {
        this.operatorRepoService.getOperators('', 9999, 0, 'name', 'asc').subscribe((ops: {
            operators: OperatorModel[]
        }) => {
            this.operators = ops.operators;
            const id = this.route.snapshot.paramMap.get('id');
            if (id !== null) {
                this.flowRepoService.getFlow(id).subscribe((resp: FlowModel | null) => {
                    if (resp !== null) {
                        this.flow = resp;
                        const elements = [] as any [];
                        const dialogPromises: Promise<any>[] = [];
                        for (const cell of this.flow.model.cells) {
                            if (cell.type === 'link') {
                                elements.push(this.diagram.prepareLink(cell.source, cell.target));
                            } else if (cell.type === 'senergy.NodeElement') {
                                const operator = this.getOperator(cell.operatorId);
                                if (!operator) {
                                    console.error(`Operator mit ID ${cell.operatorId} nicht gefunden.`);
                                    continue;
                                }
                                if (cell.version !== operator?.version) {
                                    const operatorsUpdated = {} as DialogData;
                                    console.log('operator version changed:' + cell.version + '!==' + operator?.version);
                                    operatorsUpdated.oldOperator = cell;
                                    operatorsUpdated.newOperator = {
                                        type: 'senergy.NodeElement',
                                        inPorts: this.getPortNames(operator!.inputs),
                                        outPorts: this.getPortNames(operator!.outputs),
                                        config: operator!.config_values,
                                        name: operator!.name,
                                        image: operator!.image,
                                        operatorId: operator!._id,
                                        deploymentType: operator!.deploymentType,
                                        version: operator!.version,
                                    } as CellModel;
                                    const dialogPromise = new Promise<void>((resolve) => {
                                        const dialogRef = this.dialog.open(FlowUpdateDialogComponent, {
                                            data: operatorsUpdated
                                        });

                                        dialogRef.afterClosed().subscribe(_ => {
                                            cell.inPorts = this.getPortNames(operator.inputs);
                                            cell.outPorts = this.getPortNames(operator.outputs);
                                            cell.config = operator.config_values;
                                            cell.version = operator.version;
                                            this.addNodeToElements(cell, elements);
                                            resolve();
                                        });
                                    });
                                    dialogPromises.push(dialogPromise);
                                } else {
                                    this.addNodeToElements(cell, elements);
                                }
                            }
                        }
                        Promise.all(dialogPromises).then(() => {
                            this.diagram.addElementsToGraph(elements);
                        });
                    }
                });
            }
            this.ready = true;
        });
        this.listHeight = this.diagram.paperHeight;
    }

    private addNodeToElements(cell: any, elements: any[]) {
        if (cell.deploymentType === 'local') {
            elements.push(this.createNode('local', cell));
        } else {
            elements.push(this.createNode('cloud', cell));
        }
    }

    public addNode(operator: OperatorModel) {
        if (operator.inputs == null) {
            operator.inputs = [] as IOModel[];
        }
        if (operator.outputs == null) {
            operator.outputs = [] as IOModel[];
        }
        if (operator.config_values == null) {
            operator.config_values = [] as IOModel[];
        }
        if (
            operator.name !== undefined &&
            operator.image !== undefined &&
            operator._id !== undefined
        ) {
            switch (operator.deploymentType) {
                case 'local':
                    this.diagram.addNode(
                        'local',
                        operator.name,
                        operator.image,
                        this.getPortNames(operator.inputs),
                        this.getPortNames(operator.outputs),
                        operator.config_values,
                        operator._id,
                        operator.version
                    );
                    break;
                default:
                    this.diagram.addNode(
                        'cloud',
                        operator.name,
                        operator.image,
                        this.getPortNames(operator.inputs),
                        this.getPortNames(operator.outputs),
                        operator.config_values,
                        operator._id,
                        operator.version
                    );
                    break;
            }
        } else {
            this.snackBar.open('Could not add operator', undefined, {
                duration: 2000,
            });
        }
    }

    private getPortNames(inputs: IOModel[] | undefined): string[] {
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

    private createNode(type: 'local' | 'cloud' | '', cell: CellModel) {
        return this.diagram.createNode(
            type,
            cell.name,
            cell.image,
            cell.inPorts,
            cell.outPorts,
            cell.config,
            cell.operatorId,
            cell.version,
            cell.position,
            cell.id
        );
    }

    public saveModel() {
        const svg = this.diagram.paperService.getPaper().svg.cloneNode(true) as SVGElement;
        this.flow.image = this.createSVGFromModel(svg);
        this.flow.model = this.diagram.getGraph();
        const flow = Object.assign({}, this.flow);
        this.flowRepoService.saveFlow(flow).subscribe(resp => {
            if (resp != null) {
                if (resp.status == 200) {
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
        const viewbox = [box.x - 10, box.y, box.width + 20, box.height];

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

    scaleContentToFit() {
        this.diagram.paperService.getPaper().transformToFitContent();
    }

    private removeSVGNodesByClassNames(svg: SVGElement, tags: string[], classes: string[]) {
        tags.forEach((tag) => {
            const elements = svg.getElementsByTagName(tag) as any;
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
            const elements = svg.getElementsByTagName(tag) as HTMLCollectionOf<any> as any;
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

    private getOperator(id: string): OperatorModel | null {
        return this.operators.find(op => op._id === id) ?? null;
    }
}
