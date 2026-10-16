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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ListToolbarComponent } from './list-toolbar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ListToolbarComponent],
    template: `
        <senergy-list-toolbar [selectedCount]="count" (clearSelection)="cleared = cleared + 1" (refresh)="refreshed = refreshed + 1">
            <span toolbarFilters class="filter-slot">filter</span>
            <button bulkActions class="bulk-slot">bulk</button>
        </senergy-list-toolbar>
    `,
})
class HostComponent {
    count = 0;
    cleared = 0;
    refreshed = 0;
}

describe('ListToolbarComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
    const hidden = (selector: string) => el(selector).hidden;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HostComponent, NoopAnimationsModule] });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('shows search and filters without a selection', () => {
        expect(hidden('.toolbar-row')).toBeFalse();
        expect(hidden('.selection-bar')).toBeTrue();
        expect(el('.toolbar-row senergy-searchbar')).not.toBeNull();
        expect(el('.toolbar-row .filter-slot')).not.toBeNull();
    });

    it('replaces the toolbar with the selection bar and its count when rows are selected', () => {
        host.count = 3;
        fixture.detectChanges();

        expect(hidden('.toolbar-row')).toBeTrue();
        expect(hidden('.selection-bar')).toBeFalse();
        expect(el('.selection-count').textContent).toContain('3 selected');
        expect(el('.selection-bar .bulk-slot')).not.toBeNull();
    });

    it('keeps the searchbar alive during a selection so the search text survives', () => {
        const bar = el('senergy-searchbar');
        host.count = 2;
        fixture.detectChanges();
        host.count = 0;
        fixture.detectChanges();

        expect(el('senergy-searchbar')).toBe(bar);
    });

    it('emits clearSelection from the clear button', () => {
        host.count = 1;
        fixture.detectChanges();
        el('.selection-clear').click();

        expect(host.cleared).toBe(1);
    });

    it('emits refresh from the search field refresh button', () => {
        el('.toolbar-row button').click();

        expect(host.refreshed).toBe(1);
    });

    it('uses the compact search field without floating label', () => {
        expect(el('senergy-searchbar mat-label')).toBeNull();
        expect(el('senergy-searchbar input').getAttribute('placeholder')).toBe('Search');
    });
});
