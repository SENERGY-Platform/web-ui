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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DeployFlowComponent } from './deploy-flow.component';
import { CoreModule } from '../../../../core/core.module';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { AuthorizationServiceMock } from '../../../../core/services/authorization.service.mock';
import { DialogsService } from '../../../../core/services/dialogs.service';
import {ActivatedRoute, provideRouter} from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
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
import { DeviceTypeFunctionModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { PipelineModel } from '../../pipeline-registry/shared/pipeline.model';
import { PipelineInputSelectionModel, PipelineRequestModel } from './shared/pipeline-request.model';
import { ParseModel } from '../shared/parse.model';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

describe('DeployFlowComponent', () => {
    let component: DeployFlowComponent;
    let fixture: ComponentFixture<DeployFlowComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DeployFlowComponent],
    imports: [MatSnackBarModule,
        MatDialogModule,
        CoreModule,
        InfiniteScrollModule],
    providers: [
        provideRouter([]),
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
        { provide: AspectClassesService, useValue: createSpyFromClass(AspectClassesService) },
        DialogsService,
        {
            provide: ActivatedRoute,
            useValue: {
                url: of(['deploy', '123']),
                snapshot: {
                    paramMap: {
                        get(): string {
                            return '123';
                        },
                    },
                },
            },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(DeployFlowComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('DeployFlowComponent aspects', () => {
    const air = 'urn:infai:ses:aspect:air';
    const water = 'urn:infai:ses:aspect:water';
    const fn = (id: string): DeviceTypeFunctionModel => ({ id, name: id, concept_id: 'concept' }) as DeviceTypeFunctionModel;
    const temperature = fn('urn:infai:ses:measuring-function:temperature');
    const humidity = fn('urn:infai:ses:measuring-function:humidity');
    const pressure = fn('urn:infai:ses:measuring-function:pressure');

    let component: DeployFlowComponent;
    let deviceTypeService: Spy<DeviceTypeService>;
    let deviceInstancesService: Spy<DeviceInstancesService>;
    let flowEngineService: Spy<FlowEngineService>;
    let aspectClassesService: Spy<AspectClassesService>;
    let mayReadAspectClasses: boolean;

    beforeEach(() => {
        mayReadAspectClasses = true;
    });

    /** Opens the deploy form for a new pipeline, or for editing one whose single input was saved with the given selection. */
    function init(
        functionsByAspect: { [id: string]: DeviceTypeFunctionModel[] | Observable<DeviceTypeFunctionModel[]> },
        savedSelection?: PipelineInputSelectionModel,
    ) {
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspects.and.returnValue(of([{ id: air, name: 'Air', sub_aspects: [] }, { id: water, name: 'Water', sub_aspects: [] }]));
        deviceTypeService.getAspectsMeasuringFunctionsWithImports.and.callFake((id: string) => {
            const functions = functionsByAspect[id] || [];
            return Array.isArray(functions) ? of(functions) : functions;
        });
        deviceInstancesService = createSpyFromClass(DeviceInstancesService);
        deviceInstancesService.getDeviceInstancesWithDeviceType.and.returnValue(of({ result: [], total: 0 }));
        deviceInstancesService.getDeviceSelectionsFull.and.returnValue(of([]));
        const parseModel = { id: 'op1', name: 'Operator', inPorts: ['value'], config: [] } as unknown as ParseModel;
        const parserService = createSpyFromClass(ParserService);
        parserService.getInputs.and.returnValue(of([parseModel]));
        const pipelineRegistryService = createSpyFromClass(PipelineRegistryService);
        pipelineRegistryService.getPipelines.and.returnValue(of([]));
        pipelineRegistryService.getPipeline.and.returnValue(of({
            id: 'p1', flowId: 'flow', name: 'Pipeline', description: '',
            operators: [{ id: 'op1', inputTopics: [], inputSelections: savedSelection ? [savedSelection] : [] }],
        } as unknown as PipelineModel));
        const conceptsService = createSpyFromClass(ConceptsService);
        conceptsService.getConceptWithCharacteristics.and.returnValue(of({ characteristics: [{ id: 'c1', name: 'Celsius' }] } as any));
        const importInstancesService = createSpyFromClass(ImportInstancesService);
        importInstancesService.listImportInstances.and.returnValue(of([]));
        aspectClassesService = createSpyFromClass(AspectClassesService);
        aspectClassesService.userHasReadAuthorization.and.returnValue(mayReadAspectClasses);
        aspectClassesService.getAspectClasses.and.returnValue(of([{ id: 'urn:infai:ses:aspect-class:environment', name: 'Environment' }]));
        flowEngineService = createSpyFromClass(FlowEngineService);
        flowEngineService.startPipeline.and.returnValue(of({}));
        flowEngineService.updatePipeline.and.returnValue(of(undefined));
        const editing = savedSelection !== undefined;

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [ReactiveFormsModule],
            declarations: [DeployFlowComponent],
            providers: [
                { provide: Router, useValue: createSpyFromClass(Router) },
                { provide: MatSnackBar, useValue: createSpyFromClass(MatSnackBar) },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: of(editing ? [{ path: 'edit' }, { path: 'p1' }] : [{ path: 'deploy' }, { path: 'flow' }]),
                        queryParams: of({}),
                        snapshot: { paramMap: { get: () => (editing ? 'p1' : 'flow') } },
                    },
                },
                { provide: ParserService, useValue: parserService },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: PathOptionsService, useValue: { getPathOptionsLocal: () => [], getPathOptionsLocalImport: () => ({ json_path: [] }) } },
                { provide: PipelineRegistryService, useValue: pipelineRegistryService },
                { provide: ConceptsService, useValue: conceptsService },
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
    }

    const input = (): FormGroup => component.getSubElementAsGroupArray(component.getSubElementAsGroupArray(component.form, 'nodes')[0], 'inputs')[0];
    const functionIds = () => component.getAspectFunctions(input().get('aspectIds')?.value).map((f) => f.id);
    const requestedCriteria = () => deviceInstancesService.getDeviceSelectionsFull.calls.mostRecent().args[0];
    const savedSelections = (): PipelineInputSelectionModel[] | undefined => {
        component.form.patchValue({ name: 'Pipeline' });
        component.startPipeline();
        const spy = component.editMode ? flowEngineService.updatePipeline : flowEngineService.startPipeline;
        return (spy.calls.mostRecent().args[0] as PipelineRequestModel).nodes[0].inputSelections;
    };

    it('loads the aspect classes for the aspect selects when the user may read them', () => {
        init({});
        expect(aspectClassesService.getAspectClasses).toHaveBeenCalledTimes(1);
        expect(component.aspectClasses.map((c) => c.name)).toEqual(['Environment']);
    });

    it('requests no aspect classes and deploys with none when the user may not read them', () => {
        mayReadAspectClasses = false;
        init({});
        expect(aspectClassesService.getAspectClasses).not.toHaveBeenCalled();
        expect(component.aspectClasses).toEqual([]);
        expect(component.ready).toBeTrue();
    });

    it('offers only the functions every selected aspect offers', () => {
        init({ [air]: [temperature, humidity, pressure], [water]: [pressure, temperature] });
        input().patchValue({ aspectIds: [water, air] });
        expect(functionIds()).toEqual([temperature.id, pressure.id]);
    });

    it('offers the functions of a single aspect unchanged, and none without an aspect', () => {
        init({ [air]: [temperature, humidity] });
        input().patchValue({ aspectIds: [air] });
        expect(functionIds()).toEqual([temperature.id, humidity.id]);
        input().patchValue({ aspectIds: [] });
        expect(functionIds()).toEqual([]);
    });

    it('drops the request of a selection that has since been replaced', () => {
        const slowAir = new Subject<DeviceTypeFunctionModel[]>();
        init({ [air]: slowAir, [water]: [pressure] });
        input().patchValue({ aspectIds: [air] });
        input().patchValue({ aspectIds: [water] });
        expect(slowAir.observed).toBe(false);
        expect(functionIds()).toEqual([pressure.id]);
    });

    it('asks device-selection for every selected aspect in both spellings, sorted', () => {
        init({ [air]: [temperature], [water]: [temperature] });
        input().patchValue({ aspectIds: [water, air] });
        input().patchValue({ functionId: temperature.id, characteristics: ['c1'] });
        expect(requestedCriteria()).toEqual([{ function_id: temperature.id, aspect_id: air, aspect_ids: [air, water] }]);
    });

    it('saves a selection of one and of two aspects in both spellings, sorted', () => {
        init({ [air]: [temperature], [water]: [temperature] });
        input().patchValue({ aspectIds: [water, air], functionId: temperature.id, characteristics: ['c1'] });
        expect(savedSelections()?.[0]).toEqual(jasmine.objectContaining({ aspectId: air, aspectIds: [air, water] }));
        input().patchValue({ aspectIds: [water] });
        expect(savedSelections()?.[0]).toEqual(jasmine.objectContaining({ aspectId: water, aspectIds: [water] }));
    });

    it('saves an input without aspect with the null it had, and no list', () => {
        init({});
        const saved = savedSelections()?.[0] as PipelineInputSelectionModel;
        expect(saved.aspectId).toBeNull();
        expect('aspectIds' in saved).toBe(false);
    });

    it('restores a selection saved before the list with its single aspect', () => {
        init({ [air]: [temperature] }, {
            inputName: 'value', aspectId: air, functionId: temperature.id, characteristicIds: ['c1'], selectableId: 'd1',
        });
        expect(input().get('aspectIds')?.value).toEqual([air]);
        expect(input().get('functionId')?.value).toBe(temperature.id);
        expect(requestedCriteria()).toEqual([{ function_id: temperature.id, aspect_id: air, aspect_ids: [air] }]);
        expect(savedSelections()?.[0]).toEqual(jasmine.objectContaining({ aspectId: air, aspectIds: [air] }));
    });

    it('restores the union of inconsistent fields', () => {
        init({ [air]: [temperature], [water]: [temperature] }, {
            inputName: 'value', aspectId: water, aspectIds: [air], functionId: temperature.id, characteristicIds: ['c1'], selectableId: 'd1',
        });
        expect(input().get('aspectIds')?.value).toEqual([air, water]);
        expect(input().get('functionId')?.value).toBe(temperature.id);
    });
});
