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

import {IOModel} from '../../../../modules/data/operator-repo/shared/operator.model';
import {Position} from '../diagram-editor.component';

export interface DiagramModel {
    cells: CellModel[];
}

export interface CellModel {
    id: string;
    image: string;
    operatorId: string;
    inPorts: string[];
    outPorts: string[];
    config: IOModel[];
    position: Position;
    name: string;
    type: string;
    source: LinkIOModel;
    target: LinkIOModel;
    deploymentType: string;
}
export interface LinkIOModel {
    id: string;
    magnet: string;
    port: string;
}