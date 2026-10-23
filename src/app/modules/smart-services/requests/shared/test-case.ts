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

/** The most the service stores of a test case: its compacted bytes. */
export const MAX_TEST_CASE_BYTES = 65536;

/** Bytes of the text without the whitespace between tokens, which is what the service compacts away and counts. */
export function compactedByteLength(text: string): number {
    let compact = '';
    let inString = false;
    let escaped = false;
    for (const char of text) {
        if (inString) {
            compact += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
        } else if (char === '"') {
            inString = true;
            compact += char;
        } else if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
            compact += char;
        }
    }
    return new TextEncoder().encode(compact).length;
}

/** Why the text cannot be sent as a test case, or null when it is a JSON object within the size limit. */
export function testCaseError(text: string): string | null {
    if (text.trim() === '') {
        return 'Enter the test case as a JSON object, or remove it.';
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return 'The test case is no valid JSON.';
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return 'The test case must be a JSON object.';
    }
    return compactedByteLength(text) > MAX_TEST_CASE_BYTES ? 'The test case is larger than ' + MAX_TEST_CASE_BYTES + ' bytes without whitespace.' : null;
}
