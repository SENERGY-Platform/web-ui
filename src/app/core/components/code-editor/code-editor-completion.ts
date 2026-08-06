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
 * Pure helpers behind the code editor's completions. Nothing here touches monaco or
 * holds state -- the editor component registers a provider per instance, closed over
 * its own model, so there is no registry that could be shared across a lazy chunk
 * boundary and silently end up duplicated.
 *
 * The request shape is deliberately the one ace used (a list of lines plus a
 * zero-based row/column), even though monaco works with 1-based positions. The
 * smart-service completions come from a *generated* file
 * (modules/smart-services/.../ace-code-completer.ts, produced by `go generate` in
 * smart-service-module-worker-lib) and must be consumed exactly as written, so
 * keeping the ace shape means that file needs only a thin adapter.
 */

/**
 * What a completion stands for, which decides its icon.
 *
 * The platform concepts carry the same icon the sidenav uses for them. 'variable' is
 * different: it deliberately reuses monaco's own variable icon unchanged, so a process
 * variable is indistinguishable from one the script declares itself -- which is what it
 * is, as far as the script is concerned. Anything unmarked gets the snippet icon.
 */
export type CodeEditorCompletionIcon = 'function' | 'aspect' | 'device-class' | 'variable';

export interface CodeEditorCompletion {
    /** Shown in the suggestion list. */
    caption: string;
    /** Inserted when the suggestion is picked. */
    value: string;
    /** Shown next to the caption, e.g. 'static'. */
    meta?: string;
    /** Which platform concept this stands for, if any. */
    icon?: CodeEditorCompletionIcon;
}

export interface CodeEditorCompletionRequest {
    /** The whole document, one entry per line -- ace's `session.doc.$lines`. */
    lines: string[];
    /** Zero-based cursor row, as ace reported it. */
    row: number;
    /** Zero-based cursor column, as ace reported it. */
    column: number;
}

export type CodeEditorCompletionSource = (request: CodeEditorCompletionRequest) => CodeEditorCompletion[];

/**
 * Converts a monaco position (1-based line and column) into the zero-based
 * row/column an ace completer expects.
 */
export function toCompletionRequest(lines: string[], lineNumber: number, column: number): CodeEditorCompletionRequest {
    return { lines, row: lineNumber - 1, column: column - 1 };
}

/**
 * How many characters before the cursor a picked suggestion should replace.
 *
 * With `dottedChain` the whole member expression counts, so accepting
 * 'deviceRepo.getAspect' halfway through typing 'deviceRepo.getAsp' replaces all of
 * it. Matching only the last identifier -- which is all ace ever did, and all
 * monaco's own word lookup does -- leaves the 'deviceRepo.' already on the line and
 * produces 'deviceRepo.deviceRepo.getAspect(...)'.
 *
 * Languages whose completions are not member expressions (json placeholders such as
 * ${name} or {{.name}}) pass false and keep plain identifier behaviour, because a
 * dotted run there would swallow part of the surrounding syntax.
 */
export function replacedPrefixLength(lineUpToCursor: string, dottedChain: boolean): number {
    const trailing = dottedChain ? /[A-Za-z0-9_$.]*$/ : /[A-Za-z0-9_$]*$/;
    const match = trailing.exec(lineUpToCursor);
    return match ? match[0].length : 0;
}
