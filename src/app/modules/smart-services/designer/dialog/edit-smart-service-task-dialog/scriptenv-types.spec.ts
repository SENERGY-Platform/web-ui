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

import { smartServiceScriptEnvTypes } from './scriptenv-types';

/*
 * Guards the vendored declarations against a bad refresh. They are what the editor
 * checks pre/postscripts against, so if they drift from what the runtime exposes the
 * editor confidently reports the wrong thing -- which is exactly what happened while
 * the upstream generator emitted go field names instead of json tag names.
 */
describe('vendored smart-service scriptenv declarations', () => {
    it('declares each injected namespace', () => {
        ['deviceRepo', 'inputs', 'outputs', 'util', 'variables'].forEach((namespace) => {
            expect(smartServiceScriptEnvTypes).toContain(namespace);
        });
    });

    it('names properties as the runtime exposes them, not as the go fields are named', () => {
        expect(smartServiceScriptEnvTypes).toContain('sub_aspects');
        expect(smartServiceScriptEnvTypes).not.toContain('SubAspects');
    });

    it('describes go maps as objects, since goja exposes them by property access', () => {
        expect(smartServiceScriptEnvTypes).not.toContain('Map<string,');
    });

    /*
     * Declaring nothing would disable diagnostics' usefulness rather than break the
     * build, so assert there is real content here.
     */
    it('carries the declarations rather than an empty string', () => {
        expect(smartServiceScriptEnvTypes.length).toBeGreaterThan(1000);
        expect(smartServiceScriptEnvTypes).toContain('interface Aspect');
    });
});
