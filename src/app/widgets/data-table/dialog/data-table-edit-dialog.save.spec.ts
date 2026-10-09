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

import {
    buildImportExport,
    buildPipelineOperatorExport,
    GENERATED_DEPLOYMENT_SVG,
    generatedDeploymentXml,
    generatedScheduleCron,
} from './data-table-edit-dialog.save';
import { ExportValueTypes } from '../shared/data-table.model';
import { ExportValueModel } from '../../../modules/exports/shared/export.model';
import { PipelineModel, PipelineOperatorModel } from '../../../modules/data/pipeline-registry/shared/pipeline.model';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';

describe('data-table-edit-dialog.save', () => {
    describe('generatedScheduleCron', () => {
        it('starts the first element at second 0', () => {
            expect(generatedScheduleCron(60, 4, 0)).toBe('0/60 * * * * *');
        });

        it('spreads the elements evenly over the refresh time', () => {
            expect([0, 1, 2, 3].map((i) => generatedScheduleCron(60, 4, i))).toEqual([
                '0/60 * * * * *',
                '15/60 * * * * *',
                '30/60 * * * * *',
                '45/60 * * * * *',
            ]);
        });

        it('rounds the start second to the nearest integer', () => {
            expect([0, 1, 2].map((i) => generatedScheduleCron(10, 3, i))).toEqual([
                '0/10 * * * * *',
                '3/10 * * * * *',
                '7/10 * * * * *',
            ]);
        });

        it('does not spread a wildcard refresh time', () => {
            expect(generatedScheduleCron('*', 3, 2)).toBe('* * * * * *');
        });
    });

    describe('generatedDeploymentXml', () => {
        const xml = generatedDeploymentXml({ id: 'f1', name: 'getTemperature', concept_id: 'c1' }, 'a1');

        it('is a well-formed BPMN process with one external task named after the function', () => {
            const doc = new DOMParser().parseFromString(xml, 'application/xml');
            expect(doc.getElementsByTagName('parsererror').length).toBe(0);
            const task = doc.getElementsByTagName('bpmn:serviceTask');
            expect(task.length).toBe(1);
            expect(task[0].getAttribute('name')).toBe('getTemperature');
            expect(task[0].getAttribute('camunda:type')).toBe('external');
            expect(task[0].getAttribute('camunda:topic')).toBe('pessimistic');
            expect(doc.getElementsByTagName('bpmn:process')[0].getAttribute('id')).toBe('generatedByProcessStatusWidget');
        });

        it('carries function and aspect in the task payload', () => {
            const doc = new DOMParser().parseFromString(xml, 'application/xml');
            const payload = JSON.parse(doc.getElementsByTagName('camunda:inputParameter')[0].textContent as string);
            expect(payload.function).toEqual({
                id: 'f1',
                name: 'getTemperature',
                concept_id: 'c1',
                rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
            });
            expect(payload.aspect).toEqual({ id: 'a1', name: 'aspect', rdf_type: 'https://senergy.infai.org/ontology/Aspect' });
            expect(payload.label).toBe('getFunction');
            expect(payload.retries).toBe(0);
        });

        it('keeps the output mapping and the xml declaration', () => {
            expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions ')).toBeTrue();
            expect(xml).toContain('<camunda:outputParameter name="outputs">${result}</camunda:outputParameter>');
        });
    });

    describe('GENERATED_DEPLOYMENT_SVG', () => {
        it('is a well-formed svg with the GENERATED! label', () => {
            const svg = GENERATED_DEPLOYMENT_SVG.replace(/<!DOCTYPE[^>]*>\n/, '');
            const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
            expect(doc.getElementsByTagName('parsererror').length).toBe(0);
            expect(doc.documentElement.getAttribute('viewBox')).toBe('254 74 112 92');
            expect(doc.getElementsByTagName('tspan')[0].textContent).toBe('GENERATED!');
            expect(GENERATED_DEPLOYMENT_SVG.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<!-- created with bpmn-js / http://bpmn.io -->\n')).toBeTrue();
        });
    });

    describe('buildPipelineOperatorExport', () => {
        const pipeline = { id: 'p1', name: 'pipe' } as PipelineModel;
        const operator = { id: 'o1', name: 'op' } as PipelineOperatorModel;

        it('describes the operator output as an export', () => {
            expect(buildPipelineOperatorExport(pipeline, operator, 'out', 'analytics.out', ExportValueTypes.FLOAT)).toEqual({
                Name: 'pipe_op',
                TimePath: 'time',
                Values: [{ Name: 'out', Path: 'analytics.out', Type: ExportValueTypes.FLOAT }],
                EntityName: 'o1',
                Filter: 'p1:o1',
                FilterType: 'operatorId',
                ServiceName: 'op',
                Topic: 'analytics-op',
                Offset: 'largest',
                Generated: true,
                TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
            } as any);
        });

        it('throws for any undefined input', () => {
            expect(() => buildPipelineOperatorExport(undefined, operator, 'n', 'p', ExportValueTypes.FLOAT)).toThrowError('undefined values');
            expect(() => buildPipelineOperatorExport(pipeline, undefined, 'n', 'p', ExportValueTypes.FLOAT)).toThrowError('undefined values');
            expect(() => buildPipelineOperatorExport(pipeline, operator, undefined, 'p', ExportValueTypes.FLOAT)).toThrowError('undefined values');
            expect(() => buildPipelineOperatorExport(pipeline, operator, 'n', undefined, ExportValueTypes.FLOAT)).toThrowError('undefined values');
            expect(() => buildPipelineOperatorExport(pipeline, operator, 'n', 'p', undefined)).toThrowError('undefined values');
        });
    });

    describe('buildImportExport', () => {
        const type = { name: 'importType' } as ImportTypeModel;
        const instance = { id: 'i1', kafka_topic: 'topic' } as ImportInstancesModel;
        const values = [{ Name: 'v', Path: 'value.v', Type: ExportValueTypes.INTEGER, InstanceID: '' }] as ExportValueModel[];

        it('describes the import instance as an export', () => {
            expect(buildImportExport(type, values, instance)).toEqual({
                TimePath: 'time',
                Values: values,
                EntityName: 'i1',
                Filter: 'i1',
                FilterType: 'import_id',
                ServiceName: 'importType',
                Topic: 'topic',
                Offset: 'smallest',
                Generated: true,
                TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
            } as any);
        });

        it('throws when type or instance is unknown', () => {
            expect(() => buildImportExport(undefined, values, instance)).toThrowError('undefined values');
            expect(() => buildImportExport(type, values, undefined)).toThrowError('undefined values');
        });
    });
});
