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
import { DeployFlowClassicComponent } from './deploy-flow-component-classic.component';
import { CoreModule } from '../../../../../core/core.module';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { AuthorizationServiceMock } from '../../../../../core/services/authorization.service.mock';
import { DialogsService } from '../../../../../core/services/dialogs.service';
import {ActivatedRoute, provideRouter} from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DeviceInstancesService } from '../../../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ParserService } from '../../shared/parser.service';
import { FlowEngineService } from '../../shared/flow-engine.service';
import { ParseModel } from '../../shared/parse.model';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeServiceModel } from '../../../../metadata/device-types-overview/shared/device-type.model';

describe('DeployFlowClassicComponent', () => {
    let component: DeployFlowClassicComponent;
    let fixture: ComponentFixture<DeployFlowClassicComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [MatSnackBarModule,
                    MatDialogModule,
                    CoreModule,
                    InfiniteScrollModule, DeployFlowClassicComponent],
                providers: [
                    provideRouter([]),
                    { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                    DialogsService,
                    {
                        provide: ActivatedRoute,
                        useValue: {
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
                ],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(DeployFlowClassicComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should parse inputs', () => {
        expect(component.selectedValues).toBeTruthy();
    });
});

describe('DeployFlowClassicComponent start', () => {
    let component: DeployFlowClassicComponent;
    let flowEngine: jasmine.SpyObj<FlowEngineService>;
    let router: jasmine.SpyObj<Router>;
    let snackBar: { open: jasmine.Spy };

    beforeEach(() => {
        flowEngine = jasmine.createSpyObj<FlowEngineService>('FlowEngineService', ['startPipeline']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        snackBar = { open: jasmine.createSpy('open') };
        TestBed.configureTestingModule({
            providers: [
                { provide: FlowEngineService, useValue: flowEngine },
                { provide: Router, useValue: router },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: ParserService, useValue: { getInputs: () => of([]) } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => of({ result: [], total: 0 }) } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'flow' } } } },
            ],
        });
        TestBed.overrideTemplate(DeployFlowClassicComponent, '');
        component = TestBed.createComponent(DeployFlowClassicComponent).componentInstance;
    });

    it('goes to the pipeline list and reports success when the pipeline started', () => {
        flowEngine.startPipeline.and.returnValue(of({}));
        component.startPipeline();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Pipeline started');
    });

    it('stays and names the action when starting the pipeline failed', () => {
        flowEngine.startPipeline.and.returnValue(of(null));
        component.startPipeline();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledOnceWith('The pipeline could not be started', 'close', { panelClass: 'snack-bar-error' });
    });
});

