/*
 * Copyright 2019 InfAI (CC SES)
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
import {BpmnElement, BpmnParameter} from './designer.model';

@Injectable({
    providedIn: 'root'
})
export class DesignerService {

    constructor() {}

    getIncomingOutputs(element: BpmnElement, done: BpmnElement[] = []): BpmnParameter[] {
        let result: BpmnParameter[] = [];
        if (done.indexOf(element) !== -1) {
            return result;
        }
        done.push(element);
        for (let index = 0; index < element.incoming.length; index++) {
            const incoming = element.incoming[index].source;
            if (incoming.businessObject.extensionElements
                && incoming.businessObject.extensionElements.values
                && incoming.businessObject.extensionElements.values[0]
                && incoming.businessObject.extensionElements.values[0].outputParameters
            ) {
                result = result.concat(incoming.businessObject.extensionElements.values[0].outputParameters);
            }
            result = result.concat(this.getIncomingOutputs(incoming, done));
        }
        return result;
    }
}
