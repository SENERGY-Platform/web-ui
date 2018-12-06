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

import {Injectable} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {DiagramModel} from './diagram.model';
import {IOModel} from '../../../../modules/data/operator-repo/shared/operator.model';

@Injectable({
    providedIn: 'root'
})
export class DiagramService {

    private model = new BehaviorSubject({} as DiagramModel);
    currentGraph = this.model.asObservable();

    private node = new BehaviorSubject({} as any);
    getNode = this.node.asObservable();

    private graph = {} as DiagramModel;

    constructor() { }

    public loadGraph(graph: DiagramModel) {
        this.model.next(graph);
    }

    public addNode(name: string, image: string, inputs: IOModel[], outputs: IOModel []) {
        this.node.next({name: name, image: image, inputs: inputs, outputs: outputs });
    }

    public setGraphData(data: any) {
        this.graph = data;
    }

    public getGraphData(): DiagramModel {
        return this.graph;
    }
}
