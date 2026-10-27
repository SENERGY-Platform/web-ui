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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { ProcessMonitorComponent } from './monitor.component';
import { MonitorFogFactory } from './shared/monitor-fog.service';
import { MonitorService } from './shared/monitor.service';
import { CoreModule } from '../../../core/core.module';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { DialogsService } from '../../../core/services/dialogs.service';
import { UtilService } from '../../../core/services/util.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';

describe('ProcessMonitorComponent view state in the URL', () => {
    let getInstances: jasmine.Spy;
    let fixture: ComponentFixture<ProcessMonitorComponent>;
    let router: Router;

    // arguments of getFilteredHistoryInstances: filter, search type, search value, limit, offset, sort, order
    const loads = (filter: string) => getInstances.calls.allArgs().filter((args) => args[0] === filter);
    const lastLoad = (filter: string) => loads(filter)[loads(filter).length - 1];

    beforeEach(() => {
        localStorage.removeItem('PreferencesService/pageSize');
        // 30 running and 100 finished processes: the Running paginator has fewer pages than the Finished one
        // answered after the first check, like a request
        getInstances = jasmine.createSpy('getFilteredHistoryInstances').and.callFake((filter: string) =>
            of({ total: filter === 'unfinished' ? 30 : 100, data: [] }).pipe(delay(1)),
        );
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ProcessMonitorComponent],
            imports: [CoreModule, NoopAnimationsModule, MatTabsModule, MatMenuModule, MatTableModule, MatSortModule, MatPaginatorModule, KeepPageInRangeDirective],
            providers: [
                provideRouter([]),
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: MonitorService, useValue: { getFilteredHistoryInstances: getInstances } },
                { provide: MonitorFogFactory, useValue: {} },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([]) } },
                { provide: DialogsService, useValue: {} },
                { provide: UtilService, useValue: { dateIsToday: () => false } },
            ],
        });
        router = TestBed.inject(Router);
    });

    function open(url: string) {
        router.navigateByUrl(url);
        tick();
        fixture = TestBed.createComponent(ProcessMonitorComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    function selectTab(index: number) {
        (fixture.nativeElement.querySelectorAll('[role="tab"]')[index] as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
    }

    it('keeps the page of the selected tab when the other tab has fewer pages', fakeAsync(() => {
        open('/?tab=1&page=2&sort=id&dir=asc');
        discardPeriodicTasks();
        flush();

        expect(router.url).toBe('/?tab=1&page=2&sort=id&dir=asc');
        expect(fixture.componentInstance.paginatorFinished.pageIndex).toBe(2);
        expect(lastLoad('finished')[4]).toBe(40);
    }));

    it('loads the tab it switches to with the defaults and not with the view of the other tab', fakeAsync(() => {
        open('/?page=1&sort=id&dir=asc');
        expect(lastLoad('unfinished').slice(4, 7)).toEqual([20, 'id', 'asc']);

        selectTab(1);
        discardPeriodicTasks();
        flush();

        expect(lastLoad('finished').slice(4, 7)).toEqual([0, 'startTime', 'desc']);
        expect(router.url).toBe('/?tab=1');
    }));

    it('clears the search in the URL and in the searchbars when the tab changes', fakeAsync(() => {
        open('/?search=foo');
        expect(lastLoad('unfinished')[2]).toBe('foo');

        selectTab(1);
        discardPeriodicTasks();
        flush();

        expect(router.url).toBe('/?tab=1');
        expect(lastLoad('finished')[2]).toBe('');
        const searchbars = fixture.debugElement.queryAll(By.directive(SearchbarComponent));
        expect(searchbars.length).toBeGreaterThan(0);
        searchbars.forEach((searchbar) => {
            expect((searchbar.componentInstance as SearchbarComponent).formControl.value).toBe('');
        });
    }));
});
