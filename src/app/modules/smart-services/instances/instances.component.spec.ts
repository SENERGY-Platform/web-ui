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
import { Observable, of, Subject } from 'rxjs';
import { SmartServiceInstancesComponent } from './instances.component';
import { SmartServiceInstanceService } from './shared/instances.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceModuleService } from './shared/modules.service';
import { SmartServiceInstanceDialogService } from './shared/instance-dialog.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';

describe('SmartServiceInstancesComponent', () => {
    let getInstances: jasmine.Spy;
    let navigate: jasmine.Spy;
    let component: SmartServiceInstancesComponent;

    const answer = (name: string) => ({ instances: [{ id: name, name } as any], total: 100 });

    const create = (params: { [key: string]: string }) => {
        navigate = jasmine.createSpy('navigate');
        TestBed.configureTestingModule({
            providers: [
                { provide: SmartServiceInstanceService, useValue: { userHasDeleteAuthorization: () => false, getInstances } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: { navigate } },
                { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
                { provide: PermissionsService, useValue: { getSharableUsers: () => of([]) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: SmartServiceModuleService, useValue: {} },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { userIsDeveloper: () => false } },
            ],
        });
        component = TestBed.runInInjectionContext(() => new SmartServiceInstancesComponent());
        component.paginator = { pageIndex: Number(params['page'] || 0) } as MatPaginator;
    };

    beforeEach(() => {
        getInstances = jasmine.createSpy('getInstances').and.returnValue(of(answer('first')));
    });

    it('restores the page of the URL on the first load', () => {
        create({ page: '2' });
        component.ngOnInit();

        expect(getInstances.calls.mostRecent().args[0].offset).toBe(40);
    });

    it('goes back to the first page when the sorting changes', () => {
        create({ page: '2' });
        component.ngOnInit();
        getInstances.calls.reset();

        component.matSortChange({ active: 'created_at', direction: 'desc' });

        expect(component.pageIndex).toBe(0);
        expect(component.list.offset).toBe(0);
        expect(component.paginator.pageIndex).toBe(0);
        expect(navigate.calls.mostRecent().args[1].queryParams['page']).toBeUndefined();
        expect(getInstances.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ offset: 0, sort: 'created_at.desc' }));
    });

    it('loads the first page when the query parameters are cleared', () => {
        create({ page: '2' });
        component.ngOnInit();
        getInstances.calls.reset();

        component.clearQueryParams();

        expect(getInstances.calls.mostRecent().args[0].offset).toBe(0);
    });

    it('shows the newest load when an older one is answered last', () => {
        const older = new Subject<any>();
        const newer = new Subject<any>();
        getInstances.and.returnValues(older as Observable<any>, newer as Observable<any>);
        create({});
        component.ngOnInit();
        component.loadInstances();

        newer.next(answer('newer'));
        older.next(answer('older'));

        expect(component.dataSource.data.map(i => i.name)).toEqual(['newer']);
    });
});
