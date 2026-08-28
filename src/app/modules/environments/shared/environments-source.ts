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

import { Source, SourceKind } from './environments.model';

/**
 * Returns a new Source with only the given variant set. The API rejects a Source that
 * carries more than one of script/profile/dataset/formula, so switching the kind must
 * drop the others rather than just adding the new one alongside them.
 *
 * interval_seconds ("own compute interval") only has an editor for the script kind, and
 * the API rejects a nonzero value on the other three -- carrying over whatever a script
 * source had set would leave the user stuck with a rejected save and no field to fix it
 * from, so switching away from script resets it to 0 instead of preserving it.
 */
export function applySourceKind(source: Source, kind: SourceKind): Source {
    const next: Source = { kind, interval_seconds: kind === 'script' ? source.interval_seconds : 0 };
    switch (kind) {
        case 'script':
            next.script = source.script || {};
            break;
        case 'profile':
            next.profile = source.profile || {};
            break;
        case 'dataset':
            next.dataset = source.dataset || {};
            break;
        case 'formula':
            next.formula = source.formula || {};
            break;
        case 'aggregate':
            // Configurationless: the whole configuration is the sub-metering tree, so
            // there is no variant object to materialise here.
            break;
    }
    return next;
}

/**
 * hour_factors/weekday_factors start out unset ("leave empty = neutral"). The first edit
 * to any single entry has to materialise the whole array with neutral (1) defaults, since
 * a sparse array would leave the other hours/weekdays undefined instead of neutral.
 */
export function withFactorSet(factors: number[] | undefined, length: number, index: number, value: number): number[] {
    const next = factors && factors.length === length ? [...factors] : new Array(length).fill(1);
    next[index] = value;
    return next;
}
