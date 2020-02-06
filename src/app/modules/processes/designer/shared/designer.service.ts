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
import {DeviceTypeSelectionResultModel} from '../../../devices/device-types-overview/shared/device-type-selection.model';

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


    checkConstraints(modeler: any): {error: boolean, text: string[]} {
        const response: {error: boolean, text: string[]} = {error: false, text: []};
        const elements = modeler.injector.get('elementRegistry');
        elements.forEach((el: DesignerElementModel) => {
            if (el.type === 'bpmn:Collaboration') {
                el.businessObject.participants.forEach(((participant: DesignerElementParticipantsModel) => {
                        const checkLane = this.checkLaneConstraints(participant);
                        if (checkLane.error) {
                            response.error = true;
                            response.text = checkLane.text;
                        }
                    })
                );
            }
        });
        return response;
    }

    private checkLaneConstraints(participant: DesignerElementParticipantsModel): {error: boolean, text: string[]} {
        const response: {error: boolean, text: string[]} = {error: false, text: []};

        if (participant.processRef.laneSets) {
            participant.processRef.laneSets.forEach((laneSet: DesignerElementLaneSetsModel) => {
                laneSet.lanes.forEach((lane: DesignerElementLanesModel) => {
                    let meta: (DeviceTypeSelectionResultModel | null) = null;
                    lane.flowNodeRef.forEach((flowElement: DesignerElementFlowNodeRefModel) => {
                        const newMeta = this.getMeta(flowElement);
                        if (newMeta) {
                            if (!meta && newMeta) {
                                meta = newMeta;
                            }
                            if (this.checkDeviceClasses(meta, newMeta)) {
                                response.error = true;
                                response.text.push(lane.name || lane.id);
                            }
                        }
                    });
                });
            });
        } else {
            if (participant.processRef.flowElements) {
                let meta: (DeviceTypeSelectionResultModel | null) = null;
                participant.processRef.flowElements.forEach((flowElement: DesignerElementFlowNodeRefModel) => {
                    const newMeta = this.getMeta(flowElement);
                    if (newMeta) {
                        if (!meta && newMeta) {
                            meta = newMeta;
                        }
                        if (this.checkDeviceClasses(meta, newMeta)) {
                            response.error = true;
                            response.text.push(participant.name || participant.id);
                        }
                    }
                });
            }
        }
        return response;
    }

    private getMeta(flowNodeRef: DesignerElementFlowNodeRefModel): (DeviceTypeSelectionResultModel | null) {
        if (flowNodeRef.$type === 'bpmn:ServiceTask' && flowNodeRef.type === 'external') {
            return this.getPayload(flowNodeRef);
        }
        return null;
    }

    private getPayload(flowNode: DesignerElementFlowNodeRefModel): (DeviceTypeSelectionResultModel | null) {
        for (let i = 0; i < flowNode.extensionElements.values.length; i++) {
            for (let j = 0; j < flowNode.extensionElements.values[i].inputParameters.length; j++) {
                if (flowNode.extensionElements.values[i].inputParameters[j].name === 'payload') {
                    return JSON.parse(flowNode.extensionElements.values[i].inputParameters[j].value);
                }
            }
        }
        return null;
    }

    private checkDeviceClasses(meta: (DeviceTypeSelectionResultModel | null), newMeta: (DeviceTypeSelectionResultModel | null)): boolean {
        if (meta === null || newMeta === null) {
            return false;
        } else {
            return meta.device_class.id !== newMeta.device_class.id;
        }
    }
}
