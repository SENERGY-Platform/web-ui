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
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
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
import { DeviceTypeAspectNodeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { SmartServiceTaskDescription, SmartServiceTaskInputDescription } from '../../shared/designer.model';
import { ParseModel } from '../../../../data/flow-repo/shared/parse.model';
import { BpmnElement } from '../../../../processes/designer/shared/designer.model';
import {
    V2DeploymentsPreparedFilterCriteriaModel,
    V2DeploymentsPreparedModel,
} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';

const node = (id: string, name: string): DeviceTypeAspectNodeModel => ({
    id,
    name,
    root_id: id,
    parent_id: '',
    child_ids: [],
    ancestor_ids: [],
    descendent_ids: [],
});

const air = node('urn:infai:ses:aspect:air', 'Air');
const water = node('urn:infai:ses:aspect:water', 'Water');
const watchKey = 'watcher.watch_devices_by_criteria';
const environmentClass = 'urn:infai:ses:aspect-class:environment';
const classifiedAir = { ...air, aspect_class_id: environmentClass };
const classifiedWater = { ...water, aspect_class_id: environmentClass };

describe('EditSmartServiceTaskDialogComponent criteria', () => {
    let component: EditSmartServiceTaskDialogComponent;
    let dialogRef: Spy<MatDialogRef<EditSmartServiceTaskDialogComponent>>;
    let fixture: ComponentFixture<EditSmartServiceTaskDialogComponent>;

    function init(inputs: SmartServiceTaskInputDescription[], listing: DeviceTypeAspectNodeModel[] = [air, water], topic = 'watcher', render = false) {
        dialogRef = createSpyFromClass<MatDialogRef<EditSmartServiceTaskDialogComponent>>(MatDialogRef);
        const deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspectNodesWithFunctionOfDevicesOnly.and.returnValue(of(listing));
        const functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(of({ result: [], total: 0 }));
        const deviceClassesService = createSpyFromClass(DeviceClassesService);
        deviceClassesService.getDeviceClasses.and.returnValue(of({ result: [], total: 0 }));
        const flowRepoService = createSpyFromClass(FlowRepoService);
        flowRepoService.getFlows.and.returnValue(of({ flows: [] }));
        const importTypesService = createSpyFromClass(ImportTypesService);
        importTypesService.listImportTypes.and.returnValue(of({ result: [], total: 0 }));

        const info: SmartServiceTaskDescription = { name: 'task', topic, inputs, outputs: [], smartServiceInputs: { inputs: [] } };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [EditSmartServiceTaskDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { info, element: { id: 'task', incoming: [] } as unknown as BpmnElement } },
                { provide: ProcessRepoService, useValue: createSpyFromClass(ProcessRepoService) },
                { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
                { provide: FlowRepoService, useValue: flowRepoService },
                { provide: ParserService, useValue: createSpyFromClass(ParserService) },
                { provide: ImportTypesService, useValue: importTypesService },
                { provide: FunctionsService, useValue: functionsService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: DeviceClassesService, useValue: deviceClassesService },
            ],
        });
        // standalone components ignore the TestBed schemas; the rendered specs read the content of every tab, which the real tab group only renders for the active one
        TestBed.overrideComponent(EditSmartServiceTaskDialogComponent, { set: { imports: [CommonModule, MatMenuModule], schemas: [NO_ERRORS_SCHEMA] } });
        if (!render) {
            TestBed.overrideTemplate(EditSmartServiceTaskDialogComponent, '');
        }
        fixture = TestBed.createComponent(EditSmartServiceTaskDialogComponent);
        component = fixture.componentInstance;
    }

    const savedWatcherCriteria = () => {
        component.ok();
        const result = dialogRef.close.calls.mostRecent().args[0] as SmartServiceTaskDescription;
        return result.inputs.find((input) => input.name === watchKey)?.value;
    };
    const watched = () => component.watcherWorkerInfo.devices_by_criteria.criteria;

    it('writes a new watcher criteria without aspect as before, with no list', () => {
        init([{ name: watchKey, type: 'text', value: '[]' }]);
        component.addCriteria(watched());
        expect(savedWatcherCriteria()).toBe('[{"interaction":"request","aspect_id":"","device_class_id":"","function_id":""}]');
    });

    it('writes one and two picked watcher aspects in both spellings, sorted', () => {
        init([{ name: watchKey, type: 'text', value: '[]' }]);
        component.addCriteria(watched());
        component.addCriteria(watched());
        component.setAspects(watched()[0], [air.id]);
        component.setAspects(watched()[1], [water.id, air.id]);
        expect(JSON.parse(savedWatcherCriteria() as string)).toEqual([
            { interaction: 'request', aspect_id: air.id, device_class_id: '', function_id: '', aspect_ids: [air.id] },
            { interaction: 'request', aspect_id: air.id, device_class_id: '', function_id: '', aspect_ids: [air.id, water.id] },
        ]);
    });

    it('opens legacy and inconsistent watcher criteria with the union, and names every aspect', () => {
        init([{ name: watchKey, type: 'text', value: `[{"aspect_id":"${air.id}"},{"aspect_id":"${water.id}","aspect_ids":["${air.id}"]}]` }]);
        expect(watched().map((c) => c.aspect_ids)).toEqual([[air.id], [air.id, water.id]]);
        expect(component.criteriaToLabel(watched()[1])).toBe('Air, Water');
    });

    it('offers a stored watcher aspect the listing lacks under its id', () => {
        const gone = 'urn:infai:ses:aspect:gone';
        init([{ name: watchKey, type: 'text', value: `[{"aspect_ids":["${gone}"]}]` }]);
        expect(component.aspects.map((a) => a.name)).toEqual(['Air', 'Water', gone]);
        expect(JSON.parse(savedWatcherCriteria() as string)).toEqual([{ aspect_id: gone, aspect_ids: [gone] }]);
    });

    describe('aspect-class collision', () => {
        const collidingJson = JSON.stringify([{ aspect_ids: [air.id, water.id] }]);

        it('blocks Save and OK for watcher criteria naming two aspects of one class, until one is removed', () => {
            init([{ name: watchKey, type: 'text', value: '[]' }], [classifiedAir, classifiedWater]);
            component.addCriteria(watched());
            component.setAspects(watched()[0], [air.id, water.id]);
            expect(component.isInvalid()).toBeTrue();
            expect(component.hasAspectClassCollision(watched()[0])).toBeTrue();
            component.ok();
            expect(dialogRef.close).not.toHaveBeenCalled();

            component.setAspects(watched()[0], [air.id]);
            expect(component.isInvalid()).toBeFalse();
            expect(component.hasAspectClassCollision(watched()[0])).toBeFalse();
            expect(JSON.parse(savedWatcherCriteria() as string)).toEqual([jasmine.objectContaining({ aspect_ids: [air.id] })]);
        });

        it('blocks a stored watcher criteria that already collides', () => {
            init([{ name: watchKey, type: 'text', value: collidingJson }], [classifiedAir, classifiedWater]);
            expect(component.isInvalid()).toBeTrue();
        });

        it('accepts two aspects without a class, as before', () => {
            init([{ name: watchKey, type: 'text', value: collidingJson }]);
            expect(component.isInvalid()).toBeFalse();
        });

        it('blocks the criteria of an analytics input', () => {
            init(
                [
                    { name: 'analytics.criteria.flow.port', type: 'text', value: '[]' },
                    { name: 'analytics.service_criteria.flow.port', type: 'text', value: collidingJson },
                ],
                [classifiedAir, classifiedWater],
                'analytics',
            );
            expect(component.isInvalid()).toBeTrue();
            component.ok();
            expect(dialogRef.close).not.toHaveBeenCalled();
        });

        describe('reason visible without expanding a panel', () => {
            const operator = (id: string, name: string) => ({ id, name, inPorts: ['port'] } as ParseModel);
            const render = (inputs: SmartServiceTaskInputDescription[], topic: string) => {
                init(inputs, [classifiedAir, classifiedWater], topic, true);
                component.currentParsedFlows = [operator('opA', 'Operator A'), operator('opB', 'Operator B')];
                component.currentFlowInputId = 'opA';
                fixture.detectChanges();
            };
            const operatorHints = () =>
                Array.from(fixture.nativeElement.querySelectorAll('mat-card > mat-accordion > mat-expansion-panel') as NodeListOf<HTMLElement>)
                    .filter((panel) => panel.querySelector(':scope > mat-expansion-panel-header > mat-panel-title')?.textContent?.trim().startsWith('Operator'))
                    .map((panel) => panel.querySelector(':scope > mat-expansion-panel-header > mat-panel-description')?.textContent?.trim());
            const saveLine = () => (fixture.nativeElement.querySelector('mat-dialog-actions > span') as HTMLElement | null)?.textContent?.trim();
            const saveButton = () => fixture.nativeElement.querySelector('mat-dialog-actions > button[color=accent]') as HTMLButtonElement;
            const analyticsInputs = (a: string, b: string): SmartServiceTaskInputDescription[] => [
                { name: 'analytics.criteria.opA.port', type: 'text', value: a },
                { name: 'analytics.service_criteria.opB.port', type: 'text', value: b },
            ];

            it('marks the header of the collapsed operator and names it next to Save', () => {
                render(analyticsInputs('[]', collidingJson), 'analytics');
                expect(operatorHints()).toEqual([undefined, 'Aspect class collision']);
                expect(saveLine()).toBe('Save is disabled, aspect class collision in operator Operator B');
                expect(saveButton().disabled).toBeTrue();
            });

            it('names every colliding operator', () => {
                render(analyticsInputs(collidingJson, collidingJson), 'analytics');
                expect(operatorHints()).toEqual(['Aspect class collision', 'Aspect class collision']);
                expect(saveLine()).toBe('Save is disabled, aspect class collision in operators Operator A, Operator B');
            });

            it('names the watcher criteria', () => {
                render([{ name: watchKey, type: 'text', value: collidingJson }], 'watcher');
                expect(saveLine()).toBe('Save is disabled, aspect class collision in the watcher criteria');
                expect(saveButton().disabled).toBeTrue();
            });

            it('shows neither without a collision', () => {
                render(analyticsInputs('[]', '[]'), 'analytics');
                expect(operatorHints()).toEqual([undefined, undefined]);
                expect(saveLine()).toBeUndefined();
                expect(saveButton().disabled).toBeFalse();
            });
        });

        it('ignores an analytics input whose text is no criteria list', () => {
            init([{ name: 'analytics.criteria.flow.port', type: 'text', value: 'not json' }], [classifiedAir, classifiedWater], 'analytics');
            expect(component.isInvalid()).toBeFalse();
        });
    });

    it('documents the aspect list in the criteria struct completion', () => {
        init([]);
        const struct = component.jsCompletions({ lines: [''], row: 0, column: 0 }).find((c) => c.caption === 'filter criteria struct');
        expect(struct?.value).toContain('"aspect_ids":[]');
        expect(struct?.value).toContain('"aspect_id":""');
    });

    describe('input generated from a process task', () => {
        function generate(filterCriteria: Partial<V2DeploymentsPreparedFilterCriteriaModel>) {
            init([]);
            component.selectedProcessModelPreparation = {
                elements: [{ bpmn_id: 'bpmn-task', name: 'Measure', task: { selection: { filter_criteria: { function_id: 'f', ...filterCriteria } } } }],
            } as unknown as V2DeploymentsPreparedModel;
            const input: SmartServiceTaskInputDescription = { name: 'process_deployment.bpmn-task.selection', type: 'text', value: '' };
            component.generateInputForProcessElement(input, 'bpmn-task');
            return component.smartServiceInputs[component.smartServiceInputs.length - 1].criteria_list;
        }

        it('carries no aspect when the task names none', () => {
            expect(generate({ aspect_id: '' })).toEqual([
                { aspect_id: undefined, device_class_id: undefined, function_id: 'f', interaction: 'request' },
            ]);
        });

        it('carries a single aspect in both spellings', () => {
            expect(generate({ aspect_id: air.id })).toEqual([
                { aspect_id: air.id, aspect_ids: [air.id], device_class_id: undefined, function_id: 'f', interaction: 'request' },
            ]);
        });

        it('carries the union of both fields, sorted, with the first as the alias', () => {
            expect(generate({ aspect_id: water.id, aspect_ids: [air.id] })).toEqual([
                { aspect_id: air.id, aspect_ids: [air.id, water.id], device_class_id: undefined, function_id: 'f', interaction: 'request' },
            ]);
        });
    });
});
