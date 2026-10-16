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

import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';

/**
 * Reads every page of an API that takes limit and offset but reports no total, for lists that page on the client.
 * A page shorter than `chunk` ends the loop.
 */
export function loadAllPages<T>(fetchPage: (limit: number, offset: number) => Observable<T[]>, chunk = 500): Observable<T[]> {
    return fetchPage(chunk, 0).pipe(
        expand((page, index) => page.length === chunk ? fetchPage(chunk, (index + 1) * chunk) : EMPTY),
        reduce((all: T[], page: T[]) => all.concat(page), []),
    );
}
