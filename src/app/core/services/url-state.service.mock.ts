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

import { Injectable } from '@angular/core';
import { UrlStateService, UrlStateValue } from './url-state.service';

/**
 * UrlStateService over a plain parameter map, for specs whose Router is a stub: `params` is the URL, `writes` records
 * every `set`, also those of `setPage` and `setSort`. Parsing and the page and sort rules are the real ones.
 */
@Injectable()
export class UrlStateServiceMock extends UrlStateService {
    params: Record<string, string | string[]> = {};
    readonly writes: Record<string, UrlStateValue>[] = [];

    override get(key: string): string | null {
        const value = this.params[key];
        return value === undefined ? null : Array.isArray(value) ? (value[0] ?? null) : value;
    }

    override getAll(key: string): string[] {
        const value = this.params[key];
        return value === undefined ? [] : Array.isArray(value) ? value : [value];
    }

    override set(params: { [key: string]: UrlStateValue }): void {
        this.writes.push(params);
    }
}
