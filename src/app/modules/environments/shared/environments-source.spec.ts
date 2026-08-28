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

import { applySourceKind, withFactorSet } from './environments-source';
import { Source } from './environments.model';

describe('applySourceKind', () => {
    it('drops the other variants when switching from script to profile', () => {
        const source: Source = { kind: 'script', interval_seconds: 5, script: { code: 'return 1;' } };
        const result = applySourceKind(source, 'profile');
        expect(result).toEqual({ kind: 'profile', interval_seconds: 0, profile: {} });
        expect(result.script).toBeUndefined();
    });

    // Regression: profile/dataset/formula have no editor for interval_seconds and the API
    // rejects a nonzero value there, so a value left over from script must not survive the
    // switch -- otherwise the user is stuck with a rejected save and no field to fix it.
    it('resets interval_seconds to 0 when switching away from script', () => {
        const source: Source = { kind: 'script', interval_seconds: 30, script: { code: 'return 1;' } };
        expect(applySourceKind(source, 'profile').interval_seconds).toBe(0);
        expect(applySourceKind(source, 'dataset').interval_seconds).toBe(0);
        expect(applySourceKind(source, 'formula').interval_seconds).toBe(0);
    });

    it('preserves interval_seconds when switching to script', () => {
        const source: Source = { kind: 'profile', interval_seconds: 0, profile: { base: 1 } };
        const withInterval: Source = { ...source, interval_seconds: 0 };
        expect(applySourceKind(withInterval, 'script').interval_seconds).toBe(0);

        const scriptSource: Source = { kind: 'script', interval_seconds: 15, script: {} };
        expect(applySourceKind(scriptSource, 'script').interval_seconds).toBe(15);
    });

    it('drops dataset and profile when switching to formula', () => {
        const source: Source = {
            kind: 'dataset',
            dataset: { origin: 'file', ref: 'd1' },
            profile: { base: 10 },
        };
        const result = applySourceKind(source, 'formula');
        expect(result.dataset).toBeUndefined();
        expect(result.profile).toBeUndefined();
        expect(result.formula).toEqual({});
        expect(result.kind).toBe('formula');
    });

    it('keeps the existing variant config when switching to the kind that is already active', () => {
        const source: Source = { kind: 'script', script: { code: 'return 1;' } };
        const result = applySourceKind(source, 'script');
        expect(result.script).toEqual({ code: 'return 1;' });
    });

    it('does not mutate the source that was passed in', () => {
        const source: Source = { kind: 'script', script: { code: 'return 1;' } };
        applySourceKind(source, 'profile');
        expect(source.kind).toBe('script');
        expect(source.script).toEqual({ code: 'return 1;' });
    });

    // aggregate has no variant object at all -- the whole configuration is the
    // sub-metering tree, so nothing gets materialised for it.
    it('drops every other variant and materialises nothing when switching to aggregate', () => {
        const source: Source = { kind: 'script', script: { code: 'return 1;' }, interval_seconds: 5 };
        const result = applySourceKind(source, 'aggregate');
        expect(result).toEqual({ kind: 'aggregate', interval_seconds: 0 });
        expect(result.script).toBeUndefined();
    });

    it('drops the other variants when switching from script to schedule', () => {
        const source: Source = { kind: 'script', interval_seconds: 5, script: { code: 'return 1;' } };
        const result = applySourceKind(source, 'schedule');
        expect(result).toEqual({ kind: 'schedule', interval_seconds: 0, schedule: {} });
        expect(result.script).toBeUndefined();
    });

    it('resets interval_seconds to 0 when switching to aggregate or schedule', () => {
        const source: Source = { kind: 'script', interval_seconds: 30, script: { code: 'return 1;' } };
        expect(applySourceKind(source, 'aggregate').interval_seconds).toBe(0);
        expect(applySourceKind(source, 'schedule').interval_seconds).toBe(0);
    });

    it('keeps the existing schedule config when switching to schedule again', () => {
        const source: Source = { kind: 'schedule', schedule: { state_key: 'programme', states: [{ name: 'idle' }] } };
        const result = applySourceKind(source, 'schedule');
        expect(result.schedule).toEqual({ state_key: 'programme', states: [{ name: 'idle' }] });
    });
});

describe('withFactorSet', () => {
    it('materialises a 24-entry array of neutral defaults on the first edit', () => {
        const result = withFactorSet(undefined, 24, 3, 1.5);
        expect(result.length).toBe(24);
        expect(result[3]).toBe(1.5);
        expect(result.filter((_, i) => i !== 3).every(v => v === 1)).toBe(true);
    });

    it('keeps the rest of an already-materialised array untouched', () => {
        const existing = new Array(7).fill(1);
        existing[0] = 0.5;
        const result = withFactorSet(existing, 7, 6, 2);
        expect(result[0]).toBe(0.5);
        expect(result[6]).toBe(2);
        expect(existing[6]).toBe(1); // input not mutated
    });

    it('re-materialises with defaults if the existing array has the wrong length', () => {
        const result = withFactorSet([1, 2], 24, 0, 9);
        expect(result.length).toBe(24);
        expect(result[0]).toBe(9);
        expect(result[1]).toBe(1);
    });
});
