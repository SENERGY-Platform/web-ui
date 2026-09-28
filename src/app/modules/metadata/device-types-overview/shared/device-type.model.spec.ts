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

import { criteriaAspectFields, deprecatedAspectAlias } from './device-type.model';

describe('deprecatedAspectAlias', () => {
    it('is undefined for an empty list', () => {
        expect(deprecatedAspectAlias([])).toBeUndefined();
    });

    it('is the alphabetically first id', () => {
        expect(deprecatedAspectAlias(['urn:infai:ses:aspect:water', 'urn:infai:ses:aspect:air'])).toBe('urn:infai:ses:aspect:air');
    });

    it('orders by code unit like the Go services, not by locale', () => {
        // Go's sort.Strings puts 'B' (0x42) before 'a' (0x61); localeCompare would pick 'urn:a1'
        expect(deprecatedAspectAlias(['urn:a1', 'urn:B2'])).toBe('urn:B2');
    });
});

describe('criteriaAspectFields', () => {
    it('writes no field for no aspect', () => {
        expect(criteriaAspectFields([])).toEqual({});
        expect(criteriaAspectFields([''])).toEqual({});
    });

    it('writes a single aspect in both spellings', () => {
        expect(criteriaAspectFields(['urn:infai:ses:aspect:air'])).toEqual({
            aspect_id: 'urn:infai:ses:aspect:air',
            aspect_ids: ['urn:infai:ses:aspect:air'],
        });
    });

    it('sorts and deduplicates the list and names its first id as the alias', () => {
        expect(criteriaAspectFields(['urn:a1', 'urn:B2', 'urn:a1'])).toEqual({ aspect_id: 'urn:B2', aspect_ids: ['urn:B2', 'urn:a1'] });
    });

    it('leaves the list it was given untouched', () => {
        const ids = ['urn:b', 'urn:a'];
        criteriaAspectFields(ids);
        expect(ids).toEqual(['urn:b', 'urn:a']);
    });
});
