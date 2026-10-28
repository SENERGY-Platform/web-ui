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

import { parseSuggestionDocument } from './automation-suggestion.parser';
import { powerTriggerFixture, suggestionFixture } from './automation-suggestion.fixtures';

describe('parseSuggestionDocument', () => {
    const document = (suggestions: unknown[]) => JSON.stringify({
        version: 'abc',
        trained_at: '2026-10-28T03:12:00Z',
        history: { from: '2025-10-28', to: '2026-10-28' },
        suggestions,
    });

    it('returns no suggestions for an empty or missing value', () => {
        expect(parseSuggestionDocument(null)).toEqual([]);
        expect(parseSuggestionDocument(undefined)).toEqual([]);
        expect(parseSuggestionDocument('  ')).toEqual([]);
    });

    it('reads the suggestions of the document with their fields', () => {
        const suggestion = suggestionFixture({ auto_off_s: 120 });
        const parsed = parseSuggestionDocument(document([suggestion]));
        expect(parsed).toEqual([suggestion]);
    });

    it('reads a suggestion without auto_off_s as null', () => {
        const raw = suggestionFixture() as unknown as Record<string, unknown>;
        delete raw['auto_off_s'];
        const parsed = parseSuggestionDocument(document([raw]));
        expect(parsed[0].auto_off_s).toBeNull();
    });

    it('reads a document with an empty suggestion list', () => {
        expect(parseSuggestionDocument(document([]))).toEqual([]);
    });

    it('throws for a value that is not JSON', () => {
        expect(() => parseSuggestionDocument('{not json')).toThrowError(SyntaxError);
    });

    it('throws for a document without a suggestions array', () => {
        expect(() => parseSuggestionDocument(JSON.stringify({ version: 'abc' }))).toThrowError(/no suggestions array/);
        expect(() => parseSuggestionDocument('[]')).toThrowError(/no suggestions array/);
    });

    it('skips entries that do not match the contract and keeps the others', () => {
        const broken = { ...suggestionFixture(), trigger: { device_id: 'd' } };
        const noTargets = { ...suggestionFixture(), targets: 'none' };
        const badTarget = suggestionFixture({
            targets: [{ device_id: 'd', service_id: 's', path: 'p', function_id: null, value: { nested: true } as unknown as boolean }],
        });
        const good = suggestionFixture({ id: 'sug-2' });
        const parsed = parseSuggestionDocument(document([broken, noTargets, badTarget, good]));
        expect(parsed.map((s) => s.id)).toEqual(['sug-2']);
    });

    it('skips a trigger kind outside the contract', () => {
        const unknownKind = suggestionFixture({
            trigger: { device_id: 'd', service_id: 's', path: 'p', kind: 'temperature' as never, from: null, to: 'on' },
        });
        expect(parseSuggestionDocument(document([unknownKind]))).toEqual([]);
    });

    it('reads a power trigger with its thresholds and hold time', () => {
        const suggestion = suggestionFixture({ trigger: powerTriggerFixture() });
        const parsed = parseSuggestionDocument(document([suggestion]));
        expect(parsed[0].trigger).toEqual(powerTriggerFixture());
        expect(parsed[0].trigger.on_above_w).toBe(20);
        expect(parsed[0].trigger.off_below_w).toBe(10);
        expect(parsed[0].trigger.hold_s).toBe(60);
    });

    it('skips a power trigger without one of its numeric thresholds or hold time', () => {
        const withoutOn = powerTriggerFixture();
        delete withoutOn.on_above_w;
        const withoutOff = powerTriggerFixture();
        delete withoutOff.off_below_w;
        const withoutHold = powerTriggerFixture();
        delete withoutHold.hold_s;
        const textHold = powerTriggerFixture({ hold_s: '60' as unknown as number });
        const broken = [withoutOn, withoutOff, withoutHold, textHold].map((trigger) => suggestionFixture({ id: 'x', trigger }));
        const good = suggestionFixture({ id: 'sug-2', trigger: powerTriggerFixture() });
        expect(parseSuggestionDocument(document([...broken, good])).map((s) => s.id)).toEqual(['sug-2']);
    });
});
