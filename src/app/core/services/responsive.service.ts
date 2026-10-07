/*
 * Copyright 2020 InfAI (CC SES)
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

import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { asapScheduler, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// Bounded ranges in the order the aliases are probed; the upper bounds end at .98px so adjacent ranges never overlap.
const mqQueries = new Map<string, string>([
    ['xs', 'screen and (min-width: 0px) and (max-width: 599.98px)'],
    ['sm', 'screen and (min-width: 600px) and (max-width: 959.98px)'],
    ['md', 'screen and (min-width: 960px) and (max-width: 1279.98px)'],
    ['lg', 'screen and (min-width: 1280px) and (max-width: 1919.98px)'],
    ['xl', 'screen and (min-width: 1920px) and (max-width: 4999.98px)'],
]);

@Injectable({
    providedIn: 'root',
})
export class ResponsiveService {
    constructor(private breakpointObserver: BreakpointObserver) {}

    getActiveMqAlias(): string {
        for (const [alias, query] of mqQueries) {
            if (this.breakpointObserver.isMatched(query)) {
                return alias;
            }
        }
        return '';
    }

    // Emits the current alias asynchronously after subscribing and then on every change, like the former MediaObserver.
    observeMqAlias(): Observable<string> {
        return this.breakpointObserver.observe([...mqQueries.values()]).pipe(
            debounceTime(0, asapScheduler),
            map(() => this.getActiveMqAlias()),
            distinctUntilChanged(),
        );
    }
}
