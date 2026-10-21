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

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
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
import { DeviceInstanceWithDeviceTypeModel } from '../../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeFunctionModel } from '../../../metadata/device-types-overview/shared/device-type.model';

/** The page around the form: header, back link, save bar and Discard, rendered from the real template. */
describe('DeployFlowComponent page', () => {
    const nodeModels: ParseModel[] = [
        { id: 'op1', name: 'Operator 1', inPorts: ['in1'], deploymentType: 'cloud', operatorId: 'operator-1', config: [] } as unknown as ParseModel,
        { id: 'op2', name: 'Operator 2', inPorts: ['x'], deploymentType: 'local', operatorId: 'operator-2', config: [] } as unknown as ParseModel,
    ];
    const stored = (name: string) => ({
        id: 'p1', flowId: 'flow', name, description: 'Stored description',
        operators: [{ id: 'op1', inputTopics: [], inputSelections: [] }, { id: 'op2', inputTopics: [], inputSelections: [] }],
    }) as unknown as PipelineModel;

    let fixture: ComponentFixture<DeployFlowComponent>;
    let component: DeployFlowComponent;
    let parserService: Spy<ParserService>;
    let pipelineRegistryService: Spy<PipelineRegistryService>;
    let flowEngineService: Spy<FlowEngineService>;
    let deviceInstancesService: Spy<DeviceInstancesService>;
    let deviceTypeService: Spy<DeviceTypeService>;
    let conceptsService: Spy<ConceptsService>;
    let operatorRepoService: Spy<OperatorRepoService>;
    let router: Router;

    /** Opens the page; `before` runs once the services are stubbed, to change what they answer. */
    function open(edit: boolean, before: () => void = () => {}) {
        parserService = createSpyFromClass(ParserService);
        parserService.getInputs.and.returnValue(of(nodeModels));
        deviceInstancesService = createSpyFromClass(DeviceInstancesService);
        deviceInstancesService.getDeviceInstancesWithDeviceType.and.returnValue(of({ result: [], total: 0 }));
        pipelineRegistryService = createSpyFromClass(PipelineRegistryService);
        pipelineRegistryService.getPipelines.and.returnValue(of([]));
        pipelineRegistryService.getPipeline.and.returnValue(of(stored('Saved pipeline')));
        const importInstancesService = createSpyFromClass(ImportInstancesService);
        importInstancesService.listImportInstances.and.returnValue(of([]));
        const aspectClassesService = createSpyFromClass(AspectClassesService);
        aspectClassesService.userHasReadAuthorization.and.returnValue(false);
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspects.and.returnValue(of([]));
        flowEngineService = createSpyFromClass(FlowEngineService);
        flowEngineService.startPipeline.and.returnValue(of({}));
        flowEngineService.updatePipeline.and.returnValue(of(true));
        conceptsService = createSpyFromClass(ConceptsService);
        operatorRepoService = createSpyFromClass(OperatorRepoService);
        operatorRepoService.getOperator.and.returnValue(of(null));
        before();

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [ReactiveFormsModule, DeployFlowComponent],
            providers: [
                // the router providers come first: they bring an ActivatedRoute of their own
                provideRouter([{ path: 'data/flow-repo', children: [] }, { path: 'data/pipelines', children: [] }]),
                { provide: MatSnackBar, useValue: createSpyFromClass(MatSnackBar) },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: of(edit ? [{ path: 'edit' }, { path: 'p1' }] : [{ path: 'deploy' }, { path: 'flow' }]),
                        queryParams: of({}),
                        snapshot: { paramMap: { get: () => (edit ? 'p1' : 'flow') } },
                    },
                },
                { provide: ParserService, useValue: parserService },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: PathOptionsService, useValue: { getPathOptionsLocal: () => [], getPathOptionsLocalImport: () => ({ json_path: [] }) } },
                { provide: PipelineRegistryService, useValue: pipelineRegistryService },
                { provide: ConceptsService, useValue: conceptsService },
                { provide: OperatorRepoService, useValue: operatorRepoService },
                { provide: ImportInstancesService, useValue: importInstancesService },
                { provide: FlowEngineService, useValue: flowEngineService },
                { provide: AspectClassesService, useValue: aspectClassesService },
            ],
        });
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(DeployFlowComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
    const status = () => el('senergy-save-bar .status').textContent;
    const barButton = (name: string) => el('senergy-save-bar button.' + name) as HTMLButtonElement;
    const nodes = () => component.getSubElementAsGroupArray(component.form, 'nodes');
    const sent = () => flowEngineService.updatePipeline.calls.mostRecent().args[0] as PipelineRequestModel;

    describe('for a new pipeline', () => {
        beforeEach(() => open(false));

        it('is titled as new, links back to the flows and deploys from the save bar', () => {
            expect(el('.page-title').textContent).toBe('New pipeline');
            expect(el('a.page-back').getAttribute('href')).toBe('/data/flow-repo');
            expect(barButton('save').textContent?.trim()).toBe('Deploy');
            expect(barButton('save').disabled).toBeFalse();
            expect(el('senergy-form-section h3').textContent).toBe('General');
            expect(fixture.nativeElement.querySelectorAll('mat-expansion-panel, mat-accordion, .mat-mdc-fab').length).toBe(0);
        });

        it('offers the classic deployment as a header action that opens it for this flow', () => {
            const button = el('.page-actions button') as HTMLButtonElement;

            expect(button.textContent?.trim()).toBe('Use classic deployment');
            button.click();
            expect(router.navigateByUrl).toHaveBeenCalledOnceWith('data/flow-repo/deploy-classic/flow');
        });

        it('names what is missing, then whether anything changed', () => {
            expect(status()).toBe('Fill in the required fields to deploy the flow');

            component.form.patchValue({ name: 'Pipeline' });
            fixture.detectChanges();
            expect(status()).toBe('Ready to deploy');

            component.form.markAsDirty();
            fixture.detectChanges();
            expect(status()).toBe('Unsaved changes');
        });

        it('starts the pipeline from the save bar and goes to the pipelines', () => {
            component.form.patchValue({ name: 'Pipeline' });
            fixture.detectChanges();

            barButton('save').click();

            expect(flowEngineService.startPipeline).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledOnceWith(['/data/pipelines']);
        });

        it('shows what is missing instead of starting when the name is empty', () => {
            barButton('save').click();
            fixture.detectChanges();

            expect(flowEngineService.startPipeline).not.toHaveBeenCalled();
            expect(el('mat-form-field.mat-form-field-invalid')).not.toBeNull();
        });

        it('returns to the flows when Discard is clicked, as there is nothing stored to restore', () => {
            barButton('discard').click();

            expect(router.navigate).toHaveBeenCalledOnceWith(['/data/flow-repo']);
        });

        it('has no form element and no button that submits, so Enter in a field deploys nothing', () => {
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
            const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
            expect(buttons.length).toBeGreaterThan(0);
            expect(buttons.filter((b) => b.type === 'submit')).toEqual([]);
        });
    });

    describe('for an edited pipeline', () => {
        beforeEach(() => open(true));

        it('is titled by the stored name, links back to the pipelines and updates from the save bar', () => {
            expect(el('.page-title').textContent).toBe('Saved pipeline');
            expect(el('a.page-back').getAttribute('href')).toBe('/data/pipelines');
            expect(barButton('save').textContent?.trim()).toBe('Update');
            expect(status()).toBe('Editing');
            expect(el('.page-actions button')).toBeNull();

            barButton('save').click();

            expect(sent().id).toBe('p1');
            expect(sent().name).toBe('Saved pipeline');
        });

        it('marks the page as changed when a pipeline input is added or removed', () => {
            const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            (el('.add-pipeline-button') as HTMLButtonElement).click();
            fixture.detectChanges();
            expect(component.getSubElementAsGroupArray(input, 'pipelines').length).toBe(1);
            expect(status()).toBe('Unsaved changes');

            component.discard();
            fixture.detectChanges();
            expect(status()).toBe('Editing');

            const reloaded = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            component.addPipeline(reloaded);
            expect(component.form.dirty).toBeFalse();
            component.removePipeline(reloaded, 0);
            expect(component.form.dirty).toBeTrue();
        });

        it('loads the stored pipeline again when Discard is clicked, dropping every edit', () => {
            component.form.patchValue({ name: 'changed', description: 'changed too' });
            component.form.markAsDirty();
            component.addPipeline(component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0]);
            fixture.detectChanges();
            expect(status()).toBe('Unsaved changes');

            barButton('discard').click();
            fixture.detectChanges();

            expect(component.form.getRawValue().name).toBe('Saved pipeline');
            expect(component.form.getRawValue().description).toBe('Stored description');
            expect(nodes().length).toBe(2);
            expect(component.getSubElementAsGroupArray(component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0], 'pipelines').length).toBe(0);
            expect(component.form.dirty).toBeFalse();
            expect(status()).toBe('Editing');
            expect(component.ready).toBeTrue();
            barButton('save').click();
            expect(sent().name).toBe('Saved pipeline');
            expect(sent().nodes.length).toBe(2);
        });

        it('loads the stored pipeline once when Discard is clicked while it is still loading', () => {
            const slow = new Subject<ParseModel[]>();
            parserService.getInputs.and.returnValue(slow);

            component.discard();
            component.discard();
            expect(component.ready).toBeFalse();
            slow.next(nodeModels);
            slow.complete();
            fixture.detectChanges();

            expect(parserService.getInputs).toHaveBeenCalledTimes(2);
            expect(nodes().length).toBe(2);
            expect(component.ready).toBeTrue();
        });

        it('keeps the edits when Discard cannot load the stored pipeline again', () => {
            component.form.patchValue({ name: 'changed' });
            component.form.markAsDirty();
            fixture.detectChanges();
            pipelineRegistryService.getPipeline.and.returnValue(of(null));

            barButton('discard').click();
            fixture.detectChanges();

            expect(component.form.getRawValue().name).toBe('changed');
            expect(status()).toBe('Unsaved changes');
            expect(component.ready).toBeTrue();
            barButton('save').click();
            expect(sent().name).toBe('changed');
            expect(sent().nodes.length).toBe(2);
        });

        it('keeps the edits when the flow no longer has operators to load', () => {
            component.form.patchValue({ name: 'changed' });
            component.form.markAsDirty();
            parserService.getInputs.and.returnValue(of([]));

            component.discard();
            fixture.detectChanges();

            expect(component.form.getRawValue().name).toBe('changed');
            expect(nodes().length).toBe(2);
            expect(component.ready).toBeTrue();
        });

        it('keeps the edits when the reload ends with an error', () => {
            component.form.patchValue({ name: 'changed' });
            component.form.markAsDirty();
            fixture.detectChanges();
            parserService.getInputs.and.returnValue(throwError(() => new Error('offline')));

            barButton('discard').click();
            fixture.detectChanges();

            expect(component.ready).toBeTrue();
            expect(component.form.getRawValue().name).toBe('changed');
            expect(nodes().length).toBe(2);
            expect(status()).toBe('Unsaved changes');
        });

        it('keeps a handler the edited form attached during a reload that then fails', () => {
            const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            const slow = new Subject<PipelineModel | null>();
            pipelineRegistryService.getPipeline.and.returnValue(slow);

            component.discard();
            // a handler of the edited form runs while the reload is pending and attaches the selection handler
            input.patchValue({
                devices: [{ id: 'd1', device_type_id: 'dt1', device_type: { id: 'dt1', name: 'Type 1' } }] as unknown as DeviceInstanceWithDeviceTypeModel[],
            });
            slow.next(null);
            slow.complete();

            expect(component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0]).toBe(input);
            component.getSubElementAsGroupArray(input, 'deviceTypes')[0].patchValue({ selection: [{ service_id: 's1', path: 'value.x' }] });
            expect(input.getRawValue().filter?.get('d1')).toEqual([{ serviceId: 's1', path: 'value.x' }]);
        });
    });

    describe('with a pipeline as input', () => {
        const image = (rootAttributes: string) =>
            `<svg xmlns="http://www.w3.org/2000/svg" ${rootAttributes}><g class="joint-cells-layer">` +
            '<g class="joint-cell" data-type="senergy.NodeElement" model-id="o1"><rect x="0" y="0" width="60" height="40" stroke="black" fill="white"/></g>' +
            '<g class="joint-cell" data-type="senergy.NodeElement" model-id="o2"><rect x="100" y="0" width="60" height="40" stroke="black" fill="white"/></g>' +
            '</g></svg>';
        const source = (markup: string) => ({
            id: 'p9', name: 'Source', image: markup,
            operators: [{ id: 'o1', name: 'first', operatorId: 'operator-a' }, { id: 'o2', name: 'second', operatorId: 'operator-b' }],
        }) as unknown as PipelineModel;

        function clickOperator(modelId: string) {
            const rect = el(`.widget-image g[model-id="${modelId}"] rect`);
            const box = rect.getBoundingClientRect();
            rect.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }));
        }

        const cases: [string, string, string | null][] = [['a viewBox', 'viewBox="0 0 160 40"', '40'], ['no viewBox', 'width="160"', null]];
        for (const [label, rootAttributes, height] of cases) {
            it(`shows an image with ${label} and selects the operator clicked in it`, () => {
                open(false, () => pipelineRegistryService.getPipelines.and.returnValue(of([source(image(rootAttributes))])));
                const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
                component.addPipeline(input, 'p9');
                fixture.detectChanges();

                expect(el('.widget-image svg').getAttribute('height')).toBe(height);
                clickOperator('o2');
                fixture.detectChanges();

                expect(component.getSubElementAsGroupArray(input, 'pipelines')[0].getRawValue().operatorId).toBe('o2');
                expect(component.form.dirty).toBeTrue();
                expect(el('.widget-image g[model-id="o2"] rect').getAttribute('stroke')).toBe('red');
            });
        }

        it('shows and selects in an image with whitespace between its nodes and a cell without a model id', () => {
            const markup = '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 160 40">\n<g class="joint-cells-layer">\n' +
                '<g class="joint-cell" data-type="senergy.Link">\n<rect x="65" y="15" width="30" height="10" stroke="black"/>\n</g>\n' +
                '<g class="joint-cell" data-type="senergy.NodeElement" model-id="o1">\n<rect x="0" y="0" width="60" height="40" stroke="black" fill="white"/>\n</g>\n' +
                '<g class="joint-cell" data-type="senergy.NodeElement" model-id="o2">\n<rect x="100" y="0" width="60" height="40" stroke="black" fill="white"/>\n</g>\n' +
                '</g>\n</svg>';
            open(false, () => pipelineRegistryService.getPipelines.and.returnValue(of([source(markup)])));
            const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            component.addPipeline(input, 'p9');
            fixture.detectChanges();

            clickOperator('o2');
            fixture.detectChanges();

            expect(component.getSubElementAsGroupArray(input, 'pipelines')[0].getRawValue().operatorId).toBe('o2');
            expect(el('.widget-image g[model-id="o2"] rect').getAttribute('stroke')).toBe('red');
            expect(el('.widget-image g[model-id="o1"] rect').getAttribute('stroke')).toBe('black');
        });

        it('builds the image once per pipeline and selected operator', () => {
            open(false, () => pipelineRegistryService.getPipelines.and.returnValue(of([source(image('viewBox="0 0 160 40"'))])));
            const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            component.addPipeline(input, 'p9');
            const group = component.getSubElementAsGroupArray(input, 'pipelines')[0] as Parameters<DeployFlowComponent['getImage']>[0];

            const first = component.getImage(group);
            expect(component.getImage(group)).toBe(first);
            group.patchValue({ operatorId: 'o2' });
            expect(component.getImage(group)).not.toBe(first);
        });
    });

    describe('once the page is left', () => {
        it('builds no form and asks for nothing more when the operators arrive afterwards', () => {
            const slow = new Subject<ParseModel[]>();
            open(true, () => parserService.getInputs.and.returnValue(slow));

            fixture.destroy();
            slow.next(nodeModels);
            slow.complete();

            expect(deviceInstancesService.getDeviceInstancesWithDeviceType).not.toHaveBeenCalled();
            expect(nodes().length).toBe(0);
        });

        it('asks for nothing more when a stored selection arrives afterwards', () => {
            const functions = new Subject<DeviceTypeFunctionModel[][]>();
            open(true, () => {
                const selection = { inputName: 'in1', aspectId: 'a1', functionId: 'f1', characteristicIds: ['c1'], selectableId: 'urn:infai:ses:device:d1' };
                pipelineRegistryService.getPipeline.and.returnValue(of({
                    ...stored('Saved pipeline'),
                    operators: [{ id: 'op1', inputTopics: [], inputSelections: [selection] }, { id: 'op2', inputTopics: [], inputSelections: [] }],
                } as unknown as PipelineModel));
                deviceTypeService.getMeasuringFunctionsPerAspectWithImports.and.returnValue(functions);
                conceptsService.getConceptWithCharacteristics.and.returnValue(new Subject());
            });
            expect(component.ready).toBeFalse();

            fixture.destroy();
            functions.next([[{ id: 'f1', concept_id: 'concept' } as DeviceTypeFunctionModel]]);

            expect(conceptsService.getConceptWithCharacteristics).not.toHaveBeenCalled();
        });

        it('runs no handler of a pipeline input added afterwards', () => {
            open(false);
            const input = component.getSubElementAsGroupArray(nodes()[0], 'inputs')[0];
            component.pipelines = [{ id: 'p9', name: 'Source', operators: [{ id: 'o1', name: 'first', operatorId: 'operator-a' }] } as unknown as PipelineModel];

            fixture.destroy();
            component.addPipeline(input, 'p9');

            expect(operatorRepoService.getOperator).not.toHaveBeenCalled();
        });
    });
});
