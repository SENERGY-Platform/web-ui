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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { KeepPageInRangeDirective } from './keep-page-in-range.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatPaginatorModule, KeepPageInRangeDirective],
    template: `<mat-paginator senergyKeepPageInRange [length]="length" [pageSize]="10" [pageIndex]="pageIndex"
        (page)="events.push($event)"></mat-paginator>`,
})
class HostComponent {
    length = 0;
    pageIndex = 0;
    events: PageEvent[] = [];
}

describe('KeepPageInRangeDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    const render = async (length: number, pageIndex: number) => {
        host.length = length;
        host.pageIndex = pageIndex;
        fixture.detectChanges();
        await Promise.resolve();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, HostComponent],
        });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
    });

    it('moves a page beyond the length to the last page through a page event', async () => {
        await render(25, 5);
        expect(host.events.length).toBe(1);
        expect(host.events[0].pageIndex).toBe(2);
        expect(host.events[0].previousPageIndex).toBe(5);
    });

    it('leaves a page within the length alone', async () => {
        await render(25, 2);
        expect(host.events).toEqual([]);
    });

    it('waits for a length, since 0 is also what a list shows before its first answer', async () => {
        await render(0, 3);
        expect(host.events).toEqual([]);

        await render(45, 3);
        expect(host.events).toEqual([]);
    });
});
