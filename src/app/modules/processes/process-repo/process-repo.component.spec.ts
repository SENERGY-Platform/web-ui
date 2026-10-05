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
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import { ProcessRepoComponent } from './process-repo.component';
import { ProcessRepoService } from './shared/process-repo.service';
import { ProcessModel } from './shared/process.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { UtilService } from '../../../core/services/util.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsMockService } from '../../permissions/shared/permissions.service.mock';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';

interface ListResponse {
    result: ProcessModel[];
    total: number;
}

function process(id: string, owner: string): ProcessModel {
    return { _id: id, name: id, date: 0, svgXML: '', bpmn_xml: '', publish: false, owner };
}

describe('ProcessRepoComponent', () => {
    let component: ProcessRepoComponent;
    let repoService: jasmine.SpyObj<ProcessRepoService>;
    let responses: Subject<ListResponse>[];

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

        TestBed.configureTestingModule({
            declarations: [ProcessRepoComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: ProcessRepoService, useValue: repoService },
                { provide: AuthorizationService, useValue: { getUserId: () => 'u1' } },
                { provide: PermissionsService, useClass: PermissionsMockService },
                { provide: MetadataExistenceService, useValue: { warningsForBpmn: () => of(new Map<string, string>()) } },
                { provide: UtilService, useValue: { convertSVGtoBase64: () => '' } },
                { provide: SearchbarService, useValue: { currentSearchText: of('') } },
                { provide: ResponsiveService, useValue: { getActiveMqAlias: () => 'md', observeMqAlias: () => of('md') } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: Router, useValue: {} },
            ],
        });
        component = TestBed.createComponent(ProcessRepoComponent).componentInstance;
        (component as any).limitInit = 2;
    });

    const load = (tab: number) => {
        component.activeIndex = tab;
        (component as any).getRepoItems(true);
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

    it('keeps the permissions of earlier pages after loading the next one', () => {
        load(0);
        responses[0].next({ result: [process('a', 'u1'), process('b', 'u2')], total: 3 });
        component.onScroll();
        responses[1].next({ result: [process('c', 'u1')], total: 3 });

        expect(component.hasXPermission({ _id: 'a' })).toBeTrue();
        expect(component.hasXPermission({ _id: 'c' })).toBeTrue();
    });

    it('drops the answer of a superseded listing', () => {
        load(0);
        load(1);
        responses[0].next({ result: [process('other', 'u2')], total: 1 });
        responses[1].next({ result: [process('own', 'u1')], total: 1 });

        expect(component.repoItems.value.map((p: ProcessModel) => p._id)).toEqual(['own']);
    });
});
