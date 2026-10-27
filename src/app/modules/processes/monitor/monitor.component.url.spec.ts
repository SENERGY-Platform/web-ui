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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ProcessMonitorComponent } from './monitor.component';
import { MonitorService } from './shared/monitor.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { MonitorFogFactory } from './shared/monitor-fog.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { MonitorProcessModel } from './shared/monitor-process.model';
import { MonitorProcessTotalModel } from './shared/monitor-process-total.model';

interface Request {
    filter: string;
    search: string;
    offset: number;
    sort: string;
    order: string;
}

// Real router, searchbar and tab group: the two tabs share one URL, so what each of them reads and writes matters.
describe('ProcessMonitorComponent view state in the URL', () => {
    let fixture: ComponentFixture<ProcessMonitorComponent>;
    let component: ProcessMonitorComponent;
    let router: Router;
    let requests: Request[];
    let totals: { unfinished: number; finished: number };

    const row = { id: 'p1', processDefinitionName: 'Washer', startTime: '2026-01-02T10:00:00Z', state: 'ACTIVE' } as MonitorProcessModel;

    function open(url: string): void {
        requests = [];
        const monitorService = jasmine.createSpyObj<MonitorService>('MonitorService', ['getFilteredHistoryInstances', 'openDetailsDialog']);
        // answered after the view exists, as a request is
        monitorService.getFilteredHistoryInstances.and.callFake((filter, _type, search, _limit, offset, sort, order) => {
            requests.push({ filter, search, offset, sort, order });
            return of({ total: totals[filter as 'finished' | 'unfinished'], data: [row] } as MonitorProcessTotalModel).pipe(delay(1));
        });
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessMonitorComponent],
            providers: [
                provideRouter([]),
                { provide: MonitorService, useValue: monitorService },
                { provide: DialogsService, useValue: {} },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([]) } },
                { provide: MonitorFogFactory, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        fixture = TestBed.createComponent(ProcessMonitorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        settle();
    }

    function settle(): void {
        tick(400);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    function clickTab(index: number): void {
        (fixture.nativeElement.querySelectorAll('[role="tab"]')[index] as HTMLElement).click();
        fixture.detectChanges();
        settle();
    }

    const requestsOf = (filter: string): Request[] => requests.filter((r) => r.filter === filter);
    const lastOf = (filter: string): Request => requestsOf(filter)[requestsOf(filter).length - 1];
    const searchTexts = (): string[] => Array.from(fixture.nativeElement.querySelectorAll('senergy-searchbar input')).map((i) => (i as HTMLInputElement).value);

    beforeEach(() => {
        totals = { unfinished: 5, finished: 100 };
    });

    describe('page and sort of the tabs', () => {
        it('opens the selected tab on the page of the URL and keeps it when the other tab answers', fakeAsync(() => {
            open('/?tab=1&page=3');

            expect(component.paginatorFinished.pageIndex).toBe(3);
            expect(component.paginatorRunning.pageIndex).toBe(0);
            expect(requestsOf('finished').map((r) => r.offset)).toEqual([60]);
            expect(requestsOf('unfinished').map((r) => r.offset)).toEqual([0]);
            expect(router.url).toBe('/?tab=1&page=3');
            expect(fixture.nativeElement.querySelector('.mat-mdc-paginator-range-label').textContent).toContain('61');
        }));

        it('does not move the paginator of the other tab with a page change', fakeAsync(() => {
            open('/?tab=1&page=3');

            component.paginatorFinished.nextPage();
            settle();

            expect(router.url).toBe('/?tab=1&page=4');
            expect(component.paginatorFinished.pageIndex).toBe(4);
            expect(component.paginatorRunning.pageIndex).toBe(0);
            expect(requestsOf('unfinished').length).toBe(1);
            expect(lastOf('finished').offset).toBe(80);
        }));

        it('takes the sort of the URL for the selected tab only', fakeAsync(() => {
            open('/?tab=1&sort=endTime&dir=asc');

            expect(lastOf('finished')).toEqual(jasmine.objectContaining({ sort: 'endTime', order: 'asc' }));
            expect(lastOf('unfinished')).toEqual(jasmine.objectContaining({ sort: 'startTime', order: 'desc' }));
        }));

        it('starts the tab it switches to on the first page before it loads', fakeAsync(() => {
            totals.unfinished = 100;
            open('/');
            component.paginatorRunning.nextPage();
            settle();
            expect(router.url).toBe('/?page=1');

            clickTab(1);

            expect(lastOf('finished').offset).toBe(0);
            expect(component.paginatorFinished.pageIndex).toBe(0);
            expect(router.url).toBe('/?tab=1');
        }));

        it('starts the tab it switches to on the default sort before it loads', fakeAsync(() => {
            open('/?tab=1');
            component.sortFinished.sort({ id: 'endTime', start: 'asc', disableClear: true });
            settle();
            expect(router.url).toBe('/?tab=1&sort=endTime&dir=asc');

            clickTab(0);
            clickTab(1);

            expect(lastOf('finished')).toEqual(jasmine.objectContaining({ sort: 'startTime', order: 'desc', offset: 0 }));
            expect(component.sortFinished.active).toBe('startTime');
            expect(component.sortFinished.direction).toBe('desc');
            expect(router.url).toBe('/?tab=1');
        }));
    });

    describe('search of the tabs', () => {
        it('clears the search in the URL and in the searchbars when the tab changes', fakeAsync(() => {
            open('/?search=foo');
            expect(lastOf('unfinished').search).toBe('foo');

            clickTab(1);

            expect(lastOf('finished').search).toBe('');
            expect(router.url).toBe('/?tab=1');
            expect(searchTexts()).toEqual(['']);

            clickTab(0);

            expect(lastOf('unfinished').search).toBe('');
            expect(router.url).toBe('/');
            expect(searchTexts()).toEqual(['']);
        }));
    });
});
