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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CodeEditorLanguage } from '../../../../../core/components/code-editor/code-editor.component';
import { CodeEditorCompletionSource } from '../../../../../core/components/code-editor/code-editor-completion';
import {
    CodeEditorScriptEnvironment,
    nashornScriptEnvironment,
} from '../../../../../core/components/code-editor/code-editor-environment';
import { ScriptEditModel } from '../../shared/designer-dialog.model';

/**
 * Edits a script belonging to a bpmn element in a proper editor, because the
 * properties panel's own field is a few lines tall and unusable for anything real.
 */
@Component({
    templateUrl: './script-editor-dialog.component.html',
    styleUrls: ['./script-editor-dialog.component.css'],
})
export class ScriptEditorDialogComponent {
    script: string;
    label: string;
    scriptFormat: string;
    language: CodeEditorLanguage;

    /** The process variables that exist at this point in the flow. */
    variables: string[];
    completions: CodeEditorCompletionSource;

    /**
     * Nashorn only for scriptFormat JavaScript. Other formats -- Groovy in particular
     * -- run in a different engine, so offering them javascript's standard library
     * would be worse than offering nothing.
     */
    scriptEnvironment?: CodeEditorScriptEnvironment;

    constructor(
        private dialogRef: MatDialogRef<ScriptEditorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) dialogParams: { script: ScriptEditModel; variables: string[] },
    ) {
        this.script = dialogParams.script.script || '';
        this.label = dialogParams.script.label || '';
        this.scriptFormat = dialogParams.script.scriptFormat || '';
        this.language = ScriptEditorDialogComponent.toLanguage(this.scriptFormat);
        this.scriptEnvironment = this.language === 'javascript' ? nashornScriptEnvironment : undefined;

        this.variables = dialogParams.variables || [];
        this.completions = () =>
            this.variables.map((name) => ({
                caption: name,
                value: name,
                meta: 'process variable',
                // a script reads these as plain globals, so they are shown exactly like a
                // variable it declares itself rather than with an icon of their own
                icon: 'variable' as const,
            }));
    }

    /*
     * The Script Format field is free text, so match it loosely. Anything we have no
     * highlighting for stays plain rather than being coloured as if it were
     * javascript.
     */
    private static toLanguage(scriptFormat: string): CodeEditorLanguage {
        const normalized = scriptFormat.trim().toLowerCase();
        if (normalized === 'javascript' || normalized === 'js' || normalized === 'ecmascript') {
            return 'javascript';
        }
        if (normalized === 'json') {
            return 'json';
        }
        return 'plaintext';
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        const result: ScriptEditModel = {
            script: this.script,
            scriptFormat: this.scriptFormat,
            label: this.label,
        };
        this.dialogRef.close(result);
    }
}
