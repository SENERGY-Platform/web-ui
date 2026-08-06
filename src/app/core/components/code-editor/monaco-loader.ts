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

/*
 * This is the only module in the app that imports monaco-editor, and it must stay
 * that way: it may only ever be reached through `await import('./monaco-loader')`.
 * A static import from anywhere would pull monaco into that importer's bundle,
 * which is the whole thing we are avoiding.
 *
 * The imports below are also deliberately narrow. The monaco-editor package entry
 * point is esm/vs/editor/editor.main, which registers all 84 languages plus the css,
 * html, json and typescript language services. We assemble the same editor from the
 * api, the editor features, and only the two languages we actually use.
 *
 * Every specifier keeps its explicit .js extension, which is not cosmetic. monaco 0.56
 * exports both "./*.js" and "./*", but vite's resolver returns null for the
 * extensionless form of languages/features/json/register -- oddly, the css and html
 * equivalents resolve fine, so something about the 'json' segment trips it up. That
 * breaks the dev server while node, esbuild and rollup all resolve it happily. The .js
 * form resolves everywhere, so it is used uniformly rather than only where required.
 */
import * as monaco from 'monaco-editor/editor/editor.api.js';
/*
 * editor.api is only the api surface and the core editor -- it renders text and
 * tokenises it, but contains none of the editor *features*. Those are registered here:
 * the suggest widget, find/replace, hover, bracket matching, folding, multi-cursor.
 * Without this import there is no suggest widget at all, so completions are computed
 * and then have nowhere to appear.
 *
 * 0.56 replaced editor.all with this, and additionally exposes every feature
 * individually as features/<name>/register. Registering them all costs a little more
 * than hand-picking, but there is no list to keep in step with new monaco releases.
 */
import 'monaco-editor/features/register.all.js';
/*
 * Registers the 'javascript' language id and lazily loads its tokeniser. Without it the
 * id is unknown, models fall back to plain text, and any provider registered for
 * 'javascript' is never consulted.
 *
 * 0.56 moved this out of basic-languages/<lang>/<lang>.contribution.
 */
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/features/json/register.js';
/*
 * The typescript language service, which also serves plain javascript. This is what
 * supplies the standard library: it is configured per engine with a `lib` option, and
 * TypeScript's own lib.*.d.ts files then describe that ECMAScript version -- so the
 * stdlib completions come from TypeScript rather than from a list we maintain.
 *
 * Deliberately omitting `dom` from that lib list is what makes it correct rather than
 * merely convenient: console, setTimeout and fetch all live in lib.dom.d.ts, and none
 * of them exist in goja or nashorn. Leaving dom out removes exactly those.
 *
 * Almost all of its weight is in ts.worker, not here -- see monaco-ts.worker.ts.
 *
 * Re-exported rather than merely imported for its side effects because 0.56 moved this
 * api off monaco.languages.typescript, which is now a deprecation marker. The editor
 * component needs javascriptDefaults and ScriptTarget but must not import monaco itself,
 * so they travel out through here.
 *
 * The legacy language/typescript/monaco.contribution path still works at runtime but
 * ships no .d.ts, so the canonical path is used instead.
 */
export {
    javascriptDefaults,
    ScriptTarget,
} from 'monaco-editor/languages/features/typescript/register.js';
export type { LanguageServiceDefaults } from 'monaco-editor/languages/features/typescript/register.js';

export type Monaco = typeof monaco;

/** Worker labels monaco passes to getWorker, one per language service. */
const jsonLanguageId = 'json';
const typescriptWorkerLabels = ['typescript', 'javascript'];

interface MonacoEnvironmentHost {
    MonacoEnvironment?: { getWorker: (moduleId: string, label: string) => Worker };
}

let environmentConfigured = false;

/**
 * Tells monaco how to spawn its workers. Without this it throws as soon as a
 * feature needs one. Safe to call repeatedly; only the first call does anything.
 */
function configureWorkerEnvironment(): void {
    if (environmentConfigured) {
        return;
    }
    environmentConfigured = true;
    (self as unknown as MonacoEnvironmentHost).MonacoEnvironment = {
        getWorker: (_moduleId: string, label: string): Worker => {
            if (label === jsonLanguageId) {
                return new Worker(new URL('./monaco-json.worker', import.meta.url), { type: 'module' });
            }
            if (typescriptWorkerLabels.includes(label)) {
                return new Worker(new URL('./monaco-ts.worker', import.meta.url), { type: 'module' });
            }
            return new Worker(new URL('./monaco-editor.worker', import.meta.url), { type: 'module' });
        },
    };
}

export function loadMonaco(): Monaco {
    configureWorkerEnvironment();
    return monaco;
}
