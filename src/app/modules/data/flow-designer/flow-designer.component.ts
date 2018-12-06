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

import {OnInit, Component} from '@angular/core';
import {DiagramService} from '../../../core/components/diagram-editor/shared/diagram.service';
import {OperatorModel} from '../operator-repo/shared/operator.model';
import {FlowRepoService} from '../flow-repo/shared/flow-repo.service';
import {ActivatedRoute} from '@angular/router';
import {OperatorRepoService} from '../operator-repo/shared/operator-repo.service';
import {FlowModel} from '../flow-repo/shared/flow.model';

@Component({
    selector: 'senergy-flow-designer',
    templateUrl: './flow-designer.component.html',
    styleUrls: ['./flow-designer.component.css']
})
export class FlowDesignerComponent implements OnInit  {

    operators: OperatorModel[] = [];
    ready = false;
    flow = {} as FlowModel;

    constructor(private route: ActivatedRoute,
                private operatorRepoService: OperatorRepoService,
                private flowRepoService: FlowRepoService,
                private diagram: DiagramService) { }

    ngOnInit() {
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

        this.operatorRepoService.getOperators().subscribe((resp: { operators: OperatorModel[] }) => {
            this.operators = resp.operators;
            this.ready = true;
        });
    }

    public addNode(operator: OperatorModel) {
        if (operator.name !== undefined && operator.inputs !== undefined && operator.outputs !== undefined
            && operator.image !== undefined) {
            this.diagram.addNode(operator.name, operator.image, operator.inputs, operator.outputs);
        }
    }

    public saveModel() {
        this.flow.model = this.diagram.getGraphData();
        for (const cell of this.flow.model.cells) {
            if (cell.type === 'link') {
                cell.attrs.markerTarget =  cell.attrs['.marker-target'];
                delete cell.attrs['.marker-target'];
            }
        }
        this.flowRepoService.saveFlow(this.flow).subscribe();
    }
}
