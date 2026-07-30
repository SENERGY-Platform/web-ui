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
import { BehaviorSubject, Observable } from 'rxjs';

/** Path of the report settings, which are edited like a report object. */
export const REPORT_SETTINGS_PATH = '';

/**
 * Selection and expansion state of the report editor tree.
 *
 * The state is kept by path instead of by node, so that it survives rebuilding the tree after an array item was
 * added or removed.
 *
 * Provided by the report component, so that every editor has its own instance.
 */
@Injectable()
export class ReportObjectViewService {

    private selected = new BehaviorSubject<string>(REPORT_SETTINGS_PATH);
    private expandedPaths = new Set<string>();

    get selected$(): Observable<string> {
        return this.selected.asObservable();
    }

    get selectedPath(): string {
        return this.selected.value;
    }

    select(path: string) {
        this.selected.next(path);
    }

    isExpanded(path: string): boolean {
        return this.expandedPaths.has(path);
    }

    toggle(path: string) {
        if (this.expandedPaths.has(path)) {
            this.expandedPaths.delete(path);
        } else {
            this.expandedPaths.add(path);
        }
    }

    expand(path: string) {
        this.expandedPaths.add(path);
    }

    expandAll(paths: string[]) {
        paths.forEach((path: string) => this.expandedPaths.add(path));
    }

    collapseAll() {
        this.expandedPaths.clear();
    }

    /**
     * Selects an object and opens all containers on the way to it.
     */
    reveal(path: string) {
        const keys = path.split('.');
        for (let i = 1; i < keys.length; i++) {
            this.expandedPaths.add(keys.slice(0, i).join('.'));
        }
        this.select(path);
    }
}
