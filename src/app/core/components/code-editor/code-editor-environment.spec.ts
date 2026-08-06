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

import { gojaScriptEnvironment, nashornScriptEnvironment } from './code-editor-environment';

/*
 * These read like configuration assertions, but each one is load bearing: the whole
 * reason the editor can offer a correct standard library without us maintaining a list
 * is that the lib selection matches the engine. Getting one wrong silently offers
 * script authors an api that does not exist where their script runs.
 */
describe('script environments', () => {
    const environments = [
        { name: 'goja', environment: gojaScriptEnvironment },
        { name: 'nashorn', environment: nashornScriptEnvironment },
    ];

    environments.forEach(({ name, environment }) => {
        // console, setTimeout and fetch live in lib.dom.d.ts and exist in neither
        // engine. Leaving dom out is the only thing keeping them out of the suggestions.
        it(`does not offer the dom library to ${name}`, () => {
            expect(environment.libs).not.toContain('dom');
        });

        it(`declares at least one library for ${name}`, () => {
            expect(environment.libs.length).toBeGreaterThan(0);
        });
    });

    it('gives nashorn es5, because the process engine runs on jdk 8', () => {
        expect(nashornScriptEnvironment.libs).toEqual(['es5']);
    });

    it('gives goja es2020, the closest version to what it implements', () => {
        expect(gojaScriptEnvironment.libs).toEqual(['es2020']);
    });

    it('reports diagnostics for goja, whose globals are fully declared', () => {
        expect(gojaScriptEnvironment.diagnostics).toBe(true);
    });

    /*
     * bpmn scripts read process variables as bare globals that cannot be enumerated,
     * so unknown-name errors would fire on working scripts.
     */
    it('does not report diagnostics for nashorn, whose globals are open ended', () => {
        expect(nashornScriptEnvironment.diagnostics).toBe(false);
    });
});
