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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { UrlStateService } from '../../../core/services/url-state.service';
import { UrlStateServiceMock } from '../../../core/services/url-state.service.mock';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import { ProcessRepoComponent } from './process-repo.component';
import { ProcessRepoService } from './shared/process-repo.service';
import { ProcessModel } from './shared/process.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { UtilService } from '../../../core/services/util.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';

interface ListResponse {
    result: ProcessModel[];
    total: number;
}

function process(id: string, owner: string): ProcessModel {
    return { _id: id, name: id, date: 0, svgXML: '', bpmn_xml: '', publish: false, owner };
}

function rights(id: string): PermissionsV2RightsAndIdModel {
    return { id, read: true, write: true, execute: true, administrate: true } as PermissionsV2RightsAndIdModel;
}

describe('ProcessRepoComponent', () => {
    let component: ProcessRepoComponent;
    let repoService: jasmine.SpyObj<ProcessRepoService>;
    let permissionsService: jasmine.SpyObj<PermissionsService>;
    let responses: Subject<ListResponse>[];
    let urlState: UrlStateServiceMock;

    beforeEach(() => {
        responses = [];
        repoService = jasmine.createSpyObj<ProcessRepoService>('ProcessRepoService', [
            'getProcessModels',
            'userHasCreateAuthorization',
            'userHasUpdateAuthorization',
            'userHasDeleteAuthorization',
        ]);
        repoService.getProcessModels.and.callFake(() => {
            const response = new Subject<ListResponse>();
            responses.push(response);
            return response;
        });
        permissionsService = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['getComputedResourcePermissionsV2', 'getUserById']);
        permissionsService.getComputedResourcePermissionsV2.and.callFake((_, ids) => of(ids.map(rights)));
        permissionsService.getUserById.and.returnValue(of({ id: 'u2', username: 'other' }) as ReturnType<PermissionsService['getUserById']>);

        TestBed.configureTestingModule({
            imports: [ProcessRepoComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: ProcessRepoService, useValue: repoService },
                { provide: AuthorizationService, useValue: { getUserId: () => 'u1' } },
                { provide: PermissionsService, useValue: permissionsService },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map<string, string>()) } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: SearchbarService, useValue: { currentSearchText: of('') } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: Router, useValue: {} },
                { provide: UrlStateService, useClass: UrlStateServiceMock },
            ],
        });
        urlState = TestBed.inject(UrlStateService) as UrlStateServiceMock;
        component = TestBed.createComponent(ProcessRepoComponent).componentInstance;
    });

    const load = (tab: number) => {
        component.activeIndex = tab;
        component.reload();
    };

    const ownerFilterOfCall = (i: number) => repoService.getProcessModels.calls.argsFor(i)[5];

    it('asks the backend for the user\'s own process models on the Own tab', () => {
        load(1);
        expect(ownerFilterOfCall(0)).toEqual({ owner: 'u1' });
    });

    it('asks the backend for process models of other owners on the Shared tab', () => {
        load(2);
        expect(ownerFilterOfCall(0)).toEqual({ notOwner: 'u1' });
    });

    it('sends no owner filter on the All tab', () => {
        load(0);
        expect(ownerFilterOfCall(0)).toBeUndefined();
    });

    it('asks for the page size and offset of the list and takes the total from the answer', () => {
        load(0);
        responses[0].next({ result: [process('a', 'u1')], total: 57 });

        expect(repoService.getProcessModels.calls.argsFor(0).slice(1, 5)).toEqual([20, 0, 'date', 'desc']);
        expect(component.totalCount).toBe(57);
        expect(component.dataSource.data.map((p) => p._id)).toEqual(['a']);
        expect(component.ready).toBeTrue();
    });

    it('loads the rights of the page shown and drops those of the previous page', () => {
        load(0);
        responses[0].next({ result: [process('a', 'u1'), process('b', 'u2')], total: 3 });
        component.list.refresh();
        responses[1].next({ result: [process('c', 'u1')], total: 3 });

        expect(permissionsService.getComputedResourcePermissionsV2).toHaveBeenCalledTimes(2);
        expect(component.hasXPermission({ _id: 'c' })).toBeTrue();
        expect(component.hasXPermission({ _id: 'a' })).toBeFalse();
    });

    it('drops the answer of a superseded listing', () => {
        load(0);
        load(1);
        responses[0].next({ result: [process('other', 'u2')], total: 1 });
        responses[1].next({ result: [process('own', 'u1')], total: 1 });

        expect(component.dataSource.data.map((p) => p._id)).toEqual(['own']);
    });

    it('goes back to the default sort and clears the search when the tab changes', () => {
        component.list.sortBy = 'name';
        component.list.sortDirection = 'asc';
        component.searchText = 'abc';

        component.setIndex(2);

        expect(component.list.sortBy).toBe('date');
        expect(component.list.sortDirection).toBe('desc');
        expect(component.searchText).toBe('');
        expect(ownerFilterOfCall(0)).toEqual({ notOwner: 'u1' });
    });

    it('clears the selection when a page has loaded', () => {
        load(0);
        responses[0].next({ result: [process('a', 'u1')], total: 1 });
        component.selection.select(component.dataSource.data[0]);

        component.list.refresh();
        responses[1].next({ result: [process('b', 'u1')], total: 1 });

        expect(component.selection.selected).toEqual([]);
    });
    it('opens on the tab the URL names, with its owner filter in the first load', () => {
        urlState.params = { tab: '2' };

        component.ngOnInit();

        expect(component.activeIndex).toBe(2);
        expect(ownerFilterOfCall(0)).toEqual({ notOwner: 'u1' });
        expect(urlState.writes).toEqual([]);
    });

    it('takes a tab beyond the last one as the last tab', () => {
        urlState.params = { tab: '9' };

        component.ngOnInit();

        expect(component.activeIndex).toBe(2);
    });

    it('writes the tab with the sort and the page dropped when the tab changes', () => {
        component.setIndex(1);
        component.setIndex(0);

        expect(urlState.writes[0]).toEqual({ tab: 1, sort: null, dir: null, page: null });
        expect(urlState.writes[1]).toEqual({ tab: null, sort: null, dir: null, page: null });
    });
});
