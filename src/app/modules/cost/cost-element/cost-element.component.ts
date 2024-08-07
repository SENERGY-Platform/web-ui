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
import { Observable } from 'rxjs';
import { PipelineModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { OperatorModel } from '../../data/operator-repo/shared/operator.model';
import { DeviceInstancesBaseModel } from '../../devices/device-instances/shared/device-instances.model';
import { ExportModel } from '../../exports/shared/export.model';

@Component({
    selector: 'senergy-cost-element',
    templateUrl: './cost-element.component.html',
    styleUrls: ['./cost-element.component.css']
})
export class CostElementComponent {
    private _element: CostModel = {} as CostModel;
    ready = false;

    constructor() { }

    @Input() pipelines: PipelineModel[] = [];
    @Input() operators: OperatorModel[] = [];
    @Input() imports: PipelineModel[] = [];
    @Input() devices: DeviceInstancesBaseModel[] = [];
    @Input() exports: ExportModel[] = [];
    @Input() parentName: string = '';
    @Input()
    get element() {
        return this._element;
    }

    set element(dis) {
        this._element = dis;
        if (this.parentName === "Exports") {
            const exp = this.exports.find(e => e.ID === this.name);
            if (exp !== undefined) {
                dis.displayName = exp.Name;
            } else {
                dis.displayName = 'Export ' + this.name + ' (deleted)';
            }
        }
        if (this._element.children !== undefined && this._element.children !== null) {
            const keys = Object.keys(this._element.children);
            if (keys.length > 0) {
                const obj = this.element.children as any;
                const obs: Observable<any>[] = [];
                keys.forEach((name) => {
                    if (name.startsWith('deployment:pipeline-')) {
                        const pipeline = this.pipelines.find(p => name.startsWith('deployment:pipeline-' + p.id));
                        if (pipeline !== undefined) {
                            obj[name].displayName = pipeline.name;
                        } else {
                            obj[name].displayName = name.replace('deployment:pipeline-', 'Pipeline ') + ' (deleted)';
                        }
                        const subkeys = Object.keys(obj[name].children);
                        subkeys.forEach(containername => {
                            const operator = this.operators.find(o => containername.startsWith(o._id || 'undefined'));
                            if (operator !== undefined) {
                                obj[name].children[containername].displayName = operator.name;
                            }
                        });
                    } else if ((name.startsWith('deployment:import-') || name.startsWith('import-')) && name !== "import-deploy" && name !== "import-repo") {
                        const id = name.replace('deployment:', '').replace('import-', '');
                        const ip = this.imports.find(p => id === p.id.replace('urn:infai:ses:import:', ''));
                        if (ip !== undefined) {
                            obj[name].displayName = ip.name;
                        } else {
                            obj[name].displayName = 'Import ' + id + ' (deleted)';
                        }
                        obj[name].children = []; // don't display containers
                    } else if (name.startsWith('urn:infai:ses:device:')) {
                        const device = this.devices.find(d => d.id === name);
                        if (device !== undefined) {
                            obj[name].displayName = device.display_name || device.name;
                        } else {
                            obj[name].displayName = 'Device ' + name + ' (deleted)';
                        }
                    }
                });
                this.element.children = obj;
                this.ready = true;
            } else {
                this.ready = true;
            }
        } else {
            this.ready = true;
        }
    }

    @Input() name = '';
    expensiveFirst = (a: KeyValue<string, CostModel>, b: KeyValue<string, CostModel>): number => {
        if (a.value.month.requests !== 0 && b.value.month.requests !== 0) {
            return b.value.month.requests - a.value.month.requests
        }
        return this.sum(b.value.month) - this.sum(a.value.month);
    }
    sum(m: CostEntryModel): number {
        if (m === undefined) {
            return 0;
        }
        return m.cpu + m.ram + m.storage;
    }
}
