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

import {ErrorStateMatcher} from '@angular/material/core';
import {IOModel} from './operator.model';

function counts(ios: IOModel[] | undefined): Map<string, number> {
    const result = new Map<string, number>();
    for (const io of ios ?? []) {
        if (io.name) {
            result.set(io.name, (result.get(io.name) ?? 0) + 1);
        }
    }
    return result;
}

/** The names that occur more than once, compared exactly as the repository does; rows without a name are skipped. */
export function duplicateNames(ios: IOModel[] | undefined): Set<string> {
    return new Set([...counts(ios)].filter(([, count]) => count > 1).map(([name]) => name));
}

/** The duplicates an edit introduced: names that occur more often than before and more than once. */
export function newDuplicateNames(ios: IOModel[] | undefined, before: IOModel[] | undefined): Set<string> {
    const earlier = counts(before);
    return new Set([...counts(ios)].filter(([name, count]) => count > 1 && count > (earlier.get(name) ?? 0)).map(([name]) => name));
}

/** Names that differ from another name only in surrounding spaces; the repository treats them as different. */
export function lookalikeNames(ios: IOModel[] | undefined): Set<string> {
    const byTrimmed = new Map<string, Set<string>>();
    for (const io of ios ?? []) {
        const trimmed = io.name?.trim();
        if (trimmed) {
            byTrimmed.set(trimmed, (byTrimmed.get(trimmed) ?? new Set<string>()).add(io.name));
        }
    }
    const result = new Set<string>();
    for (const names of byTrimmed.values()) {
        if (names.size > 1) {
            names.forEach(name => result.add(name));
        }
    }
    return result;
}

/** A row needs a name and a type; a blank row must never be sent. */
export function isIncomplete(io: IOModel): boolean {
    return !io.name?.trim() || !io.type;
}

function rowKey(io: IOModel): string {
    return JSON.stringify([io.name ?? null, io.type ?? null]);
}

/** The incomplete rows that stop a save: all of them, except those that are in the stored list unchanged. */
export function blockingIncompleteRows(ios: IOModel[] | undefined, before: IOModel[] | undefined): Set<IOModel> {
    const stored = new Map<string, number>();
    for (const io of before ?? []) {
        if (isIncomplete(io)) {
            stored.set(rowKey(io), (stored.get(rowKey(io)) ?? 0) + 1);
        }
    }
    const blocking = new Set<IOModel>();
    for (const io of ios ?? []) {
        if (!isIncomplete(io)) {
            continue;
        }
        const left = stored.get(rowKey(io)) ?? 0;
        if (left > 0) {
            stored.set(rowKey(io), left - 1);
        } else {
            blocking.add(io);
        }
    }
    return blocking;
}

/** Whether the list has a row that blocks saving: an incomplete one that is not stored as it is, or a duplicate the edit introduced. */
export function hasBlockingRows(ios: IOModel[] | undefined, before: IOModel[] | undefined): boolean {
    return blockingIncompleteRows(ios, before).size > 0 || newDuplicateNames(ios, before).size > 0;
}

/** Puts a form field into its error state from our own rule instead of the control's validators. */
export function stateMatcher(isError: () => boolean): ErrorStateMatcher {
    return {isErrorState: () => isError()};
}
