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

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ResponsiveService } from './responsive.service';

// Evaluates the min-width/max-width pairs of a query against a viewport width.
class FakeBreakpointObserver {
    width = 1000;
    readonly changes = new Subject<BreakpointState>();

    isMatched(query: string): boolean {
        const min = /min-width: ([\d.]+)px/.exec(query);
        const max = /max-width: ([\d.]+)px/.exec(query);
        return (!min || this.width >= +min[1]) && (!max || this.width <= +max[1]);
    }

    observe(): Subject<BreakpointState> {
        return this.changes;
    }

    resize(width: number): void {
        this.width = width;
        this.changes.next({ matches: true, breakpoints: {} });
    }
}

describe('ResponsiveService', () => {
    let observer: FakeBreakpointObserver;
    let service: ResponsiveService;

    beforeEach(() => {
        observer = new FakeBreakpointObserver();
        TestBed.configureTestingModule({ providers: [{ provide: BreakpointObserver, useValue: observer }] });
        service = TestBed.runInInjectionContext(() => new ResponsiveService());
    });

    it('should name the range a width falls into, with the bounds belonging to the larger range', () => {
        const aliasAt = (width: number) => {
            observer.width = width;
            return service.getActiveMqAlias();
        };

        expect(aliasAt(0)).toBe('xs');
        expect(aliasAt(599.98)).toBe('xs');
        expect(aliasAt(600)).toBe('sm');
        expect(aliasAt(959.98)).toBe('sm');
        expect(aliasAt(960)).toBe('md');
        expect(aliasAt(1279.98)).toBe('md');
        expect(aliasAt(1280)).toBe('lg');
        expect(aliasAt(1919.98)).toBe('lg');
        expect(aliasAt(1920)).toBe('xl');
        expect(aliasAt(4999.98)).toBe('xl');
        expect(aliasAt(5000)).toBe('');
    });

    it('should emit the current alias asynchronously and then only when it changes', fakeAsync(() => {
        const seen: string[] = [];
        observer.width = 1000;
        service.observeMqAlias().subscribe((alias) => seen.push(alias));
        observer.changes.next({ matches: true, breakpoints: {} });
        expect(seen).toEqual([]);
        tick();
        expect(seen).toEqual(['md']);

        observer.resize(1100);
        tick();
        expect(seen).toEqual(['md']);

        observer.resize(500);
        tick();
        expect(seen).toEqual(['md', 'xs']);
    }));
});
