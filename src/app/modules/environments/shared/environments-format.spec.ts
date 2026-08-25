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

import { formatBytes } from './environments-format';

describe('formatBytes', () => {
    it('formats a size under 1024 as bytes', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1023)).toBe('1023 B');
    });

    it('lands exactly on the next unit at a power-of-1024 boundary', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('does not round a boundary-minus-one value up into the next unit', () => {
        expect(formatBytes(1024 * 1024 - 1)).toBe('1024 KB');
    });

    it('rounds to one decimal place', () => {
        expect(formatBytes(1536)).toBe('1.5 KB'); // 1.5 * 1024
        expect(formatBytes(1234)).toBe('1.2 KB');
    });

    it('treats undefined and negative input as 0 B rather than throwing', () => {
        expect(formatBytes(undefined)).toBe('0 B');
        expect(formatBytes(-5)).toBe('0 B');
    });
});
