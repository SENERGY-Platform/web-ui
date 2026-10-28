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

import { AutomationSuggestion, SuggestionTarget, SuggestionTrigger, SuggestionTriggerKind, SuggestionWindow } from './automation-suggestion.model';

const triggerKinds: SuggestionTriggerKind[] = ['binary', 'contact', 'button', 'position', 'power'];

/**
 * Reads the suggestion document of the export: a JSON string with `suggestions` as array, next to
 * `version`, `trained_at` and `history`. Missing or empty value means no list yet.
 *
 * Entries that do not match the contract are skipped one by one, so one broken suggestion does not
 * hide the others. A value that is not JSON or has no `suggestions` array is an error.
 */
export function parseSuggestionDocument(raw: string | null | undefined): AutomationSuggestion[] {
    if (raw == null || raw.trim() === '') {
        return [];
    }
    const document: unknown = JSON.parse(raw);
    if (!isRecord(document) || !Array.isArray(document['suggestions'])) {
        throw new Error('automation suggestions: document has no suggestions array');
    }
    return document['suggestions']
        .filter(isSuggestion)
        .map((suggestion) => ({ ...suggestion, auto_off_s: suggestion.auto_off_s ?? null }));
}

function isSuggestion(value: unknown): value is AutomationSuggestion {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value['id'] === 'string' && value['id'] !== ''
        && isTrigger(value['trigger'])
        && isWindow(value['window'])
        && Array.isArray(value['targets']) && value['targets'].every(isTarget)
        && (value['auto_off_s'] === null || value['auto_off_s'] === undefined || typeof value['auto_off_s'] === 'number')
        && isRecord(value['stats']) && typeof value['stats']['hits'] === 'number' && typeof value['stats']['occurrences'] === 'number';
}

function isTrigger(value: unknown): value is SuggestionTrigger {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value['device_id'] === 'string'
        && typeof value['service_id'] === 'string'
        && typeof value['path'] === 'string'
        && triggerKinds.includes(value['kind'] as SuggestionTriggerKind)
        && (value['from'] === null || typeof value['from'] === 'string')
        && typeof value['to'] === 'string'
        && (value['kind'] !== 'power' || hasPowerThresholds(value));
}

/** A power trigger carries its thresholds and hold time as numbers; without them it cannot be run. */
function hasPowerThresholds(value: Record<string, any>): boolean {
    return Number.isFinite(value['on_above_w']) && Number.isFinite(value['off_below_w']) && Number.isFinite(value['hold_s']);
}

function isWindow(value: unknown): value is SuggestionWindow {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value['from'] === 'string'
        && typeof value['to'] === 'string'
        && Array.isArray(value['weekdays']) && value['weekdays'].every((day) => typeof day === 'number')
        && typeof value['tz'] === 'string';
}

function isTarget(value: unknown): value is SuggestionTarget {
    if (!isRecord(value)) {
        return false;
    }
    const v = value['value'];
    return typeof value['device_id'] === 'string'
        && typeof value['service_id'] === 'string'
        && typeof value['path'] === 'string'
        && (value['function_id'] === null || typeof value['function_id'] === 'string')
        && (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string');
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
