/*
 * Copyright 2026 InfAI (CC SES)
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { EditSmartServiceTaskDialogComponent } from './edit-smart-service-task-dialog.component';
import { ProcessRepoService } from '../../../../processes/process-repo/shared/process-repo.service';
import { DeploymentsService } from '../../../../processes/deployments/shared/deployments.service';
import { FlowRepoService } from '../../../../data/flow-repo/shared/flow-repo.service';
import { ParserService } from '../../../../data/flow-repo/shared/parser.service';
import { ImportTypesService } from '../../../../imports/import-types/shared/import-types.service';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { SmartServiceTaskDescription, SmartServiceTaskInputDescription } from '../../shared/designer.model';
import { ParseModel } from '../../../../data/flow-repo/shared/parse.model';
import { BpmnElement } from '../../../../processes/designer/shared/designer.model';
import { V2DeploymentsPreparedModel } from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import { ImportTypeModel } from '../../../../imports/import-types/shared/import-types.model';

interface Setup {
    topic: string;
    inputs: SmartServiceTaskInputDescription[];
    element?: unknown;
    prepared?: V2DeploymentsPreparedModel | null;
    flowOperators?: ParseModel[];
    importType?: ImportTypeModel;
}

const text = (name: string, value: string): SmartServiceTaskInputDescription => ({ name, type: 'text', value });
const modelId = '12345678-1234-1234-1234-123456789012';

describe('EditSmartServiceTaskDialogComponent saved output', () => {
    let component: EditSmartServiceTaskDialogComponent;
    let dialogRef: Spy<MatDialogRef<EditSmartServiceTaskDialogComponent>>;
    let fixture: ComponentFixture<EditSmartServiceTaskDialogComponent>;
    let deploymentsService: Spy<DeploymentsService>;

    function init(setup: Setup) {
        dialogRef = createSpyFromClass<MatDialogRef<EditSmartServiceTaskDialogComponent>>(MatDialogRef);
        const deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspectNodesWithFunctionOfDevicesOnly.and.returnValue(of([]));
        const functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(of({ result: [], total: 0 }));
        const deviceClassesService = createSpyFromClass(DeviceClassesService);
        deviceClassesService.getDeviceClasses.and.returnValue(of({ result: [], total: 0 }));
        const flowRepoService = createSpyFromClass(FlowRepoService);
        flowRepoService.getFlows.and.returnValue(of({ flows: [] }));
        flowRepoService.getFlow.and.returnValue(of(null));
        const parserService = createSpyFromClass(ParserService);
        parserService.getInputs.and.returnValue(of(setup.flowOperators || []));
        const importTypesService = createSpyFromClass(ImportTypesService);
        importTypesService.listImportTypes.and.returnValue(of({ result: [], total: 0 }));
        if (setup.importType) {
            importTypesService.getImportType.and.returnValue(of(setup.importType) as Observable<ImportTypeModel>);
        }
        const processRepo = createSpyFromClass(ProcessRepoService);
        processRepo.getProcessModels.and.returnValue(of({ result: [], total: 0 }) as never);
        deploymentsService = createSpyFromClass(DeploymentsService);
        deploymentsService.getPreparedDeployments.and.returnValue(of(setup.prepared ?? null));

        const info: SmartServiceTaskDescription = { name: 'task', topic: setup.topic, inputs: setup.inputs, outputs: [], smartServiceInputs: { inputs: [] } };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [EditSmartServiceTaskDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { info, element: setup.element || { id: 'task', incoming: [] } as unknown as BpmnElement } },
                { provide: ProcessRepoService, useValue: processRepo },
                { provide: DeploymentsService, useValue: deploymentsService },
                { provide: FlowRepoService, useValue: flowRepoService },
                { provide: ParserService, useValue: parserService },
                { provide: ImportTypesService, useValue: importTypesService },
                { provide: FunctionsService, useValue: functionsService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: DeviceClassesService, useValue: deviceClassesService },
            ],
        });
        TestBed.overrideTemplate(EditSmartServiceTaskDialogComponent, '');
        fixture = TestBed.createComponent(EditSmartServiceTaskDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(); // runs ngOnInit
    }

    const saved = () => {
        component.ok();
        return dialogRef.close.calls.mostRecent().args[0] as SmartServiceTaskDescription;
    };
    const savedInputs = () => saved().inputs.map((input) => [input.name, input.value]);

    describe('process_deployment', () => {
        const prepared = {
            id: modelId,
            name: 'Prepared name',
            start_parameter: [{ id: 'p1', default: 'd1' }],
            elements: [
                { bpmn_id: 'task1', name: 'T', task: { parameter: { a: 'x', b: '${v}' }, selection: {} } },
                { bpmn_id: 'msg1', name: 'M', message_event: { use_marshaller: true, selection: {} } },
                { bpmn_id: 'cond1', name: 'C', conditional_event: { variables: { v1: 'e1' }, selection: {} } },
                { bpmn_id: 'time1', name: 'Ti', time_event: { time: 'PT5S' } },
            ],
        } as unknown as V2DeploymentsPreparedModel;

        it('rewrites result.inputs from the prepared deployment, keeps known values and drops everything it does not list', () => {
            init({
                topic: 'process_deployment',
                prepared,
                inputs: [
                    text('process_deployment.process_model_id', modelId),
                    text('process_deployment.module_data', '{"k":1}'),
                    text('process_deployment.on_incident.restart', 'true'),
                    text('process_deployment.task1.parameter.a', 'edited'),
                    text('process_deployment.stale.selection', '{"old":1}'),
                    text('process_deployment_start.process_deployment_id', 'other-topic'),
                ],
            });
            expect(deploymentsService.getPreparedDeployments).toHaveBeenCalledWith(modelId);
            expect(component.result.inputs.map((input) => [input.name, input.value])).toEqual([
                ['process_deployment.process_model_id', modelId],
                ['process_deployment.name', 'Prepared name'],
                ['process_deployment.module_data', '{"k":1}'],
                ['process_deployment.prefer_fog_deployment', 'false'],
                ['process_deployment.on_incident.restart', 'true'],
                ['process_deployment.on_incident.notify', 'true'],
                ['process_deployment.start_parameter.default.p1', 'd1'],
                ['process_deployment.task1.selection', '{}'],
                ['process_deployment.task1.parameter.a', 'edited'],
                ['process_deployment.msg1.selection', '{}'],
                ['process_deployment.msg1.event.flow_id', ''],
                ['process_deployment.msg1.event.value', ''],
                ['process_deployment.msg1.event.use_marshaller', 'true'],
                ['process_deployment.cond1.selection', '{}'],
                ['process_deployment.cond1.variables.v1', 'e1'],
                ['process_deployment.time1.time', 'PT5S'],
            ]);
        });

        it('saves only the process_deployment inputs, in that order', () => {
            init({ topic: 'process_deployment', prepared, inputs: [text('process_deployment.process_model_id', modelId), text('info.key', 'dropped')] });
            expect(savedInputs().map(([name]) => name)).toEqual([
                'process_deployment.process_model_id',
                'process_deployment.name',
                'process_deployment.module_data',
                'process_deployment.prefer_fog_deployment',
                'process_deployment.on_incident.restart',
                'process_deployment.on_incident.notify',
                'process_deployment.start_parameter.default.p1',
                'process_deployment.task1.selection',
                'process_deployment.task1.parameter.a',
                'process_deployment.msg1.selection',
                'process_deployment.msg1.event.flow_id',
                'process_deployment.msg1.event.value',
                'process_deployment.msg1.event.use_marshaller',
                'process_deployment.cond1.selection',
                'process_deployment.cond1.variables.v1',
                'process_deployment.time1.time',
            ]);
        });
    });

    describe('process_deployment_start', () => {
        it('writes the deployment id first, then every input as a key', () => {
            init({
                topic: 'process_deployment_start',
                inputs: [
                    text('process_deployment_start.input.a', '1'),
                    text('process_deployment_start.process_deployment_id', 'dep'),
                    text('process_deployment_start.input.b', ''),
                    text('info.key', 'dropped'),
                ],
            });
            expect(savedInputs()).toEqual([
                ['process_deployment_start.process_deployment_id', 'dep'],
                ['process_deployment_start.input.a', '1'],
                ['process_deployment_start.input.b', ''],
            ]);
        });

        it('writes an empty deployment id when none was stored, and follows added and removed inputs', () => {
            init({ topic: 'process_deployment_start', inputs: [] });
            component.addProcessStartInput();
            component.processStart.inputs[0].key = 'k';
            component.addProcessStartInput();
            component.removeProcessStartInput(1);
            expect(savedInputs()).toEqual([
                ['process_deployment_start.process_deployment_id', ''],
                ['process_deployment_start.input.k', ''],
            ]);
        });
    });

    describe('analytics', () => {
        const operators = [{ id: 'op1', name: 'Op', inPorts: ['in'], config: [{ name: 'c' }] }] as unknown as ParseModel[];

        it('fills the missing inputs of the flow, keeps stored values and saves only analytics inputs', () => {
            init({
                topic: 'analytics',
                flowOperators: operators,
                inputs: [
                    text('analytics.flow_id', 'f1'),
                    text('analytics.name', 'My pipeline'),
                    text('analytics.conf.op1.c', 'cv'),
                    text('analytics.criteria.op1.in', '[{"interaction":"request"}]'),
                    text('info.key', 'dropped'),
                ],
            });
            expect(savedInputs()).toEqual([
                ['analytics.flow_id', 'f1'],
                ['analytics.name', 'My pipeline'],
                ['analytics.desc', ''],
                ['analytics.window_time', '30'],
                ['analytics.merge_strategy', 'inner'],
                ['analytics.consume_all_messages', 'false'],
                ['analytics.persistData.op1', 'false'],
                ['analytics.selection.op1.in', '{}'],
                ['analytics.criteria.op1.in', '[{"interaction":"request"}]'],
                ['analytics.service_criteria.op1.in', '[]'],
                ['analytics.conf.op1.c', 'cv'],
            ]);
        });

        it('inserts the default input when the template getter reads a missing field, and saves it', () => {
            init({ topic: 'analytics', inputs: [] });
            expect(component.analyticsMergeStrategy).toBe('inner');
            expect(component.analyticsWindowTime).toBe(30);
            expect(savedInputs()).toEqual([
                ['analytics.flow_id', ''], // inserted by the constructor reading the flow id
                ['analytics.merge_strategy', 'inner'],
                ['analytics.window_time', '30'],
            ]);
        });
    });

    describe('export', () => {
        it('writes the stored request normalised through JSON, and nothing else', () => {
            init({ topic: 'export', inputs: [text('export.request', '{ "Name": "n", "Values": [ { "Name": "a", "Path": "p" } ] }'), text('export.other', 'dropped')] });
            expect(savedInputs()).toEqual([['export.request', '{"Name":"n","Values":[{"Name":"a","Path":"p"}]}']]);
        });

        it('defaults to the generated marker without a stored request', () => {
            init({ topic: 'export', inputs: [] });
            expect(savedInputs()).toEqual([['export.request', '{"generated":true}']]);
        });
    });

    describe('import', () => {
        const importType = {
            id: 'it1',
            configs: [
                { name: 'text', type: 'https://schema.org/Text', default_value: 'x' },
                { name: 'obj', type: 'https://schema.org/StructuredValue', default_value: '' },
            ],
            output: { name: 'root', sub_content_variables: [] },
        } as unknown as ImportTypeModel;

        it('writes the request with unknown configs as json objects and only non-empty overwrites', () => {
            init({
                topic: 'import',
                importType,
                inputs: [
                    text('import.request', '{"import_type_id":"it1","configs":[{"name":"text","value":"t"},{"name":"obj","value":{"a":1}}]}'),
                    text('import.config.json_overwrite.obj', '{"b":2}'),
                    text('import.config.json_overwrite.text', ''),
                ],
            });
            expect(component.importRequest.configs?.find((c) => c.name === 'obj')?.value).toBe('{"a":1}');
            expect(component.importOverwrites).toEqual([
                { config_name: 'text', json_value: '' },
                { config_name: 'obj', json_value: '{"b":2}' },
            ]);
            expect(savedInputs()).toEqual([
                ['import.request', '{"import_type_id":"it1","configs":[{"name":"text","value":"t"},{"name":"obj","value":{"a":1}}]}'],
                ['import.config.json_overwrite.obj', '{"b":2}'],
            ]);
        });

        it('defaults to an empty request', () => {
            init({ topic: 'import', inputs: [] });
            expect(savedInputs()).toEqual([['import.request', '{}']]);
        });
    });

    describe('info', () => {
        it('writes type, module data and key, with the default type', () => {
            init({ topic: 'info', inputs: [text('info.key', 'k'), text('info.module_data', '{"a":1}')] });
            expect(savedInputs()).toEqual([
                ['info.module_type', 'widget'],
                ['info.module_data', '{"a":1}'],
                ['info.key', 'k'],
            ]);
        });

        it('chunks module data by 1000 characters, numbering with a width of the chunk count plus one', () => {
            init({ topic: 'info', inputs: [] });
            component.infoModuleData = 'a'.repeat(2500);
            const inputs = saved().inputs;
            expect(inputs.map((i) => i.name)).toEqual(['info.module_type', 'info.module_data', 'info.module_data_01', 'info.module_data_02', 'info.key']);
            expect(inputs.slice(1, 4).map((i) => i.value.length)).toEqual([1000, 1000, 500]);
        });

        it('pads the number to three digits from ten chunks on, and reads the chunks back sorted', () => {
            init({ topic: 'info', inputs: [] });
            const data = Array.from({ length: 10 }, (_, i) => String(i).repeat(1000)).join('');
            component.infoModuleData = data;
            const inputs = saved().inputs;
            expect(inputs.slice(1, 11).map((i) => i.name)).toEqual([
                'info.module_data', 'info.module_data_001', 'info.module_data_002', 'info.module_data_003', 'info.module_data_004',
                'info.module_data_005', 'info.module_data_006', 'info.module_data_007', 'info.module_data_008', 'info.module_data_009',
            ]);

            TestBed.resetTestingModule();
            init({ topic: 'info', inputs: [...inputs].reverse() });
            expect(component.infoModuleData).toBe(data);
        });

        it('defaults module data when there is none stored, and does not write it when emptied', () => {
            init({ topic: 'info', inputs: [] });
            expect(component.infoModuleData).toBe('{\n\n}');
            component.infoModuleData = '';
            expect(saved().inputs.map((i) => i.name)).toEqual(['info.module_type', 'info.key']);
        });
    });

    describe('pre and postscript', () => {
        it('chunks both scripts and appends them after the topic inputs, for any topic', () => {
            init({ topic: 'export', inputs: [] });
            component.preScript = 'p'.repeat(1500);
            component.postScript = 'q'.repeat(1001);
            const inputs = saved().inputs;
            expect(inputs.map((i) => i.name)).toEqual(['export.request', 'prescript', 'prescript_01', 'postscript', 'postscript_01']);
            expect(inputs.slice(1).map((i) => i.value.length)).toEqual([1000, 500, 1000, 1]);
        });

        it('reads stored chunks back in name order and writes nothing for empty scripts', () => {
            init({ topic: 'export', inputs: [text('prescript_01', 'B'), text('prescript', 'A'), text('postscript', 'C')] });
            expect(component.preScript).toBe('AB');
            expect(component.postScript).toBe('C');
            component.preScript = '';
            component.postScript = '';
            expect(savedInputs().map(([name]) => name)).toEqual(['export.request']);
        });
    });

    describe('device_repository', () => {
        it('writes group ids, name, wait and the key when there is one', () => {
            init({
                topic: 'device_repository',
                inputs: [text('device_repository.key', 'k'), text('device_repository.name', 'n'), text('device_repository.create_device_group', 'a,b')],
            });
            expect(savedInputs()).toEqual([
                ['device_repository.create_device_group', 'a,b'],
                ['device_repository.name', 'n'],
                ['device_repository.wait', 'true'],
                ['device_repository.key', 'k'],
            ]);
        });

        it('defaults to creating a group with empty values and no key', () => {
            init({ topic: 'device_repository', inputs: [] });
            expect(component.deviceRepositoryWorkerInfo.operation).toBe('create_device_group');
            expect(savedInputs()).toEqual([
                ['device_repository.create_device_group', ''],
                ['device_repository.name', ''],
                ['device_repository.wait', 'true'],
            ]);
        });
    });

    describe('watcher', () => {
        it('writes producer, interval, hash type, procedure inputs and the criteria in that order', () => {
            init({
                topic: 'watcher',
                inputs: [
                    text('watcher.maintenance_procedure_inputs.k1', 'v1'),
                    text('watcher.watch_devices_by_criteria', '[{"interaction":"event","function_id":"f"}]'),
                    text('watcher.maintenance_procedure', 'proc'),
                    text('watcher.watch_interval', '5m'),
                    text('watcher.hash_type', 'none'),
                ],
            });
            expect(savedInputs()).toEqual([
                ['watcher.maintenance_procedure', 'proc'],
                ['watcher.watch_interval', '5m'],
                ['watcher.hash_type', 'none'],
                ['watcher.maintenance_procedure_inputs.k1', 'v1'],
                ['watcher.watch_devices_by_criteria', '[{"interaction":"event","function_id":"f"}]'],
            ]);
        });

        it('writes the request without an empty body, and switches the operation by the stored input', () => {
            init({
                topic: 'watcher',
                inputs: [text('watcher.watch_request', '{"method":"POST","endpoint":"http://e","add_auth_token":true,"body":""}')],
            });
            expect(component.watcherWorkerInfo.operation).toBe('watch_request');
            expect(savedInputs()).toEqual([
                ['watcher.maintenance_procedure', ''],
                ['watcher.watch_interval', '1h'],
                ['watcher.hash_type', 'deviceids'],
                ['watcher.watch_request', '{"method":"POST","endpoint":"http://e","add_auth_token":true}'],
            ]);
        });

        it('defaults to devices by criteria with an empty list', () => {
            init({ topic: 'watcher', inputs: [] });
            expect(savedInputs()).toEqual([
                ['watcher.maintenance_procedure', ''],
                ['watcher.watch_interval', '1h'],
                ['watcher.hash_type', 'deviceids'],
                ['watcher.watch_devices_by_criteria', '[]'],
            ]);
        });
    });

    describe('getIncomingOutputs', () => {
        const param = (name: string, value = '') => ({ name, value });
        const task = (businessObject: Record<string, unknown>, incoming: unknown[] = []) =>
            ({ id: 't', incoming, businessObject } as unknown as BpmnElement);
        const ref = (source: BpmnElement) => ({ source });
        const ext = (outputParameters: unknown[], inputParameters: unknown[] = []) => ({ values: [{ $type: 'camunda:InputOutput', outputParameters, inputParameters }] });
        const names = (map: Map<string, { name: string; label?: string; value: string }[]>) =>
            Array.from(map.entries()).map(([key, list]) => [key, list.map((p) => p.name)]);

        beforeEach(() => init({ topic: 'info', inputs: [] }));

        it('returns nothing for an element without incoming flows', () => {
            expect(component.getIncomingOutputs({ id: 'x' } as BpmnElement).size).toBe(0);
        });

        it('groups outputs by topic, labels them with the task name and collects uncategorized ones', () => {
            const a = task({ $type: 'bpmn:ServiceTask', name: 'Task A', topic: 'info', extensionElements: ext([param('o1')]) });
            const b = task({ $type: 'bpmn:ServiceTask', topic: undefined, extensionElements: ext([param('o2')]) });
            const result = component.getIncomingOutputs(task({}, [ref(a), ref(b)]));
            expect(names(result)).toEqual([['info', ['o1']], ['uncategorized', ['o2']]]);
            expect(result.get('info')?.[0].label).toBe('Task A: o1');
            expect(result.get('uncategorized')?.[0].label).toBeUndefined();
        });

        it('adds the flow of an analytics task and the import type of an import task as raw selections', () => {
            const analytics = task({
                $type: 'bpmn:ServiceTask', name: 'Ana', topic: 'analytics',
                extensionElements: ext([param('ana_out')], [param('analytics.flow_id', 'flow-1')]),
            });
            const imp = task({
                $type: 'bpmn:ServiceTask', name: 'Imp', topic: 'import',
                extensionElements: ext([param('imp_out')], [param('import.request', '{"import_type_id":"type-1"}')]),
            });
            const result = component.getIncomingOutputs(task({}, [ref(analytics), ref(imp)]));
            expect(names(result)).toEqual([
                ['analytics', ['ana_out']], ['flow_selection_raw', ['ana_out']],
                ['import', ['imp_out']], ['import_selection_raw', ['imp_out']],
            ]);
            expect(result.get('flow_selection_raw')).toEqual([{ name: 'ana_out', label: 'Ana', value: 'flow-1' }]);
            expect(result.get('import_selection_raw')).toEqual([{ name: 'imp_out', label: 'Imp', value: 'type-1' }]);
        });

        it('keeps working when the import request is not json', () => {
            spyOn(console, 'error');
            const imp = task({
                $type: 'bpmn:ServiceTask', name: 'Imp', topic: 'import',
                extensionElements: ext([param('imp_out')], [param('import.request', 'nope')]),
            });
            const result = component.getIncomingOutputs(task({}, [ref(imp)]));
            expect(names(result)).toEqual([['import', ['imp_out']]]);
            expect(console.error).toHaveBeenCalled();
        });

        it('maps a process deployment id variable to its model only for a uuid model id', () => {
            const make = (id: string) => task({
                $type: 'bpmn:ServiceTask', name: 'Dep', topic: 'process_deployment',
                extensionElements: ext([param('x_process_deployment_id')], [param('process_deployment.process_model_id', id)]),
            });
            expect(component.getIncomingOutputs(task({}, [ref(make(modelId))])).get('process_deployment_to_model'))
                .toEqual([{ name: 'x_process_deployment_id', label: '', value: modelId }]);
            expect(component.getIncomingOutputs(task({}, [ref(make('not-a-uuid'))])).has('process_deployment_to_model')).toBeFalse();
        });

        it('offers the device group selection of a device repository task as iot form field', () => {
            const repo = task({
                $type: 'bpmn:ServiceTask', name: 'Repo', topic: 'device_repository',
                extensionElements: ext([param('g_device_group_selection')], [param('device_repository.name', 'n')]),
            });
            const result = component.getIncomingOutputs(task({}, [ref(repo)]));
            expect(names(result)).toEqual([
                ['device_repository', ['g_device_group_selection']],
                ['iot_form_fields', ['g_device_group_selection']],
                ['group_iot_form_fields', ['g_device_group_selection']],
            ]);
        });

        it('reads the form fields of a start event, split by the iot property', () => {
            const start = task({
                $type: 'bpmn:StartEvent',
                extensionElements: {
                    values: [{
                        $type: 'camunda:FormData',
                        fields: [
                            { id: 'dev', label: 'Device', properties: { values: [{ id: 'iot', value: 'device, group' }] } },
                            { id: 'val', label: 'Value', properties: { values: [] } },
                        ],
                    }],
                },
            });
            const result = component.getIncomingOutputs(task({}, [ref(start)]));
            expect(names(result)).toEqual([
                ['form_fields', ['dev', 'val']],
                ['iot_form_fields', ['dev']],
                ['device_iot_form_fields', ['dev']],
                ['group_iot_form_fields', ['dev']],
                ['value_form_fields', ['val']],
            ]);
        });

        it('follows the chain upstream and ends in a cycle, listing the outputs of the element met again', () => {
            const first = task({ $type: 'bpmn:ServiceTask', name: 'First', topic: 'info', extensionElements: ext([param('o_first')]) });
            const second = task({ $type: 'bpmn:ServiceTask', name: 'Second', topic: 'info', extensionElements: ext([param('o_second')]) }, [ref(first)]);
            first.incoming = [ref(second)];
            const result = component.getIncomingOutputs(task({}, [ref(second)]));
            expect(names(result)).toEqual([['info', ['o_second', 'o_first', 'o_second']]]);
        });

        it('takes the form fields of the default start event for a start event with event definitions', () => {
            const defaultStart = {
                $type: 'bpmn:StartEvent',
                extensionElements: { values: [{ $type: 'camunda:FormData', fields: [{ id: 'f1', label: 'F1', properties: { values: [] } }] }] },
            };
            const flowElements: unknown[] = [{ $type: 'bpmn:Task' }];
            const eventStart = task({
                $type: 'bpmn:StartEvent', eventDefinitions: { $type: 'bpmn:MessageEventDefinition' },
                extensionElements: {}, $parent: { flowElements },
            });
            flowElements.push(eventStart.businessObject, defaultStart);
            const result = component.getIncomingOutputs(task({}, [ref(eventStart)]));
            expect(names(result)).toEqual([['form_fields', ['f1']], ['value_form_fields', ['f1']]]);
        });
    });

    describe('import output paths', () => {
        it('offers one selection per output path of the import type, with its characteristic', () => {
            const importElement = {
                id: 'task',
                incoming: [{
                    source: {
                        id: 'imp', incoming: [],
                        businessObject: {
                            $type: 'bpmn:ServiceTask', name: 'Imp', topic: 'import',
                            extensionElements: { values: [{ $type: 'camunda:InputOutput', outputParameters: [{ name: 'imp_out', value: '' }], inputParameters: [{ name: 'import.request', value: '{"import_type_id":"type-1"}' }] }] },
                        },
                    },
                }],
            };
            init({
                topic: 'info',
                inputs: [],
                element: importElement,
                importType: {
                    id: 'type-1', configs: [],
                    output: {
                        name: 'root',
                        sub_content_variables: [
                            { name: 'a', characteristic_id: 'c1', sub_content_variables: null },
                            { name: 'b', sub_content_variables: [{ name: 'c', characteristic_id: 'c2', sub_content_variables: [] }, { name: 'd', sub_content_variables: null }] },
                        ],
                    },
                } as unknown as ImportTypeModel,
            });
            expect(component.availableProcessVariables.get('import_selection')?.map((p) => [p.name, p.label])).toEqual([
                ['{"import_selection": {"id":"${imp_out}", "path": "a", "characteristic_id": "c1"}}', 'Imp: a'],
                ['{"import_selection": {"id":"${imp_out}", "path": "b.c", "characteristic_id": "c2"}}', 'Imp: b.c'],
                ['{"import_selection": {"id":"${imp_out}", "path": "b.d", "characteristic_id": ""}}', 'Imp: b.d'],
            ]);
            expect(component.availableProcessIotSelections.map((s) => s.name)).toEqual(['Imp: a', 'Imp: b.c', 'Imp: b.d']);
        });
    });
});