describe('DeployFlowClassicComponent request', () => {
    const device = (id: string, localId: string) => ({ id, local_id: localId }) as DeviceInstanceModel;
    const service = { id: 'urn:infai:ses:service:s#1', local_id: 'get_value' } as DeviceTypeServiceModel;
    const inputs = [
        {
            id: 'op1', name: 'Operator 1', inPorts: ['in1', 'in2', 'in3'], deploymentType: 'cloud', operatorId: 'operator-1',
            config: [{ name: 'threshold', type: 'string' }, { name: 'unit', type: 'string' }],
        },
        { id: 'op2', name: 'Operator 2', inPorts: ['x'], deploymentType: 'local', operatorId: 'operator-2', config: undefined },
    ] as unknown as ParseModel[];

    let component: DeployFlowClassicComponent;
    let flowEngine: jasmine.SpyObj<FlowEngineService>;

    beforeEach(() => {
        flowEngine = jasmine.createSpyObj<FlowEngineService>('FlowEngineService', ['startPipeline']);
        flowEngine.startPipeline.and.returnValue(of({}));
        TestBed.configureTestingModule({
            providers: [
                { provide: FlowEngineService, useValue: flowEngine },
                { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: ParserService, useValue: { getInputs: () => of(inputs) } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => of({ result: [], total: 0 }) } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'flow' } } } },
            ],
        });
        TestBed.overrideTemplate(DeployFlowClassicComponent, '');
        component = TestBed.createComponent(DeployFlowClassicComponent).componentInstance;
    });

    const port = (nodeId: string, name: string) => component.selectedValues.get(nodeId).get(name);

    it('sends the whole request body of a new pipeline', () => {
        component.name = 'Pipeline';
        component.description = 'Desc';
        component.windowTime = '45' as unknown as number; // the input binds the text it shows
        component.allMessages = true;
        component.selectedValues.get('op1').get('_config').set('threshold', '5');
        component.selectedValues.get('op1').get('_config').set('unit', 'kWh');
        Object.assign(port('op1', 'in1'), { device: [device('urn:infai:ses:device:d1$mod', 'l1'), device('urn:infai:ses:device:d2', 'l2')], service, path: 'value.a' });
        Object.assign(port('op1', 'in2'), { device: [device('urn:infai:ses:device:d1$mod', 'l1'), device('urn:infai:ses:device:d2', 'l2')], service, path: 'value.b' });
        Object.assign(port('op2', 'x'), { device: [device('urn:infai:ses:device:d3', 'l3'), device('urn:infai:ses:device:d4', 'l4')], service, path: 'temp' });

        component.startPipeline();

        expect(flowEngine.startPipeline).toHaveBeenCalledTimes(1);
        expect(JSON.parse(JSON.stringify(flowEngine.startPipeline.calls.mostRecent().args[0]))).toEqual({
            id: null, flowId: 'flow', name: 'Pipeline', description: 'Desc', windowTime: '45', mergeStrategy: 'inner', metrics: true,
            consumeAllMessages: true,
            nodes: [
                {
                    nodeId: 'op1',
                    deploymentType: 'cloud',
                    config: [{ name: 'threshold', value: '5' }, { name: 'unit', value: 'kWh' }],
                    inputs: [
                        {
                            filterIds: 'urn:infai:ses:device:d1,urn:infai:ses:device:d2', filterType: 'devcieId', topicName: 'urn_infai_ses_service_s_1',
                            values: [{ name: 'in1', path: 'value.a' }, { name: 'in2', path: 'value.b' }],
                        },
                        { filterIds: '', filterType: 'devcieId', values: [{ name: 'in3', path: '' }] },
                    ],
                },
                {
                    nodeId: 'op2',
                    deploymentType: 'local',
                    config: [],
                    inputs: [{
                        filterIds: 'urn:infai:ses:device:d3,urn:infai:ses:device:d4', filterType: 'devcieId',
                        topicName: 'event/l3/get_value,event/l4/get_value', values: [{ name: 'x', path: 'temp' }],
                    }],
                },
            ],
        });
    });
});

describe('DeployFlowClassicComponent page', () => {
    let fixture: ComponentFixture<DeployFlowClassicComponent>;
    let flowEngine: jasmine.SpyObj<FlowEngineService>;
    let router: Router;
    const inputs = [
        { id: 'op1', name: 'Operator 1', inPorts: ['in1'], deploymentType: 'cloud', operatorId: 'operator-1', config: [{ name: 'threshold', type: 'string' }] },
    ] as unknown as ParseModel[];

    beforeEach(() => {
        flowEngine = jasmine.createSpyObj<FlowEngineService>('FlowEngineService', ['startPipeline']);
        flowEngine.startPipeline.and.returnValue(of({}));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                provideRouter([{ path: 'data/flow-repo', children: [] }]),
                { provide: FlowEngineService, useValue: flowEngine },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
                { provide: ParserService, useValue: { getInputs: () => of(inputs) } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => of({ result: [], total: 0 }) } },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'flow' } } } },
            ],
        });
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(DeployFlowClassicComponent);
        fixture.detectChanges();
    });

    const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
    const barButton = (name: string) => el('senergy-save-bar button.' + name) as HTMLButtonElement;

    it('is titled, links back to the flows and has a section per operator, without expansion panels', () => {
        expect(el('.page-title').textContent).toBe('New pipeline (classic)');
        expect(el('a.page-back').getAttribute('href')).toBe('/data/flow-repo');
        expect(Array.from(fixture.nativeElement.querySelectorAll('senergy-form-section h3') as NodeListOf<HTMLElement>).map((h) => h.textContent))
            .toEqual(['General', 'Operator 1', 'Global settings']);
        expect(fixture.nativeElement.querySelectorAll('mat-expansion-panel, mat-accordion').length).toBe(0);
    });

    it('deploys from the save bar and goes to the pipelines', () => {
        expect(barButton('save').textContent?.trim()).toBe('Deploy');

        barButton('save').click();

        expect(flowEngine.startPipeline).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
    });

    it('returns to the flows when Discard is clicked', () => {
        barButton('discard').click();

        expect(router.navigate).toHaveBeenCalledOnceWith(['/data/flow-repo']);
    });

    it('has no button that submits', () => {
        const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
        expect(buttons.length).toBe(2);
        expect(buttons.filter((b) => b.type === 'submit')).toEqual([]);
    });
});
