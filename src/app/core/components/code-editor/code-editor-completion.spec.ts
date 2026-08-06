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

import { replacedPrefixLength, toCompletionRequest } from './code-editor-completion';

describe('toCompletionRequest', () => {
    it('converts monaco\'s one-based position into ace\'s zero-based row and column', () => {
        const request = toCompletionRequest(['first', 'second'], 2, 4);

        expect(request).toEqual({ lines: ['first', 'second'], row: 1, column: 3 });
    });

    it('maps the start of the first line to row and column zero', () => {
        const request = toCompletionRequest([''], 1, 1);

        expect(request.row).toBe(0);
        expect(request.column).toBe(0);
    });
});

/*
 * This is what stops 'deviceRepo.deviceRepo.getAspect(...)'. Ace replaced only the
 * identifier under the cursor, so the already-typed 'deviceRepo.' survived and the
 * inserted completion repeated it.
 */
describe('replacedPrefixLength', () => {
    it('replaces the whole member expression in javascript', () => {
        expect(replacedPrefixLength('var x = deviceRepo.getAsp', true)).toBe('deviceRepo.getAsp'.length);
    });

    it('replaces only the last identifier when dotted chains are not wanted', () => {
        expect(replacedPrefixLength('var x = deviceRepo.getAsp', false)).toBe('getAsp'.length);
    });

    it('includes a trailing dot so the member being started is replaced too', () => {
        expect(replacedPrefixLength('deviceRepo.', true)).toBe('deviceRepo.'.length);
    });

    it('replaces nothing on an empty line, so a completion is simply inserted', () => {
        expect(replacedPrefixLength('', true)).toBe(0);
    });

    it('replaces nothing directly after whitespace', () => {
        expect(replacedPrefixLength('var x = ', true)).toBe(0);
    });

    it('stops at an operator rather than eating the expression before it', () => {
        expect(replacedPrefixLength('a+bcd', true)).toBe('bcd'.length);
    });

    it('leaves the opening ${ of a json placeholder alone', () => {
        expect(replacedPrefixLength('"value": "${cons', false)).toBe('cons'.length);
    });

    it('keeps $ and _ as part of an identifier', () => {
        expect(replacedPrefixLength('  $my_var', false)).toBe('$my_var'.length);
    });
});
