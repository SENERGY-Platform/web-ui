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

import { HttpErrorResponse } from '@angular/common/http';
import { AutomationSuggestion, SuggestionStats, SuggestionWindow } from './automation-suggestion.model';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Weekdays as a short phrase; 0 = Monday. */
export function formatWeekdays(weekdays: number[]): string {
    const days = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    if (days.length === 7) {
        return 'every day';
    }
    if (days.length === 5 && days[0] === 0 && days[4] === 4) {
        return 'Mon–Fri';
    }
    if (days.length === 2 && days[0] === 5 && days[1] === 6) {
        return 'Sat–Sun';
    }
    return days.map((d) => weekdayNames[d]).join(', ');
}

/** Window as the list shows it, e.g. "19:00–02:00 · Mon–Fri". The time zone is not part of it. */
export function formatWindow(window: SuggestionWindow): string {
    return [`${window.from}–${window.to}`, formatWeekdays(window.weekdays)].filter((part) => part !== '').join(' · ');
}

/** Subtitle of a suggestion: its window, then how often the trigger is followed. */
export function formatSuggestionSubtitle(suggestion: AutomationSuggestion): string {
    return `${formatWindow(suggestion.window)} · ${formatStats(suggestion.stats)}`;
}

export function formatAutoOff(autoOffS: number | null): string | null {
    return autoOffS === null ? null : `switched back after ${autoOffS} s`;
}

/**
 * State line of an accepted automation: "Active · off after 180 s" or "Active · no auto-off". An undefined
 * delay means the module predates the field, and only "Active" is shown.
 */
export function formatActiveState(autoOffS: number | null | undefined): string {
    if (autoOffS === undefined) {
        return 'Active';
    }
    return autoOffS === null ? 'Active · no auto-off' : `Active · off after ${autoOffS} s`;
}

/** "follows in 31 % of 100 triggers". The occurrence unit is not part of the export contract. */
export function formatStats(stats: SuggestionStats): string {
    return `follows in ${Math.round(stats.confidence * 100)} % of ${stats.occurrences} triggers`;
}

/** Text for a failed call. A 403 from the automation engine is named, since the route permissions are not verified yet. */
export function describeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
        return 'Not allowed: the automation engine refused the request (403). The permissions for /automation-engine are probably not granted to this user.';
    }
    return fallback;
}
