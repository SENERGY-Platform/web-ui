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

import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import type { editor, IDisposable } from 'monaco-editor/editor/editor.api.js';
import {
    CodeEditorCompletionIcon,
    CodeEditorCompletionSource,
    replacedPrefixLength,
    toCompletionRequest,
} from './code-editor-completion';
import { CodeEditorScriptEnvironment } from './code-editor-environment';
import type { LanguageServiceDefaults, Monaco, ScriptTarget } from './monaco-loader';

/**
 * 'plaintext' needs no language contribution and is the honest fallback for script
 * formats we have no highlighting for, such as Groovy.
 */
export type CodeEditorLanguage = 'javascript' | 'json' | 'plaintext';

/**
 * Code editor backed by monaco. Monaco itself is fetched on first use through a
 * dynamic import, so nothing of it is in the bundle of whichever feature module
 * happens to use this component -- see monaco-loader.ts.
 *
 * Bind the content with [(value)]. The editor is created once the host element is
 * visible, which means consumers should render it lazily (matTabContent /
 * matExpansionPanelContent) rather than hiding it with CSS.
 */
@Component({
    selector: 'senergy-code-editor',
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() value = '';
    @Input() language: CodeEditorLanguage = 'javascript';
    @Input() readOnly = false;

    /**
     * Supplies the custom completions for this editor. Scoped to this instance, so
     * two editors on the same language can offer different completions.
     */
    @Input() completions?: CodeEditorCompletionSource;

    /**
     * The engine this script will run in, which decides the standard library on offer
     * and enables diagnostics. Leave unset for editors where neither applies (json).
     *
     * Unlike `completions`, this is not per instance: monaco keeps compiler options
     * globally per language, so the most recently created javascript editor wins. That
     * is fine as long as editors of different environments are never open at once,
     * which holds today -- the smart-service dialog's editors are all goja and the
     * bpmn script dialog's are all nashorn, and the two dialogs live in different
     * designers.
     */
    @Input() scriptEnvironment?: CodeEditorScriptEnvironment;

    /** CSS height for the editor. Falls back to the stylesheet default when unset. */
    @Input() height?: string;

    @Output() valueChange = new EventEmitter<string>();

    loading = true;

    @ViewChild('host', { static: true }) private host!: ElementRef<HTMLElement>;

    private static instanceCounter = 0;

    private editor?: editor.IStandaloneCodeEditor;
    private model?: editor.ITextModel;
    private modelUri?: string;
    private contentSubscription?: IDisposable;
    private completionProvider?: IDisposable;
    private destroyed = false;

    constructor(private zone: NgZone) {}

    async ngAfterViewInit(): Promise<void> {
        /*
         * webpackIgnore keeps monaco out of the karma test build, which still runs on
         * webpack and has no loader for the .css files monaco imports from its own
         * javascript -- without it every one of those imports is a build error, and the
         * editor is not something a unit test should be loading anyway. esbuild ignores
         * the comment, so the dev server and production build still resolve this
         * normally and still emit monaco as its own lazy chunk.
         */
        let loader: typeof import('./monaco-loader');
        try {
            loader = await import(/* webpackIgnore: true */ './monaco-loader');
        } catch {
            // the chunk could not be fetched; leave the spinner rather than throwing an
            // unhandled rejection out of a lifecycle hook
            return;
        }
        if (this.destroyed) {
            return; // the view was torn down while the chunk was still downloading
        }
        const { loadMonaco, javascriptDefaults, ScriptTarget } = loader;
        const monaco = loadMonaco();

        // Monaco attaches a lot of dom listeners; keeping them out of the angular
        // zone stops every keystroke from triggering a change detection pass.
        this.zone.runOutsideAngular(() => {
            const extension = { json: 'json', javascript: 'js', plaintext: 'txt' }[this.language];
            const uri = monaco.Uri.parse(`inmemory://code-editor/${++CodeEditorComponent.instanceCounter}.${extension}`);
            this.model = monaco.editor.createModel(this.value, this.language, uri);
            // read the uri back off the model: the provider looks it up the same way,
            // so this cannot drift from whatever monaco normalised it to
            this.modelUri = this.model.uri.toString();
            this.applyScriptEnvironment(javascriptDefaults, ScriptTarget);
            this.registerCompletions(monaco);
            this.editor = monaco.editor.create(this.host.nativeElement, {
                model: this.model,
                readOnly: this.readOnly,
                automaticLayout: true, // relayouts when the host is resized or first shown
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 4,
                fixedOverflowWidgets: true, // keeps the suggest widget from being clipped by a dialog
            });
            this.contentSubscription = this.model.onDidChangeContent(() => {
                const current = this.model?.getValue() ?? '';
                this.value = current;
                this.zone.run(() => this.valueChange.emit(current));
            });
        });

        this.loading = false;
    }

    /*
     * Maps a completion's platform concept to a monaco CompletionItemKind, whose glyph
     * the stylesheet then replaces with the matching sidenav icon.
     *
     * This is roundabout because monaco has no per-item icon api at all -- the icon is
     * derived purely from the kind. So the kinds below are picked for being ones the
     * typescript language service never produces for javascript (it emits variable,
     * function, field, method, property, class, interface, module and keyword), which
     * is what keeps the icon override off its completions. Their names are otherwise
     * arbitrary; only the glyph matters.
     *
     * Colour kinds would have been equally unused but monaco gives those special swatch
     * treatment, and file/folder are used for module paths, so all three are avoided.
     *
     * 'variable' is the exception and works the ordinary way round: it maps to the real
     * Variable kind, whose glyph is left alone precisely so a process variable looks
     * exactly like one the script declares. That the typescript service also uses this
     * kind is the point here, not a problem.
     */
    private static iconKind(monaco: Monaco, icon?: CodeEditorCompletionIcon): number {
        const kinds = monaco.languages.CompletionItemKind;
        switch (icon) {
            case 'function':
                return kinds.Event;
            case 'aspect':
                return kinds.Operator;
            case 'device-class':
                return kinds.Unit;
            case 'variable':
                return kinds.Variable;
            default:
                return kinds.Snippet;
        }
    }

    /*
     * Points the typescript language service at the engine this script will run in.
     * `lib` selects which of TypeScript's own lib.*.d.ts files describe the standard
     * library, and the extra libs declare whatever globals the host injects.
     *
     * Unlike the completion provider below, these settings are global per language
     * rather than per model -- see the note on the scriptEnvironment input.
     *
     * The defaults and the target enum arrive as arguments because monaco 0.56 moved
     * them off monaco.languages.typescript onto the service module's own exports; the
     * loader re-exports them so this file still never imports monaco.
     */
    private applyScriptEnvironment(javascriptDefaults: LanguageServiceDefaults, scriptTarget: typeof ScriptTarget): void {
        const environment = this.scriptEnvironment;
        if (!environment || this.language !== 'javascript') {
            return;
        }
        javascriptDefaults.setCompilerOptions({
            // es5 is both the lowest lib we use and the matching transpilation target
            target: environment.libs.includes('es5') ? scriptTarget.ES5 : scriptTarget.ES2020,
            lib: environment.libs,
            allowNonTsExtensions: true,
            noLib: false,
            // without checkJs a .js model gets no semantic errors at all, so unknown
            // globals and misspelt properties would go unreported
            checkJs: environment.diagnostics,
            noImplicitAny: false,
        });
        javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: !environment.diagnostics,
            noSyntaxValidation: !environment.diagnostics,
        });
        javascriptDefaults.setExtraLibs(environment.extraLibs ?? []);
    }

    /*
     * Monaco keeps completion providers globally per language, so this one is scoped
     * to this instance's model and every other model is handed back an empty list.
     * Registering per editor rather than once per language keeps the completion source
     * in a closure: there is no shared registry that a duplicated module instance
     * could split in two, which is what silently disabled completions before.
     */
    private registerCompletions(monaco: Monaco): void {
        this.completionProvider = monaco.languages.registerCompletionItemProvider(this.language, {
            provideCompletionItems: (model, position) => {
                const source = this.completions;
                if (!source || model.uri.toString() !== this.modelUri) {
                    return { suggestions: [] };
                }

                const lineUpToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
                // json placeholders are not member expressions, so only javascript
                // replaces a whole dotted chain
                const prefixLength = replacedPrefixLength(lineUpToCursor, this.language === 'javascript');
                const word = model.getWordAtPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - prefixLength,
                    endColumn: word ? Math.max(word.endColumn, position.column) : position.column,
                };

                const completions = source(toCompletionRequest(model.getLinesContent(), position.lineNumber, position.column));

                return {
                    suggestions: completions.map((completion) => ({
                        label: completion.caption,
                        kind: CodeEditorComponent.iconKind(monaco, completion.icon),
                        detail: completion.meta,
                        insertText: completion.value,
                        range,
                    })),
                };
            },
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value'] && this.model && this.value !== this.model.getValue()) {
            this.model.setValue(this.value);
        }
        if (changes['readOnly'] && this.editor) {
            this.editor.updateOptions({ readOnly: this.readOnly });
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.completionProvider?.dispose();
        this.contentSubscription?.dispose();
        this.editor?.dispose();
        this.model?.dispose();
    }
}
