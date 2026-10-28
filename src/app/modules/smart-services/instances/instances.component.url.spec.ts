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
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { of, Subject } from 'rxjs';
import { SmartServiceInstancesComponent } from './instances.component';
import { SmartServiceInstanceService } from './shared/instances.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceModuleService } from './shared/modules.service';
import { SmartServiceInstanceDialogService } from './shared/instance-dialog.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { UrlStateServiceMock } from 'src/app/core/services/url-state.service.mock';

describe('SmartServiceInstancesComponent view state in the URL', () => {
    let navigate: jasmine.Spy;
    let component: SmartServiceInstancesComponent;
    let page: Subject<unknown>;

    const create = (params: { [key: string]: string }, urlSort = { sort: 'name', dir: 'asc' }) => {
        navigate = jasmine.createSpy('navigate');
        page = new Subject();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: SmartServiceInstanceService,
                    useValue: { userHasDeleteAuthorization: () => false, getInstances: () => of({ instances: [], total: 100 }), getInstance: () => of(undefined) },
                },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: { navigate } },
                { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
                { provide: PermissionsService, useValue: { getSharableUsers: () => of([]) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: SmartServiceModuleService, useValue: {} },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { userIsDeveloper: () => false } },
                { provide: SmartServiceReleasesService, useValue: { getExtendedReleaseList: () => of({ releases: [], total: 0 }) } },
                {
                    provide: UrlStateService,
                    useFactory: () => {
                        const urlState = new UrlStateServiceMock();
                        urlState.params = { ...params, ...urlSort };
                        return urlState;
                    },
                },
            ],
        });
        component = TestBed.runInInjectionContext(() => new SmartServiceInstancesComponent());
        component.paginator = { pageIndex: Number(params['page'] || 0), pageSize: 20, page } as unknown as MatPaginator;
    };

    it('replaces the history entry when the page changes, so Back does not return to a page keepPageInRange moved', () => {
        create({ page: '50' });
        component.ngOnInit();
        component.ngAfterViewInit();

        // the page keepPageInRange moves to once the list is known to have three pages
        (component.paginator as { pageIndex: number }).pageIndex = 2;
        page.next({ pageIndex: 2, previousPageIndex: 50, pageSize: 20, length: 50 });

        expect(navigate.calls.mostRecent().args[1].queryParams['page']).toBe(2);
        expect(navigate.calls.mostRecent().args[1].replaceUrl).toBeTrue();
    });

    it('keeps the release, the sort and the direction in the URL when the instance filter is cleared', () => {
        create({ release_id: 'R', instance_id: 'I', page: '2' }, { sort: 'created_at', dir: 'desc' });
        component.ngOnInit();

        component.clearQueryParams();

        expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ release_id: 'R', sort: 'created_at', dir: 'desc' });
    });
});
