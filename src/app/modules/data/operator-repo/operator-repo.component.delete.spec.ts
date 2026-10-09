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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { OperatorRepoComponent } from './operator-repo.component';
import { OperatorRepoService } from './shared/operator-repo.service';
import { OperatorModel } from './shared/operator.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';

describe('OperatorRepoComponent delete', () => {
    const one = { _id: 'op-1', name: 'One' } as OperatorModel;
    const two = { _id: 'op-2', name: 'Two' } as OperatorModel;

    let component: OperatorRepoComponent;
    let service: jasmine.SpyObj<OperatorRepoService>;
    let snackBar: { open: jasmine.Spy };
    let reload: jasmine.Spy;

    beforeEach(() => {
        service = jasmine.createSpyObj<OperatorRepoService>('OperatorRepoService', ['deleteOperator', 'deleteOperators']);
        snackBar = { open: jasmine.createSpy('open') };
        const dialogs = { openDeleteDialog: () => ({ afterClosed: () => of(true) }) };
        TestBed.configureTestingModule({
            providers: [
                { provide: OperatorRepoService, useValue: service },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: DialogsService, useValue: dialogs },
                { provide: AuthorizationService, useValue: {} },
                { provide: SearchbarService, useValue: {} },
                { provide: PermissionsService, useValue: {} },
                { provide: PreferencesService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: FlowRepoService, useValue: {} },
                { provide: Router, useValue: {} },
            ],
        });
        TestBed.overrideComponent(OperatorRepoComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(OperatorRepoComponent).componentInstance;
        reload = spyOn(component as unknown as { getOperators: () => void }, 'getOperators');
    });

    it('reloads and reports success when the operator was deleted', () => {
        service.deleteOperator.and.returnValue(of(true));
        component.deleteOperator(one);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Operator deleted', undefined, { duration: 2000 });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('reports an error and no success when deleting the operator failed', () => {
        service.deleteOperator.and.returnValue(of(null));
        component.deleteOperator(one);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting operator!', 'close', { panelClass: 'snack-bar-error' });
        expect(reload).not.toHaveBeenCalled();
        expect(component.ready).toBeTrue();
    });

    it('reloads and clears the selection when the operators were deleted', () => {
        service.deleteOperators.and.returnValue(of({ status: 200 }));
        component.selection.select(one, two);
        component.operatorsDataSource.data = [one, two];
        component.deleteMultipleItems();
        expect(service.deleteOperators).toHaveBeenCalledOnceWith(['op-1', 'op-2']);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(component.selection.isEmpty()).toBeTrue();
    });

    it('reports an error and keeps the selection when deleting the operators failed', () => {
        service.deleteOperators.and.returnValue(of(null));
        component.selection.select(one, two);
        component.deleteMultipleItems();
        expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting operators!', 'close', { panelClass: 'snack-bar-error' });
        expect(reload).not.toHaveBeenCalled();
        expect(component.selection.selected.length).toBe(2);
        expect(component.ready).toBeTrue();
    });
});
