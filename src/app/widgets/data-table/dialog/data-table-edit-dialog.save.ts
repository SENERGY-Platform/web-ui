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

import { ExportModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { PipelineModel, PipelineOperatorModel } from '../../../modules/data/pipeline-registry/shared/pipeline.model';
import { DeviceTypeFunctionModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';
import { ExportValueTypes } from '../shared/data-table.model';

/** Diagram image for the generated deployment; the deployment service requires one next to the XML. */
export const GENERATED_DEPLOYMENT_SVG =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!-- created with bpmn-js / http://bpmn.io -->\n' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="112" height="92" viewBox="254 74 112 92" version="1.1"><defs><marker id="sequenceflow-end-white-black-8shwih7rrgzkmm4pwfqg6rb2a" viewBox="0 0 20 20" refX="11" refY="10" markerWidth="10" markerHeight="10" orient="auto"><path d="M 1 5 L 11 10 L 1 15 Z" style="fill: black; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: black;"/></marker></defs><g class="djs-group"><g class="djs-element djs-shape" data-element-id="Task_10z5wf9" style="display: block;" transform="matrix(1 0 0 1 260 80)"><g class="djs-visual"><rect x="0" y="0" width="100" height="80" rx="10" ry="10" style="stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;"/><text lineHeight="1.2" class="djs-label" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: normal; fill: black;"><tspan x="11.4375" y="43.599999999999994">GENERATED!</tspan></text></g><rect x="0" y="0" width="100" height="80" class="djs-hit" style="fill: none; stroke-opacity: 0; stroke: white; stroke-width: 15px;"/><rect x="-6" y="-6" width="112" height="92" class="djs-outline" style="fill: none;"/></g></g></svg>';

/** BPMN process with one external task that reads the function on the aspect; device and service are set on the prepared deployment. */
export function generatedDeploymentXml(
    selectedFunction: Pick<DeviceTypeFunctionModel, 'id' | 'name' | 'concept_id'>,
    aspectId: string | null | undefined,
): string {
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="generatedByProcessStatusWidget" isExecutable="true"><bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>SequenceFlow_1oborg2</bpmn:outgoing></bpmn:startEvent><bpmn:sequenceFlow id="SequenceFlow_1oborg2" sourceRef="StartEvent_1" targetRef="Task_0os5tro" /><bpmn:endEvent id="EndEvent_131n4r3"><bpmn:incoming>SequenceFlow_0lpgosu</bpmn:incoming></bpmn:endEvent><bpmn:sequenceFlow id="SequenceFlow_0lpgosu" sourceRef="Task_0os5tro" targetRef="EndEvent_131n4r3" /><bpmn:serviceTask id="Task_0os5tro" name="' +
        selectedFunction.name +
        '" camunda:type="external" camunda:topic="pessimistic"><bpmn:extensionElements><camunda:inputOutput><camunda:inputParameter name="payload">{\n' +
        '    "function": {\n' +
        '        "id": "' +
        selectedFunction.id +
        '",\n' +
        '        "name": "' +
        selectedFunction.name +
        '",\n' +
        '        "concept_id": "' +
        selectedFunction.concept_id +
        '",\n' +
        '        "rdf_type": "https://senergy.infai.org/ontology/MeasuringFunction"\n' +
        '    },\n' +
        '    "device_class": null,\n' +
        '    "aspect": {\n' +
        '        "id": "' +
        aspectId +
        '",\n' +
        '        "name": "aspect",\n' +
        '        "rdf_type": "https://senergy.infai.org/ontology/Aspect"\n' +
        '    },\n' +
        '    "label": "getFunction",\n' +
        '    "input": {},\n' +
        '    "characteristic_id": "urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f",\n' +
        '    "retries": 0\n' +
        '}</camunda:inputParameter><camunda:outputParameter name="outputs">${result}</camunda:outputParameter></camunda:inputOutput></bpmn:extensionElements><bpmn:incoming>SequenceFlow_1oborg2</bpmn:incoming><bpmn:outgoing>SequenceFlow_0lpgosu</bpmn:outgoing></bpmn:serviceTask></bpmn:process></bpmn:definitions>');
}

/** Cron of a generated schedule: the start second of element `index` is spread over the refresh time so requests do not all fire at once. */
export function generatedScheduleCron(refreshTime: number | string, elementCount: number, index: number): string {
    let cron =
        refreshTime === '*'
            ? refreshTime
            : (Math.round(((refreshTime as number) / elementCount) * index) as unknown as string) +
            '/' +
            refreshTime;
    cron += ' * * * * *';
    return cron;
}

export function buildPipelineOperatorExport(
    pipeline: PipelineModel | undefined,
    operator: PipelineOperatorModel | undefined,
    exportValueName: string | null | undefined,
    exportValuePath: string | null | undefined,
    valueType: ExportValueTypes | null | undefined,
): ExportModel {
    if (
        pipeline === undefined ||
        operator === undefined ||
        exportValueName === undefined ||
        exportValuePath === undefined ||
        valueType === undefined
    ) {
        throw new Error('undefined values');
    }

    return {
        Name: pipeline.name + '_' + operator.name,
        TimePath: 'time',
        Values: [
            {
                Name: exportValueName,
                Path: exportValuePath,
                Type: valueType,
            },
        ],
        EntityName: operator.id,
        Filter: pipeline.id + ':' + operator.id,
        FilterType: 'operatorId',
        ServiceName: operator.name,
        Topic: 'analytics-' + operator.name,
        Offset: 'largest',
        Generated: true,
        TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
    } as ExportModel;
}

export function buildImportExport(
    type: ImportTypeModel | undefined,
    values: ExportValueModel[],
    instance: ImportInstancesModel | undefined,
): ExportModel {
    if (instance === undefined || type === undefined) {
        throw new Error('undefined values');
    }
    return {
        TimePath: 'time',
        Values: values,
        EntityName: instance.id,
        Filter: instance.id,
        FilterType: 'import_id',
        ServiceName: type.name,
        Topic: instance.kafka_topic,
        Offset: 'smallest',
        Generated: true,
        TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
    } as ExportModel;
}

/** A generated export, deployment or schedule that could not be created; the save must not store the widget. */
export class SaveStepFailure {
    constructor(
        readonly step: 'export' | 'process deployment' | 'schedule',
        readonly elementName: string,
    ) {}
}

/** v2postDeployments answers 500 with an empty id when the request failed. */
export function isFailedDeployment(deployment: { status: number; id: string }): boolean {
    return deployment.status >= 400 || !deployment.id;
}
