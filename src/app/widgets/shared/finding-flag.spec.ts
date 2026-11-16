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

import { isFinding } from './finding-flag';

describe('isFinding', () => {
    it('is true for boolean true, number 1 and the strings "1", "true", "True"', () => {
        [true, 1, '1', 'true', 'True', 'TRUE', ' 1 ', ' true '].forEach(value => {
            expect(isFinding(value)).withContext(JSON.stringify(value)).toBeTrue();
        });
    });

    it('is false for everything else', () => {
        [false, 0, 2, '0', 'false', 'False', '', 'yes', null, undefined, {}].forEach(value => {
            expect(isFinding(value)).withContext(JSON.stringify(value)).toBeFalse();
        });
    });
});
