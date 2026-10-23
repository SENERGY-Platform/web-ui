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

import { MAX_TEST_CASE_BYTES, compactedByteLength, testCaseError } from './test-case';

describe('test case validation', () => {
    it('takes a JSON object of any layout', () => {
        expect(testCaseError('{}')).toBeNull();
        expect(testCaseError(' {\n  "parameters": {"a": [1, 2]},\n  "standing": false\n}\n')).toBeNull();
    });

    it('asks for text when there is none', () => {
        expect(testCaseError('')).toContain('JSON object');
        expect(testCaseError(' \n ')).toContain('JSON object');
    });

    it('refuses anything that is no JSON object', () => {
        expect(testCaseError('[1]')).toContain('must be a JSON object');
        expect(testCaseError('"text"')).toContain('must be a JSON object');
        expect(testCaseError('42')).toContain('must be a JSON object');
        expect(testCaseError('null')).toContain('must be a JSON object');
        expect(testCaseError('{"a":')).toContain('no valid JSON');
    });

    it('does not count whitespace between tokens but counts it inside strings', () => {
        expect(compactedByteLength('{ "a" : 1 ,\n\t"b" : "x y" }')).toBe('{"a":1,"b":"x y"}'.length);
        expect(compactedByteLength('{"a":"say \\"hi \\" now"}')).toBe('{"a":"say \\"hi \\" now"}'.length);
    });

    it('counts bytes, not characters', () => {
        expect(compactedByteLength('{"a":"ä€\u{1F600}"}')).toBe('{"a":""}'.length + 2 + 3 + 4);
    });

    it('accepts exactly 65536 bytes and refuses one more', () => {
        const overhead = '{"a":""}'.length;
        const exact = '{"a":"' + 'x'.repeat(MAX_TEST_CASE_BYTES - overhead) + '"}';
        expect(compactedByteLength(exact)).toBe(MAX_TEST_CASE_BYTES);
        expect(testCaseError(exact)).toBeNull();
        expect(testCaseError(exact.replace('"x', '"xx'))).toContain('larger than 65536');
    });

    it('lets whitespace carry a test case over the limit as long as the compacted form fits', () => {
        const padded = '{"a":1}' + ' '.repeat(MAX_TEST_CASE_BYTES);
        expect(testCaseError(padded)).toBeNull();
    });
});
