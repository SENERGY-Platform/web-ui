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

/** Ambient declarations describing globals the script host injects. */
export interface CodeEditorExtraLib {
    /** Virtual path monaco files the declarations under. Must be unique. */
    filePath: string;
    content: string;
}

/**
 * Describes the engine a script will actually run in, so the editor offers the
 * standard library that engine has and nothing else.
 */
export interface CodeEditorScriptEnvironment {
    /**
     * ECMAScript libraries the engine provides, passed straight to TypeScript's `lib`
     * option. TypeScript's own lib.*.d.ts files then supply the standard library, so
     * we never maintain a list of globals ourselves.
     *
     * Never include 'dom'. console, setTimeout, fetch and friends live in
     * lib.dom.d.ts and exist in neither of our engines; leaving dom out is what keeps
     * the editor from suggesting them.
     */
    libs: string[];
    /** Declarations for host-injected globals, e.g. the smart-service scriptenv. */
    extraLibs?: CodeEditorExtraLib[];
    /**
     * Whether to report semantic errors as well as offering completions.
     *
     * Only safe where every global a script may legitimately use is declared. An
     * undeclared global is reported as an unknown name, so switching this on for an
     * environment whose globals we cannot enumerate would mark working scripts as
     * broken.
     */
    diagnostics: boolean;
}

/**
 * goja, the engine the smart-service workers run pre/post scripts in
 * (pkg/middleware/scripts.go: a bare `goja.New()`).
 *
 * es2020 is the closest single ECMAScript version to what goja implements -- it
 * covers Map/Set/Promise, arrow functions, template literals, destructuring,
 * Object.fromEntries, Array.prototype.flat and optional chaining, all of which goja
 * has. The match is not exact in either direction, because goja tracks the spec
 * feature by feature rather than by version; `Intl` in particular is declared by
 * TypeScript but absent from goja. Per-version granularity is the price of having
 * TypeScript maintain the list instead of us.
 *
 * Note the host registers nothing beyond the injected namespaces: no console, no
 * require, no setTimeout. Scripts also get interrupted after 2 seconds.
 */
export const gojaScriptEnvironment: CodeEditorScriptEnvironment = {
    libs: ['es2020'],
    // the injected namespaces are the entire global surface and are declared in full,
    // so an unknown name here really is a mistake -- console.log being the common one
    diagnostics: true,
};

/**
 * Nashorn, the javascript engine of the process engine's JDK 8
 * (camunda/camunda-bpm-platform:tomcat-7.11.0), used for bpmn script tasks,
 * conditions and listeners with scriptFormat JavaScript.
 *
 * es5 is exact here: Nashorn on JDK 8 implements ECMAScript 5.1. Referencing Map,
 * Set, Promise or Object.assign is therefore reported as unavailable, which is
 * correct and useful.
 *
 * It does not catch ES6 *syntax* -- arrow functions, let/const and template literals
 * raise no error, because TypeScript's job is to transpile those for an es5 target
 * rather than reject them. They will still fail at runtime on Nashorn.
 */
export const nashornScriptEnvironment: CodeEditorScriptEnvironment = {
    libs: ['es5'],
    /*
     * Off, because bpmn scripts read process variables as bare globals and we cannot
     * enumerate them: the flow analysis sees variables produced by task outputs, but
     * not ones a previous script created with execution.setVariable. Reporting unknown
     * names would light up working conditions with errors.
     *
     * The cost is that the es5 lib no longer warns about Map or Promise either -- both
     * come through as the same 'cannot find name' diagnostic, so they cannot be
     * separated. Completions are still es5-only, which is where this mostly matters.
     */
    diagnostics: false,
};
