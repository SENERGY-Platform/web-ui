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

    constructor() {
    }

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

    checkConstraints(modeler: any): {businessObject: {id: string}}[] {
        return modeler.injector.get('elementRegistry').filter((element: any) => {
            return element.type === 'bpmn:Lane' && !checkLaneConstraints(element.businessObject);
        });

        function checkLaneConstraints(businessObject: any): boolean {
            let meta = null;
            for (let i = 0; businessObject.flowNodeRef && i < businessObject.flowNodeRef.length; i++) {
                const newMeta = getMeta(businessObject.flowNodeRef[i]);
                if (!meta && newMeta) {
                    meta = newMeta;
                }
                if (!compatibleMeta(meta, newMeta)) {
                    return false;
                }
            }
            return true;
        }

        function getMeta(flowNodeRef: any): any {
            if (flowNodeRef.$type === 'bpmn:ServiceTask' && flowNodeRef.type === 'external' && flowNodeRef.topic === 'execute_in_dose') {
                return getPayload(flowNodeRef);
            }
        }

        function getPayload(element: any): any {
            for (let i = 0; i < element.extensionElements.values.length; i++) {
                for (let j = 0; j < element.extensionElements.values[i].inputParameters.length; j++) {
                    if (element.extensionElements.values[i].inputParameters[j].name === 'payload') {
                        return JSON.parse(element.extensionElements.values[i].inputParameters[j].value);
                    }
                }
            }
        }

        function compatibleMeta(meta: any, newMeta: any): boolean {
            return !(meta && newMeta && meta.device_type !== newMeta.device_type);
        }
    }
}
