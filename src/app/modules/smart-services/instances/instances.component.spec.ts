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
import { Observable, of, Subject } from 'rxjs';
import { SmartServiceInstancesComponent } from './instances.component';

describe('SmartServiceInstancesComponent', () => {
    let getInstances: jasmine.Spy;
    let navigate: jasmine.Spy;
    let getExtendedReleaseList: jasmine.Spy;
    let component: SmartServiceInstancesComponent;

    const answer = (name: string) => ({ instances: [{ id: name, name } as any], total: 100 });

    const create = (params: { [key: string]: string }) => {
        navigate = jasmine.createSpy('navigate');
        component = new SmartServiceInstancesComponent(
            { userHasDeleteAuthorization: () => false, getInstances } as any,
            { pageSize: 20 } as any,
            {} as any,
            { navigate } as any,
            { queryParamMap: of(convertToParamMap(params)) } as any,
            { getSharableUsers: () => of([]) } as any,
            {} as any,
            {} as any,
            {} as any,
            { userIsDeveloper: () => false } as any,
            { getExtendedReleaseList } as any,
        );
        component.paginator = { pageIndex: Number(params['page'] || 0) } as MatPaginator;
    };

    beforeEach(() => {
        getInstances = jasmine.createSpy('getInstances').and.returnValue(of(answer('first')));
        getExtendedReleaseList = jasmine.createSpy('getExtendedReleaseList').and.returnValue(of({ releases: [], total: 0 }));
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
        expect(component.offset).toBe(0);
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

    it('maps the changed resources of the releases to their instances with one request', () => {
        const changed = [{ kind: 'flow', id: 'f1', reason: 'gone', at: 1 }];
        getInstances.and.returnValue(of({
            instances: [{ id: 'a', release_id: 'r1' }, { id: 'b', release_id: 'r1' }, { id: 'c', release_id: 'r2' }],
            total: 3,
        }));
        getExtendedReleaseList.and.returnValue(of({ releases: [{ id: 'r1', changed_resources: changed }, { id: 'r2' }], total: 2 }));
        create({});
        component.ngOnInit();

        expect(getExtendedReleaseList.calls.count()).toBe(1);
        expect(getExtendedReleaseList.calls.mostRecent().args[5]).toEqual(['r1', 'r2']);
        expect(component.changedResourcesByReleaseId.get('r1')).toEqual(changed as any);
        expect(component.changedResourcesByReleaseId.has('r2')).toBeFalse();
    });
});
