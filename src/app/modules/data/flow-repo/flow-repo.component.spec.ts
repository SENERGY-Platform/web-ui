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

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { FlowRepoComponent } from './flow-repo.component';
import { FlowModel } from './shared/flow.model';
import { FlowRepoService } from './shared/flow-repo.service';
import { FlowEngineService } from './shared/flow-engine.service';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

describe('FlowRepoComponent header checkbox', () => {
    let component: FlowRepoComponent;
    const row = (id: string) => ({ _id: id } as FlowModel);
    const setRows = (ids: string[]) => (component.flowsDataSource.data = ids.map(row));

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatSnackBarModule, MatDialogModule],
            providers: [
                provideRouter([]),
                { provide: FlowRepoService, useValue: {} },
                { provide: FlowEngineService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: SearchbarService, useValue: {} },
            ],
        }).overrideComponent(FlowRepoComponent, {
            set: {
                template: '',
                imports: [],
                providers: [
                    { provide: PermissionsService, useValue: {} },
                    { provide: CostService, useValue: {} },
                ],
            },
        });
        component = TestBed.createComponent(FlowRepoComponent).componentInstance;
    });

    it('is not all selected with no rows and nothing selected; toggle selects nothing', () => {
        setRows([]);
        expect(component.isAllSelected()).toBeFalse();
        component.masterToggle();
        expect(component.selection.selected).toEqual([]);
    });

    it('counts one selected row as all and clears on toggle', () => {
        setRows(['a', 'b', 'c']);
        expect(component.isAllSelected()).toBeFalse();
        component.selection.select(component.flowsDataSource.data[1]);
        expect(component.isAllSelected()).toBeTrue();
        component.masterToggle();
        expect(component.selection.selected).toEqual([]);
    });

    it('selects every shown row when nothing is selected', () => {
        setRows(['a', 'b', 'c']);
        component.masterToggle();
        expect(component.selection.selected.map((f) => f._id).sort()).toEqual(['a', 'b', 'c']);
        expect(component.isAllSelected()).toBeTrue();
    });

    it('does not count more selected rows than shown as all; toggle then selects the shown rows', () => {
        setRows(['a', 'b', 'c']);
        component.masterToggle();
        component.flowsDataSource.data = component.flowsDataSource.data.slice(0, 2);
        expect(component.isAllSelected()).toBeFalse();
        component.masterToggle();
        expect(component.selection.selected.length).toBe(3);
    });
});
