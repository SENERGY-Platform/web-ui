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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FlowDesignerComponent } from './flow-designer.component';
import { FlowModel } from '../flow-repo/shared/flow.model';
import { environment } from '../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { OperatorModel } from '../operator-repo/shared/operator.model';
import { OperatorRepoService } from '../operator-repo/shared/operator-repo.service';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';
import { NodeFactory } from '../diagram-editor/shared/node-factory.service';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

describe('FlowDesignerComponent', () => {
    let component: FlowDesignerComponent;
    let fixture: ComponentFixture<FlowDesignerComponent>;
    let http: HttpTestingController;
    let router: Router;
    let paperSvg: SVGElement;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                declarations: [FlowDesignerComponent],
                imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule],
                providers: [
                    provideRouter([]),
                    {
                        provide: ActivatedRoute,
                        useValue: {
                            snapshot: {
                                paramMap: {
                                    get(): string | null {
                                        return null;
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
        // saveModel() serializes the paper of the diagram editor, which is not rendered in the test
        paperSvg = document.createElementNS(SVG_NAMESPACE, 'svg');
        const layers = document.createElementNS(SVG_NAMESPACE, 'g');
        layers.setAttribute('class', 'joint-layers');
        paperSvg.appendChild(layers);
        document.body.appendChild(paperSvg);

        fixture = TestBed.createComponent(FlowDesignerComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
        component.diagram = {
            paperService: { getPaper: () => ({ svg: paperSvg }) },
            getGraph: () => ({ cells: [] }),
        } as any;
        component.flow = { name: 'my flow' } as FlowModel;
    });

    afterEach(() => {
        paperSvg.remove();
        http.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('switches to editing the flow it just created', () => {
        const navigate = spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush({ _id: 'created-flow-id' }, { status: 201, statusText: 'Created' });

        expect(component.flow._id).toEqual('created-flow-id');
        expect(navigate).toHaveBeenCalledWith(['/data/designer', 'created-flow-id']);
    });

    it('overwrites the created flow on the next save instead of creating another one', () => {
        spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush({ _id: 'created-flow-id' }, { status: 201, statusText: 'Created' });

        component.saveModel();
        const update = http.expectOne(environment.flowRepoUrl + '/flow/created-flow-id/');
        expect(update.request.method).toEqual('POST');
        update.flush(null, { status: 200, statusText: 'OK' });
    });

    it('sends the pin of a pinned node and no key for an unpinned one', () => {
        const factory = TestBed.inject(NodeFactory);
        const node = (id: string, operatorVersion?: string) => factory.createNode({
            id, name: 'op', image: 'img', inputs: ['a'], outputs: ['o'], config: [], operatorId: 'op',
            position: {x: 0, y: 0}, deploymentType: 'cloud', operatorVersion,
        }).toJSON();
        (component.diagram as any).getGraph = () => ({cells: [node('pinned', 'v1.0.0'), node('unpinned')]});
        spyOn(router, 'navigate');

        component.saveModel();
        const body = http.expectOne(environment.flowRepoUrl + '/flow/').request.body;

        const cells = JSON.parse(JSON.stringify(body.model.cells));
        expect(cells[0].operatorVersion).toBe('v1.0.0');
        expect('operatorVersion' in cells[1]).toBeFalse();
    });

    it('stays in create mode when the create response carries no id', () => {
        const navigate = spyOn(router, 'navigate');

        component.saveModel();
        http.expectOne(environment.flowRepoUrl + '/flow/').flush(null, { status: 201, statusText: 'Created' });

        expect(component.flow._id).toBeUndefined();
        expect(navigate).not.toHaveBeenCalled();
    });
});

describe('FlowDesignerComponent opening a flow', () => {
    const text = 'https://schema.org/Text';
    const io = (...names: string[]) => names.map(name => ({name, type: text}));
    let component: FlowDesignerComponent;
    let created: any[];
    let dialogOpen: jasmine.Spy;
    let snackOpen: jasmine.Spy;

    function operator(): OperatorModel {
        return {
            _id: 'op', name: 'op', image: 'img:v1.2.0', description: undefined, deploymentType: 'cloud', userId: undefined,
            inputs: io('a', 'b'), outputs: io('o'), config_values: io('c'), version: 7,
            versions: [
                {version: 'v1.0.0', image: 'img:v1.0.0', inputs: io('a'), outputs: io('o'), config_values: []},
                {version: 'v1.2.0', image: 'img:v1.2.0', inputs: io('a', 'b'), outputs: io('o'), config_values: io('c')},
            ],
        };
    }

    function cell(overrides: any) {
        return {
            id: 'n1', type: 'senergy.NodeElement', name: 'op', image: 'img', operatorId: 'op', deploymentType: 'cloud',
            inPorts: ['a'], outPorts: ['o'], config: [], position: {x: 0, y: 0}, version: 7, ...overrides,
        };
    }

    function open(cells: any[], operatorModel: OperatorModel = operator()) {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FlowDesignerComponent],
            imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'flow-1'}}}},
                {provide: OperatorRepoService, useValue: {getAllOperators: () => of({operators: [operatorModel]})}},
                {provide: FlowRepoService, useValue: {getFlow: () => of({_id: 'flow-1', name: 'f', model: {cells}})}},
            ],
        });
        const fixture = TestBed.createComponent(FlowDesignerComponent);
        component = fixture.componentInstance;
        created = [];
        component.diagram = {
            paperHeight: 600,
            prepareLink: (source: any, target: any) => ({source, target}),
            createNode: (...args: any[]) => {
                const node = {args};
                created.push(node);
                return node;
            },
            addElementsToGraph: () => undefined,
        } as any;
        dialogOpen = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({afterClosed: () => of(undefined)} as any);
        snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
        component.ngAfterViewInit();
    }

    // positional arguments of DiagramEditorComponent.createNode
    const inPorts = (node: any) => node.args[3];
    const config = (node: any) => node.args[5];
    const operatorVersion = (node: any) => node.args[10];
    const newerVersion = (node: any) => node.args[11];

    it('refreshes an unpinned node from the top level of the operator as before', async () => {
        open([cell({version: 3})]);
        await Promise.resolve();

        expect(dialogOpen).toHaveBeenCalledTimes(1);
        expect(dialogOpen.calls.mostRecent().args[1]?.data.newOperator.image).toBe('img:v1.2.0');
        expect(inPorts(created[0])).toEqual(['a', 'b']);
        expect(config(created[0])).toEqual(io('c'));
        expect(operatorVersion(created[0])).toBeUndefined();
    });

    it('refreshes a pinned node from its pinned version', async () => {
        open([cell({version: 3, operatorVersion: 'v1.0.0', inPorts: ['a', 'x'], config: io('old')})]);
        await Promise.resolve();

        expect(dialogOpen).toHaveBeenCalledTimes(1);
        expect(dialogOpen.calls.mostRecent().args[1]?.data.newOperator.image).toBe('img:v1.0.0');
        expect(inPorts(created[0])).toEqual(['a']);
        expect(config(created[0])).toEqual([]);
        expect(operatorVersion(created[0])).toBe('v1.0.0');
        expect(newerVersion(created[0])).toBe('v1.2.0');
    });

    it('does not ask when only the revision of the operator moved and the pinned version is unchanged', async () => {
        open([cell({version: 3, operatorVersion: 'v1.0.0'})]);
        await Promise.resolve();

        expect(dialogOpen).not.toHaveBeenCalled();
        expect(inPorts(created[0])).toEqual(['a']);
    });

    it('does not ask for a node the flow repo stored without ports and with untyped config entries', async () => {
        const op = operator();
        op.versions = [{version: 'v1.0.0', image: 'img:v1.0.0', inputs: [], outputs: io('o'), config_values: [{name: 'c'} as any]}];
        const stored = cell({version: 3, operatorVersion: 'v1.0.0', config: [{name: 'c'}]});
        delete stored.inPorts;
        open([stored], op);
        await Promise.resolve();

        expect(dialogOpen).not.toHaveBeenCalled();
        expect(created.length).toBe(1);
    });

    it('leaves a node pinned to a missing version unchanged and says so', async () => {
        open([cell({version: 3, operatorVersion: 'v0.0.1', inPorts: ['keep'], name: 'my node'})]);
        await Promise.resolve();

        expect(dialogOpen).not.toHaveBeenCalled();
        expect(inPorts(created[0])).toEqual(['keep']);
        expect(operatorVersion(created[0])).toBe('v0.0.1');
        expect(snackOpen.calls.mostRecent().args[0]).toContain('v0.0.1');
        expect(snackOpen.calls.mostRecent().args[0]).toContain('my node');
        expect(snackOpen.calls.mostRecent().args[0]).toContain('saving will fail');
    });
});
