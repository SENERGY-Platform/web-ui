/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    CodeEditorCompletion,
    CodeEditorCompletionRequest,
    CodeEditorCompletionSource,
} from '../../../../../core/components/code-editor/code-editor-completion';
import { completer } from './ace-code-completer';

/*
 * Adapts the generated ace completer to the code editor component.
 *
 * ace-code-completer.ts is generated (see the note at its top) and must not be
 * edited, so everything needed to keep it working lives here instead: it is handed
 * the `session`/`pos`/`callback` triple it was written against. It decides between
 * full-statement and bare-expression completions from the text left of the cursor,
 * which is why the whole document and the cursor position are passed through
 * untouched rather than reduced to a prefix.
 */
export const smartServiceCompletions: CodeEditorCompletionSource = (request: CodeEditorCompletionRequest): CodeEditorCompletion[] => {
    // The completer indexes straight into $lines[pos.row]; a row past the end would
    // throw inside monaco's provider, which fails silently and drops all completions.
    const lines = [...request.lines];
    if (lines[request.row] === undefined) {
        lines[request.row] = '';
    }

    let completions: CodeEditorCompletion[] = [];
    completer.getCompletions(
        null,
        { doc: { $lines: lines } },
        { row: request.row, column: request.column },
        '',
        // The generated completer calls back synchronously.
        (_error: unknown, items: CodeEditorCompletion[] | null) => {
            completions = items ?? [];
        },
    );
    return completions;
};
