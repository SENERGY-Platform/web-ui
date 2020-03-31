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

import {Injectable} from '@angular/core';
import {BpmnElement, BpmnParameter} from './designer.model';
import {DeviceTypeSelectionResultModel} from '../../../devices/device-types-overview/shared/device-type-selection.model';
import {DesignerErrorModel} from './designer-error.model';
import {
    DesignerElementFlowNodeRefModel,
    DesignerElementLaneSetsModel,
    DesignerElementLanesModel,
    DesignerElementModel,
    DesignerElementParticipantsModel
} from './designer-element.model';
import {DeviceTypeService} from '../../../devices/device-types-overview/shared/device-type.service';
import {forkJoin, Observable} from 'rxjs';
import {DeviceTypeModel} from '../../../devices/device-types-overview/shared/device-type.model';

@Injectable({
    providedIn: 'root'
})
export class DesignerHelperService {

    constructor(private deviceTypeService: DeviceTypeService) {
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


    checkConstraints(modeler: any): Observable<DesignerErrorModel[][]> {
        const array: Observable<DesignerErrorModel[]>[] = [];
        const elements = modeler.injector.get('elementRegistry');
        elements.forEach((el: DesignerElementModel) => {
            if (el.type === 'bpmn:Collaboration') {
                el.businessObject.participants.forEach(((participant: DesignerElementParticipantsModel) => {
                        array.push(this.checkLaneConstraints(participant));
                    })
                );
            }
        });
        return forkJoin(array);
    }

    private checkLaneConstraints(participant: DesignerElementParticipantsModel): Observable<DesignerErrorModel[]> {
        const array: Observable<DesignerErrorModel>[] = [];

        if (participant.processRef.laneSets) {
            participant.processRef.laneSets.forEach((laneSet: DesignerElementLaneSetsModel) => {
                if (laneSet.lanes) {
                    laneSet.lanes.forEach((lane: DesignerElementLanesModel) => {
                        array.push(this.checkFlowNodeElements(lane.flowNodeRef, lane.name || lane.id));
                    });
                }
            });
        } else {
            if (participant.processRef.flowElements) {
                array.push(this.checkFlowNodeElements(participant.processRef.flowElements, participant.name || participant.id));
            }
        }
        return forkJoin(array);
    }

    private checkFlowNodeElements(flowNode: DesignerElementFlowNodeRefModel[], errorText: string): Observable<DesignerErrorModel> {
        const filterArray: { function_id: string, device_class_id: string, aspect_id: string }[] = [];
        const response: DesignerErrorModel = {error: false, errorType: null, laneName: ''};
        let meta: (DeviceTypeSelectionResultModel | null) = null;
        if (flowNode) {
            flowNode.forEach((flowElement: DesignerElementFlowNodeRefModel) => {
                const newMeta = this.getMeta(flowElement);
                const filter: { function_id: string, device_class_id: string, aspect_id: string } = {
                    function_id: '',
                    device_class_id: '',
                    aspect_id: ''
                };
                if (newMeta) {

                    if (newMeta.function.rdf_type === 'https://senergy.infai.org/ontology/ControllingFunction') {
                        if (!meta && newMeta) {
                            meta = newMeta;
                        }
                        if (this.checkDeviceClasses(meta, newMeta)) {
                            response.error = true;
                            response.errorType = 'deviceClass';
                            response.laneName = errorText;
                        }
                        filter.device_class_id = newMeta.device_class.id;
                    }

                    if (newMeta.function.rdf_type === 'https://senergy.infai.org/ontology/MeasuringFunction') {
                        filter.aspect_id = newMeta.aspect.id;
                    }
                    filter.function_id = newMeta.function.id;
                    filterArray.push(filter);
                }
            });
        }


        return new Observable<DesignerErrorModel>((observer) => {
            if (response.error === false && filterArray.length > 0) {
                this.deviceTypeService.getDeviceTypeFiltered(filterArray).subscribe(
                    (resp: DeviceTypeModel | null) => {
                        if (resp === null) {
                            response.error = true;
                            response.errorType = 'deviceType';
                            response.laneName = errorText;
                        }
                        observer.next(response);
                        observer.complete();
                    });
            } else {
                observer.next(response);
                observer.complete();
            }

        });
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
