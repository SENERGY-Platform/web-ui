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

import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DeployFlowComponent } from './deploy-flow.component';
import { ParserService } from '../shared/parser.service';
import { DeviceInstancesService } from '../../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceGroupsService } from '../../../devices/device-groups/shared/device-groups.service';
import { PathOptionsService } from '../shared/path-options.service';
import { PipelineRegistryService } from '../../pipeline-registry/shared/pipeline-registry.service';
import { ConceptsService } from '../../../metadata/concepts/shared/concepts.service';
import { OperatorRepoService } from '../../operator-repo/shared/operator-repo.service';
import { ImportInstancesService } from '../../../imports/import-instances/shared/import-instances.service';
import { FlowEngineService } from '../shared/flow-engine.service';
import { AspectClassesService } from '../../../metadata/aspects/shared/aspect-classes.service';
import { PipelineModel } from '../../pipeline-registry/shared/pipeline.model';
import { ParseModel } from '../shared/parse.model';
import { PipelineRequestModel } from './shared/pipeline-request.model';

/** Pins the request startPipeline hands to the flow engine, and where it navigates afterwards. */
describe('DeployFlowComponent pipeline request', () => {
    const importId = 'urn:infai:ses:import:i1';
    const groupId = 'urn:infai:ses:device-group:g1';
    const path = (servicePath: string) => ({ serviceId: 'urn:infai:ses:service:s1', path: servicePath });

    let component: DeployFlowComponent;
    let flowEngineService: Spy<FlowEngineService>;
    let router: Spy<Router>;
    let snackBar: Spy<MatSnackBar>;

    const nodeModels: ParseModel[] = [
        {
            id: 'op1', name: 'Operator 1', inPorts: ['in1', 'in2', 'in3'], deploymentType: 'cloud', operatorId: 'operator-1',
            config: [{ name: 'threshold', type: 'string' }, { name: 'unit', type: 'string' }],
        } as unknown as ParseModel,
        { id: 'op2', name: 'Operator 2', inPorts: ['x'], deploymentType: 'local', operatorId: 'operator-2', config: [] } as unknown as ParseModel,
    ];

    function init(options: { edit?: boolean; next?: string } = {}) {
        const parserService = createSpyFromClass(ParserService);
        parserService.getInputs.and.returnValue(of(nodeModels));
        const deviceInstancesService = createSpyFromClass(DeviceInstancesService);
        deviceInstancesService.getDeviceInstancesWithDeviceType.and.returnValue(of({ result: [], total: 0 }));
        const pipelineRegistryService = createSpyFromClass(PipelineRegistryService);
        pipelineRegistryService.getPipelines.and.returnValue(of([]));
        pipelineRegistryService.getPipeline.and.returnValue(of({
            id: 'p1', flowId: 'flow', name: 'Saved', description: '',
            operators: [{ id: 'op1', inputTopics: [], inputSelections: [] }, { id: 'op2', inputTopics: [], inputSelections: [] }],
        } as unknown as PipelineModel));
        const importInstancesService = createSpyFromClass(ImportInstancesService);
        importInstancesService.listImportInstances.and.returnValue(of([]));
        const aspectClassesService = createSpyFromClass(AspectClassesService);
        aspectClassesService.userHasReadAuthorization.and.returnValue(false);
        const deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspects.and.returnValue(of([]));
        flowEngineService = createSpyFromClass(FlowEngineService);
        flowEngineService.startPipeline.and.returnValue(of({}));
        flowEngineService.updatePipeline.and.returnValue(of(true));
        router = createSpyFromClass(Router);
        snackBar = createSpyFromClass(MatSnackBar);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [ReactiveFormsModule, DeployFlowComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: MatSnackBar, useValue: snackBar },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: of(options.edit ? [{ path: 'edit' }, { path: 'p1' }] : [{ path: 'deploy' }, { path: 'flow' }]),
                        queryParams: of(options.next === undefined ? {} : { next: options.next }),
                        snapshot: { paramMap: { get: () => (options.edit ? 'p1' : 'flow') } },
                    },
                },
                { provide: ParserService, useValue: parserService },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: PathOptionsService, useValue: { getPathOptionsLocal: () => [], getPathOptionsLocalImport: () => ({ json_path: [] }) } },
                { provide: PipelineRegistryService, useValue: pipelineRegistryService },
                { provide: ConceptsService, useValue: createSpyFromClass(ConceptsService) },
                { provide: OperatorRepoService, useValue: createSpyFromClass(OperatorRepoService) },
                { provide: ImportInstancesService, useValue: importInstancesService },
                { provide: FlowEngineService, useValue: flowEngineService },
                { provide: AspectClassesService, useValue: aspectClassesService },
            ],
        });
        TestBed.overrideTemplate(DeployFlowComponent, '');
        const fixture = TestBed.createComponent(DeployFlowComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.form.patchValue({ name: 'Pipeline', description: 'Desc', mergeStrategy: 'outer' });
    }

    const node = (n: number) => component.getSubElementAsGroupArray(component.form, 'nodes')[n];
    const input = (n: number, i: number) => component.getSubElementAsGroupArray(node(n), 'inputs')[i];

    /** Sets the selection of an input without running the selectable logic that would reset the filter. */
    function select(n: number, i: number, selectableId: string | null, filter: [string, { serviceId: string; path: string }[]][], aspectIds: string[] = []) {
        const group = input(n, i);
        group.controls.selectableId.setValue(selectableId, { emitEvent: false });
        group.controls.filter.setValue(new Map(filter), { emitEvent: false });
        group.controls.aspectIds.setValue(aspectIds, { emitEvent: false });
        group.controls.functionId.setValue('fn', { emitEvent: false });
        group.controls.characteristics.setValue(['c1'], { emitEvent: false });
    }

    function pipelineOf(n: number, i: number, pipelineId: string, operatorId: string, topic: string, valuePath: string) {
        component.addPipeline(input(n, i), pipelineId, operatorId, valuePath);
        const group = component.getSubElementAsGroupArray(input(n, i), 'pipelines').at(-1) as FormGroup;
        group.patchValue({ topic, path: valuePath });
    }

    function request(): PipelineRequestModel {
        component.startPipeline();
        const spy = component.editMode ? flowEngineService.updatePipeline : flowEngineService.startPipeline;
        expect(spy).toHaveBeenCalledTimes(1);
        return spy.calls.mostRecent().args[0] as PipelineRequestModel;
    }

    it('builds the top level and the node fields of a new pipeline', () => {
        init();
        component.form.patchValue({ windowTime: '45', consume_all_msgs: true });
        node(0).controls.persistData.setValue(true);
        node(0).controls.configs.at(0).patchValue({ value: '5' });
        node(0).controls.configs.at(1).patchValue({ value: 'kWh' });
        const req = request();
        expect(req.id).toBeNull();
        expect(req.flowId).toBe('flow');
        expect(req.name).toBe('Pipeline');
        expect(req.description).toBe('Desc');
        expect(req.windowTime).toBe(45);
        expect(req.mergeStrategy).toBe('outer');
        expect(req.metrics).toBe(true);
        expect(req.consumeAllMessages).toBe(true);
        expect(req.nodes.length).toBe(2);
        expect(req.nodes[0].nodeId).toBe('op1');
        expect(req.nodes[0].deploymentType).toBe('cloud');
        expect(req.nodes[0].persistData).toBe(true);
        expect(req.nodes[0].config).toEqual([{ name: 'threshold', value: '5' }, { name: 'unit', value: 'kWh' }]);
        expect(req.nodes[1].nodeId).toBe('op2');
        expect(req.nodes[1].persistData).toBe(false);
        expect(req.nodes[1].config).toEqual([]);
    });

    it('parses the default window time number', () => {
        init();
        expect(request().windowTime).toBe(30);
    });

    it('sends the input selections of every input, in order', () => {
        init();
        select(0, 0, 'd1', [['d1', [path('p')]]], ['urn:infai:ses:aspect:water', 'urn:infai:ses:aspect:air']);
        select(0, 1, groupId, []);
        const selections = request().nodes[0].inputSelections;
        expect(selections?.map((s) => s.inputName)).toEqual(['in1', 'in2', 'in3']);
        expect(selections?.[0]).toEqual({
            inputName: 'in1', aspectId: 'urn:infai:ses:aspect:air', aspectIds: ['urn:infai:ses:aspect:air', 'urn:infai:ses:aspect:water'],
            characteristicIds: ['c1'], functionId: 'fn', selectableId: 'd1',
        });
        expect(selections?.[1].selectableId).toBe(groupId);
        expect(selections?.[1].aspectId).toBeNull();
        expect('aspectIds' in (selections?.[1] as object)).toBe(false);
    });

    it('sends one device input per topic with the service id colons replaced and the id modifier trimmed', () => {
        init();
        select(0, 0, 'urn:infai:ses:device:d1', [['urn:infai:ses:device:d1$mod', [path('value.temp')]]]);
        expect(request().nodes[0].inputs).toEqual([{
            filterType: 'deviceId',
            filterIds: 'urn:infai:ses:device:d1',
            topicName: 'urn_infai_ses_service_s1',
            values: [{ name: 'in1', path: 'value.temp' }],
        }]);
    });

    it('sends one input per service of a device and one value per filter', () => {
        init();
        const second = { serviceId: 'urn:infai:ses:service:s2', path: 'value.hum' };
        select(0, 0, 'd1', [['d1', [path('value.temp'), second]]]);
        expect(request().nodes[0].inputs).toEqual([
            { filterType: 'deviceId', filterIds: 'd1', topicName: 'urn_infai_ses_service_s1', values: [{ name: 'in1', path: 'value.temp' }] },
            { filterType: 'deviceId', filterIds: 'd1', topicName: 'urn_infai_ses_service_s2', values: [{ name: 'in1', path: 'value.hum' }] },
        ]);
    });

    it('joins the devices of a device group that share topic and value into one input', () => {
        init();
        select(0, 0, groupId, [['d1', [path('value.temp')]], ['d2', [path('value.temp')]], ['d3', [path('value.other')]]]);
        const req = request();
        expect(req.nodes[0].inputSelections?.[0].selectableId).toBe(groupId);
        expect(req.nodes[0].inputs).toEqual([
            { filterType: 'deviceId', filterIds: 'd1,d2', topicName: 'urn_infai_ses_service_s1', values: [{ name: 'in1', path: 'value.temp' }] },
            { filterType: 'deviceId', filterIds: 'd3', topicName: 'urn_infai_ses_service_s1', values: [{ name: 'in1', path: 'value.other' }] },
        ]);
    });

    it('joins the values of inputs that read the same devices on the same topic', () => {
        init();
        select(0, 0, groupId, [['d1', [path('value.a')]], ['d2', [path('value.a')]]]);
        select(0, 1, groupId, [['d1', [path('value.b')]], ['d2', [path('value.b')]]]);
        expect(request().nodes[0].inputs).toEqual([{
            filterType: 'deviceId',
            filterIds: 'd1,d2',
            topicName: 'urn_infai_ses_service_s1',
            values: [{ name: 'in1', path: 'value.a' }, { name: 'in2', path: 'value.b' }],
        }]);
    });

    it('does not join device sets that differ or topics that differ', () => {
        init();
        select(0, 0, 'd1', [['d1', [path('value.a')]]]);
        select(0, 1, 'd2', [['d2', [{ serviceId: 'urn:infai:ses:service:s2', path: 'value.b' }]]]);
        const inputs = request().nodes[0].inputs;
        expect(inputs?.map((i) => [i.filterIds, i.topicName])).toEqual([
            ['d1', 'urn_infai_ses_service_s1'],
            ['d2', 'urn_infai_ses_service_s2'],
        ]);
    });

    it('does not repeat a device or a value that two inputs both name', () => {
        init();
        select(0, 0, groupId, [['d1', [path('value.a')]], ['d2', [path('value.a')]]]);
        select(0, 1, groupId, [['d2', [path('value.a')]], ['d3', [path('value.a')]]]);
        component.getSubElementAsGroupArray(node(0), 'inputs')[1].controls.name.setValue('in1');
        expect(request().nodes[0].inputs).toEqual([{
            filterType: 'deviceId',
            filterIds: 'd1,d2,d3',
            topicName: 'urn_infai_ses_service_s1',
            values: [{ name: 'in1', path: 'value.a' }],
        }]);
    });

    it('marks inputs of an import as ImportId, from the type of the first id', () => {
        init();
        select(0, 0, importId, [[importId, [{ serviceId: 'urn:infai:ses:import-type:t1', path: 'value.x' }]]]);
        expect(request().nodes[0].inputs).toEqual([{
            filterType: 'ImportId',
            filterIds: importId,
            topicName: 'urn_infai_ses_import-type_t1',
            values: [{ name: 'in1', path: 'value.x' }],
        }]);
    });

    it('sends a pipeline input as operatorId filter with operator:pipeline ids', () => {
        init();
        select(0, 0, null, []);
        pipelineOf(0, 0, 'pipe1', 'opA', 'analytics-A', 'value.x');
        expect(request().nodes[0].inputs).toEqual([
            { filterType: 'operatorId', filterIds: 'opA:pipe1', topicName: 'analytics-A', values: [{ name: 'in1', path: 'value.x' }] },
        ]);
    });

    it('joins pipeline operators that share topic and value, without repeating one', () => {
        init();
        select(0, 0, null, []);
        pipelineOf(0, 0, 'pipe1', 'opA', 'analytics-A', 'value.x');
        pipelineOf(0, 0, 'pipe2', 'opB', 'analytics-A', 'value.x');
        pipelineOf(0, 0, 'pipe1', 'opA', 'analytics-A', 'value.x');
        expect(request().nodes[0].inputs).toEqual([
            { filterType: 'operatorId', filterIds: 'opA:pipe1,opB:pipe2', topicName: 'analytics-A', values: [{ name: 'in1', path: 'value.x' }] },
        ]);
    });

    it('joins the values of inputs that read the same pipeline operators', () => {
        init();
        select(0, 0, null, []);
        select(0, 1, null, []);
        pipelineOf(0, 0, 'pipe1', 'opA', 'analytics-A', 'value.x');
        pipelineOf(0, 1, 'pipe1', 'opA', 'analytics-A', 'value.y');
        expect(request().nodes[0].inputs).toEqual([
            {
                filterType: 'operatorId', filterIds: 'opA:pipe1', topicName: 'analytics-A',
                values: [{ name: 'in1', path: 'value.x' }, { name: 'in2', path: 'value.y' }],
            },
        ]);
    });

    it('puts pipeline inputs before device inputs and builds every node on its own', () => {
        init();
        select(0, 0, 'd1', [['d1', [path('value.a')]]]);
        select(0, 1, null, []);
        pipelineOf(0, 1, 'pipe1', 'opA', 'analytics-A', 'value.x');
        select(1, 0, importId, [[importId, [{ serviceId: 'urn:infai:ses:import-type:t1', path: 'value.i' }]]]);
        const req = request();
        expect(req.nodes[0].inputs?.map((i) => i.filterType)).toEqual(['operatorId', 'deviceId']);
        expect(req.nodes[1].inputs?.map((i) => i.filterType)).toEqual(['ImportId']);
    });

    it('sends even without a name, because the reset form carries no validator', () => {
        init();
        component.form.patchValue({ name: '' });
        expect(request().name).toBe('');
        expect(component.form.touched).toBeTrue();
    });

    it('starts a new pipeline and goes to the pipeline list', () => {
        init();
        request();
        expect(flowEngineService.updatePipeline).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline started');
    });

    it('stays on the form and names the action when starting the pipeline failed', () => {
        init();
        flowEngineService.startPipeline.and.returnValue(of(null));
        request();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledOnceWith('The pipeline could not be started', 'close', { panelClass: 'snack-bar-error' });
        expect(component.ready).toBeTrue();
    });

    it('stays on the form and names the action when updating the pipeline failed', () => {
        init({ edit: true, next: 'a,b' });
        flowEngineService.updatePipeline.and.returnValue(of(null));
        request();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledOnceWith('The pipeline could not be updated', 'close', { panelClass: 'snack-bar-error' });
        expect(component.ready).toBeTrue();
    });

    it('updates an edited pipeline under its id and goes to the pipeline list', () => {
        init({ edit: true });
        const req = request();
        expect(req.id).toBe('p1');
        expect(req.flowId).toBe('flow');
        expect(flowEngineService.startPipeline).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline updated');
    });

    it('goes on to the next pipeline of the update chain', () => {
        init({ edit: true, next: 'a,b,c' });
        request();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/data/pipelines/edit/a?next=b,c');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline updated, preparing next update...');
    });

    it('goes on to the last pipeline of the update chain without a next list', () => {
        init({ edit: true, next: 'a' });
        request();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/data/pipelines/edit/a');
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline updated, preparing next update...');
    });
});
