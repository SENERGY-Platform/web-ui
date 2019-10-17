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




interface BpmnElementRef {
    source: BpmnElement;
}

export interface BpmnParameter {
    name: string;
    value: string;
}

interface BpmnExtensionElementsValue {
    outputParameters: BpmnParameter[];
    inputParameters: BpmnParameter[];
}

interface BpmnExtensionElements {
    values ?: BpmnExtensionElementsValue[];
}

interface BpmnBusinessObject {
    extensionElements: BpmnExtensionElements;
}

export interface BpmnElement {
    incoming: BpmnElementRef[];
    businessObject: BpmnBusinessObject;
}

interface HistoricDataConfigInterval {
    value: string;
    type: string;
}

interface HistoricDataConfigDateInterval {
    start: string | Date;
    end: string | Date;
}

export interface HistoricDataConfig {
    analysisAction: string;
    interval: HistoricDataConfigInterval;
    dateInterval: HistoricDataConfigDateInterval;
}

export interface DurationIso {
    string: string; // Y __ M __ d __ h __ m __ s __
    year:   number; // Y
    month:  number; // M
    day:    number; // D
    hour:   number; // h
    minute: number; // m
    second: number; // s
}

export interface DurationResult {
    iso: DurationIso;
    text: string;
}

export interface DesignerProcessModel {
    date: number;
    owner: string;
    bpmn_xml: string;
    svgXML: string;
    _id: string;
}
