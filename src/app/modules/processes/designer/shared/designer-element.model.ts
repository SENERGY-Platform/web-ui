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

export interface DesignerElementModel {
    type: string;
    businessObject: DesignerElementBusinessObjectModel;
}

export interface DesignerElementBusinessObjectModel {
    id: string;
    name: string;
    flowNodeRef: DesignerElementFlowNodeRefModel[];
    participants: DesignerElementParticipantsModel[];
}

export interface DesignerElementFlowNodeRefModel {
    $type: string;
    type: string;
    extensionElements: {
        values: {
            inputParameters: {
                name: string;
                value: string
            }[];
        }[]
    };
}

export interface DesignerElementParticipantsModel {
    id: string;
    processRef: DesignerElementProcessRefModel;
    name: string;
}

export interface DesignerElementProcessRefModel {
    laneSets: DesignerElementLaneSetsModel[];
    flowElements: DesignerElementFlowNodeRefModel[];
}

export interface DesignerElementLaneSetsModel {
    lanes: DesignerElementLanesModel[];
}

export interface DesignerElementLanesModel {
    id: string;
    flowNodeRef: DesignerElementFlowNodeRefModel[];
    name: string;
}
