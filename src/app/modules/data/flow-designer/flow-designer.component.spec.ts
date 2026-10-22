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
import { DiagramEditorComponent } from '../diagram-editor/diagram-editor.component';

import { FlowDesignerComponent } from './flow-designer.component';
import { FlowModel } from '../flow-repo/shared/flow.model';
import { environment } from '../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
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
                imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule, FlowDesignerComponent],
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
        const cells = document.createElementNS(SVG_NAMESPACE, 'g');
        cells.setAttribute('class', 'joint-cells-layer');
        layers.appendChild(cells);
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

    describe('the saved flow request', () => {
        const IMAGE = '<?xml version="1.0" standalone="no"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewbox="-10 0 20 0"><g class="joint-layers"><g class="joint-cells-layer"/></g></svg>';
        const model = {cells: [{id: 'n1', type: 'senergy.NodeElement', name: 'op'}]};

        beforeEach(() => {
            (component.diagram as any).getGraph = () => model;
            spyOn(router, 'navigate');
        });

        it('puts a new flow with name, description, image and model', () => {
            component.flow = {name: 'my flow', description: 'what it does'} as FlowModel;

            component.saveModel();
            const request = http.expectOne(environment.flowRepoUrl + '/flow/').request;

            expect(request.method).toBe('PUT');
            expect(request.body).toEqual({name: 'my flow', description: 'what it does', image: IMAGE, model});
        });

        it('posts an existing flow to its id with the stored fields and without the id in the body', () => {
            component.flow = {_id: 'flow-1', name: 'my flow', description: 'd', dateCreated: '2026-01-01', dateUpdated: '2026-01-02', userId: 'u'} as any;

            component.saveModel();
            const request = http.expectOne(environment.flowRepoUrl + '/flow/flow-1/').request;

            expect(request.method).toBe('POST');
            expect(request.body).toEqual({name: 'my flow', description: 'd', dateCreated: '2026-01-01', dateUpdated: '2026-01-02', userId: 'u', image: IMAGE, model});
        });
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
            imports: [MatDialogModule, MatSnackBarModule, NoopAnimationsModule, FlowDesignerComponent],
            providers: [
                provideRouter([]),
                {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'flow-1'}}}},
                {provide: OperatorRepoService, useValue: {getAllOperators: () => of({operators: [operatorModel]})}},
                {provide: FlowRepoService, useValue: {getFlow: () => of({_id: 'flow-1', name: 'f', model: {cells}})}},
            ],
        });
        // the first change detection replaces the stubbed diagram below by the rendered editor, which gets no real cells
        spyOn(DiagramEditorComponent.prototype, 'addElementsToGraph');
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

    describe('the version dialog of a node', () => {
        let closed$: Subject<any>;
        let backdrop$: Subject<void>;
        let keys$: Subject<any>;
        let ref: any;
        let applied: any[];

        async function openWithRef() {
            open([cell({version: 7})]);
            await Promise.resolve();
            dialogOpen.calls.reset();
            // Each dialog gets its own streams, as a real one does.
            dialogOpen.and.callFake(() => {
                closed$ = new Subject<any>();
                backdrop$ = new Subject<void>();
                keys$ = new Subject<any>();
                const current = closed$;
                ref = {
                    afterClosed: () => current,
                    backdropClick: () => backdrop$,
                    keydownEvents: () => keys$,
                    close: jasmine.createSpy('close').and.callFake((result?: any) => current.next(result)),
                };
                return ref;
            });
            applied = [];
            (component.diagram as any).getNodeInfo = () => ({operatorId: 'op', name: 'op', image: 'img', inPorts: ['a'], outPorts: ['o'], config: [], links: []});
            (component.diagram as any).applyNodeVersion = (id: string, change: any) => applied.push([id, change]);
        }

        it('opens one dialog at a time and again after it was closed', async () => {
            await openWithRef();
            component.openVersionDialog('n1');
            component.openVersionDialog('n1');
            expect(dialogOpen).toHaveBeenCalledTimes(1);

            closed$.next(undefined);
            component.openVersionDialog('n1');
            expect(dialogOpen).toHaveBeenCalledTimes(2);
        });

        it('is not closed by the second click of a double click on the Version button, but by a later click on the backdrop', async () => {
            await openWithRef();
            const now = spyOn(Date, 'now').and.returnValue(1000);
            component.openVersionDialog('n1');
            expect(dialogOpen.calls.mostRecent().args[1]?.disableClose).toBeTrue();

            now.and.returnValue(1200);
            backdrop$.next();
            expect(ref.close).not.toHaveBeenCalled();

            now.and.returnValue(1600);
            backdrop$.next();
            expect(ref.close).toHaveBeenCalledTimes(1);
        });

        it('still closes on Escape and applies a chosen version', async () => {
            await openWithRef();
            component.openVersionDialog('n1');
            keys$.next({key: 'Enter'});
            expect(ref.close).not.toHaveBeenCalled();
            keys$.next({key: 'Escape'});
            expect(ref.close).toHaveBeenCalledTimes(1);
            expect(applied).toEqual([]);

            component.openVersionDialog('n1');
            closed$.next({operatorVersion: 'v1.0.0', image: 'img:v1.0.0', inPorts: ['a'], outPorts: ['o'], config: [], removeLinkIds: []});
            expect(applied.length).toBe(1);
            expect(applied[0][1].operatorVersion).toBe('v1.0.0');
        });
    });
});
