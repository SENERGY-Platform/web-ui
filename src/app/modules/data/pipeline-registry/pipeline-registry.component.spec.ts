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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PipelineRegistryComponent } from './pipeline-registry.component';
import { PipelineRegistryService } from './shared/pipeline-registry.service';
import { PipelineModel } from './shared/pipeline.model';
import { FlowEngineService } from '../flow-repo/shared/flow-engine.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { UtilService } from '../../../core/services/util.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { SmartServiceModuleService } from '../../smart-services/instances/shared/modules.service';

describe('PipelineRegistryComponent delete', () => {
    const one = { id: 'pipeline-1', name: 'One', operators: [] } as unknown as PipelineModel;
    const two = { id: 'pipeline-2', name: 'Two', operators: [] } as unknown as PipelineModel;

    let component: PipelineRegistryComponent;
    let registry: jasmine.SpyObj<PipelineRegistryService>;
    let flowEngine: jasmine.SpyObj<FlowEngineService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        registry = jasmine.createSpyObj<PipelineRegistryService>('PipelineRegistryService', ['getPipelinesNew']);
        registry.getPipelinesNew.and.returnValue(of({ data: [], total: 0 }));
        flowEngine = jasmine.createSpyObj<FlowEngineService>('FlowEngineService', ['deletePipeline']);
        const permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['getComputedResourcePermissionsV2']);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([]));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: PipelineRegistryService, useValue: registry },
                { provide: FlowEngineService, useValue: flowEngine },
                { provide: PermissionsService, useValue: permissions },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: UtilService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: SmartServiceModuleService, useValue: {} },
                { provide: ActivatedRoute, useValue: {} },
                { provide: Router, useValue: {} },
            ],
        });
        TestBed.overrideComponent(PipelineRegistryComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(PipelineRegistryComponent).componentInstance;
    });

    describe('single delete', () => {
        it('asks with a fixed text', () => {
            answerDialog(false);
            component.deletePipeline(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('pipeline');
        });

        it('deletes by id, reloads and reports success', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValue(of(true));
            component.deletePipeline(one);
            expect(flowEngine.deletePipeline).toHaveBeenCalledOnceWith(one.id);
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Pipeline deleted', undefined, { duration: 2000 });
            expect(component.ready).toBeTrue();
        });

        it('reports an error and no success when the delete failed, and reloads', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValue(of(null));
            component.deletePipeline(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting pipeline!', 'close', { panelClass: 'snack-bar-error' });
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
        });

        it('shows the message of a thrown error object and not [object Object]', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValue(throwError(() => ({ message: 'denied' })));
            component.deletePipeline(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting pipeline!: denied', 'close', { panelClass: 'snack-bar-error' });
        });

        it('reports an error with its text appended and still reloads', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValue(throwError(() => 'boom'));
            component.deletePipeline(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting pipeline!: boom', 'close', { panelClass: 'snack-bar-error' });
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deletePipeline(one);
                expect(flowEngine.deletePipeline).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(registry.getPipelinesNew).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 pipeline');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 pipelines');
        });

        it('deletes every selected id once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(flowEngine.deletePipeline.calls.allArgs()).toEqual([[one.id], [two.id]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('2 pipelines deleted successfully.', undefined, { duration: 2000 });
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports an error with the count and its text appended, still reloads and clears the selection', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValues(of(true), throwError(() => 'boom'));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(flowEngine.deletePipeline).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting 2 pipelines!: boom', 'close', { panelClass: 'snack-bar-error' });
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        it('reports an error and no success when one delete failed, still reloads and clears the selection', () => {
            answerDialog(true);
            flowEngine.deletePipeline.and.returnValues(of(true), of(null));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting 2 pipelines!', 'close', { panelClass: 'snack-bar-error' });
            expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(flowEngine.deletePipeline).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(registry.getPipelinesNew).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
