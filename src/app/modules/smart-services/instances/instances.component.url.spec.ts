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

import { convertToParamMap } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { of, Subject } from 'rxjs';
import { SmartServiceInstancesComponent } from './instances.component';

describe('SmartServiceInstancesComponent view state in the URL', () => {
    let navigate: jasmine.Spy;
    let component: SmartServiceInstancesComponent;
    let page: Subject<unknown>;

    const create = (params: { [key: string]: string }, urlSort = { active: 'name', direction: 'asc' }) => {
        navigate = jasmine.createSpy('navigate');
        page = new Subject();
        component = new SmartServiceInstancesComponent(
            { userHasDeleteAuthorization: () => false, getInstances: () => of({ instances: [], total: 100 }), getInstance: () => of(undefined) } as any,
            { pageSize: 20 } as any,
            {} as any,
            { navigate } as any,
            { queryParamMap: of(convertToParamMap(params)) } as any,
            { getSharableUsers: () => of([]) } as any,
            {} as any,
            {} as any,
            {} as any,
            { userIsDeveloper: () => false } as any,
            { getExtendedReleaseList: () => of({ releases: [], total: 0 }) } as any,
            { getSort: () => urlSort } as any,
        );
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
        create({ release_id: 'R', instance_id: 'I', page: '2' }, { active: 'created_at', direction: 'desc' });
        component.ngOnInit();

        component.clearQueryParams();

        expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ release_id: 'R', sort: 'created_at', dir: 'desc' });
    });
});
