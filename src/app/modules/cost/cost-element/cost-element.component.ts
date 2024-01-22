/*
 * Copyright 2023 InfAI (CC SES)
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

import { KeyValue } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CostEntryModel, CostModel, } from '../shared/cost.model';
import { PipelineRegistryService } from '../../data/pipeline-registry/shared/pipeline-registry.service';
import { OperatorRepoService } from '../../data/operator-repo/shared/operator-repo.service';
import { Observable, forkJoin } from 'rxjs';
import { PipelineModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { OperatorModel } from '../../data/operator-repo/shared/operator.model';

@Component({
    selector: 'senergy-cost-element',
    templateUrl: './cost-element.component.html',
    styleUrls: ['./cost-element.component.css']
})
export class CostElementComponent {
    private _element: CostModel = {} as CostModel;
    ready = false;

    constructor(private pipelineService: PipelineRegistryService, private operatorService: OperatorRepoService) { }

    @Input() userid: string|undefined;

    @Input()
    get element() {
        return this._element;
    }

    set element(dis) {
        this._element = dis;
        if (this._element.children !== undefined && this._element.children !== null) {
            const keys = Object.keys(this._element.children);
            if (keys.length > 0 && keys[0].startsWith('deployment:pipeline')) {
                const obj = this.element.children as any;
                const obs: Observable<any>[] = [];
                obs.push(this.pipelineService.getPipelines('id:asc', this.userid));
                obs.push(this.operatorService.getOperators('', 9999, 0, 'name', 'asc', this.userid));
                forkJoin(obs).subscribe(obsres => {
                    const pipelines: PipelineModel[] = obsres[0];
                    const operators: OperatorModel[] = obsres[1].operators;
                    keys.forEach((name) => {
                        const pipeline = pipelines.find(p => name.startsWith('deployment:pipeline-' + p.id));
                        if (pipeline !== undefined) {
                            obj[name].displayName = pipeline.name;
                        } else {
                            obj[name].displayName = name.replace('deployment:pipeline-', 'Pipeline ') + ' (deleted)';
                        }
                        const subkeys = Object.keys(obj[name].children);
                        subkeys.forEach(containername => {
                            const operator = operators.find(o => containername.startsWith(o._id || 'undefined'));
                            if (operator !== undefined) {
                                obj[name].children[containername].displayName = operator.name;
                            }
                        });

                    });
                    this.element.children = obj;
                    this.ready = true;
                });
            } else {
                this.ready = true;
            }
        } else {
            this.ready = true;
        }
    }

    @Input() name = '';
    expensiveFirst = (a: KeyValue<string, CostModel>, b: KeyValue<string, CostModel>): number => this.sum(b.value.month) - this.sum(a.value.month);
    sum(m: CostEntryModel): number {
        if (m === undefined) {
            return 0;
        }
        return m.cpu + m.ram + m.storage;
    }
}
