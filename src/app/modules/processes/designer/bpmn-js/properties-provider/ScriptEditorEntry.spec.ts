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

import { augmentScriptEntries } from './ScriptEditorEntry';

/*
 * These entries mirror the shape the camunda properties panel produces: an id, an
 * html template and a get(). The ids are the contract this code depends on, so a
 * panel upgrade that renamed them would break here first.
 */
const entry = (id: string, html = '<div class="bpp-row"></div>', get?: any) => ({ id, html, get });

const tabsWith = (...entries: any[]) => [{ groups: [{ entries }] }];

const fakeNode = (script: string, scriptFormat: string) => {
    const dispatched: string[] = [];
    const scriptField = {
        value: script,
        dispatchEvent: (event: Event) => {
            dispatched.push(event.type);
            return true;
        },
    };
    const node = {
        querySelector: (selector: string) => {
            switch (selector) {
                case 'textarea[name=scriptValue]':
                    return scriptField;
                case 'input[name=scriptFormat]':
                    return { value: scriptFormat };
                default:
                    return null;
            }
        },
    };
    return { node, scriptField, dispatched };
};

/** Captures what the entry hands to the editor callback, and replies with `reply`. */
const fakeBpmnjs = (reply?: any) => {
    const calls: { model: any; element: any }[] = [];
    return {
        calls,
        bpmnjs: {
            designerCallbacks: {
                editScript: (model: any, element: any, callback: any) => {
                    calls.push({ model, element });
                    if (reply) {
                        callback(reply);
                    }
                },
            },
        },
    };
};

describe('augmentScriptEntries', () => {
    it('augments the sequence flow condition entry', () => {
        const condition = entry('condition');

        augmentScriptEntries(tabsWith(condition), {});

        expect(condition.html.indexOf('data-action="openScriptEditor"') >= 0).toBe(true);
    });

    it('augments the script task entry', () => {
        const scriptTask = entry('script-implementation');

        augmentScriptEntries(tabsWith(scriptTask), {});

        expect(scriptTask.html.indexOf('data-action="openScriptEditor"') >= 0).toBe(true);
    });

    it('augments the listener script entry', () => {
        const listener = entry('listener-script-value');

        augmentScriptEntries(tabsWith(listener), {});

        expect(listener.html.indexOf('data-action="openScriptEditor"') >= 0).toBe(true);
    });

    it('leaves entries that hold no script untouched', () => {
        const unrelated = entry('scriptResultVariable', '<div>original</div>');

        augmentScriptEntries(tabsWith(unrelated), {});

        expect(unrelated.html).toBe('<div>original</div>');
    });

    it('keeps the panel\'s own template intact so its script field stays editable', () => {
        const original = '<div class="bpp-row"><textarea name="scriptValue"></textarea></div>';
        const condition = entry('condition', original);

        augmentScriptEntries(tabsWith(condition), {});

        expect(condition.html.indexOf(original) >= 0).toBe(true);
    });

    it('adds no replacement field of its own, the editor is only an extra way in', () => {
        const condition = entry('condition');

        augmentScriptEntries(tabsWith(condition), {});

        expect(condition.html.indexOf('scriptPreview') >= 0).toBe(false);
        expect(condition.html.indexOf('readonly') >= 0).toBe(false);
    });

    it('does not replace the entry\'s own get()', () => {
        const condition = entry('condition', '<div></div>', () => ({ scriptValue: 'x' }));
        const originalGet = condition.get;

        augmentScriptEntries(tabsWith(condition), {});

        expect(condition.get).toBe(originalGet);
    });

    it('reveals the condition button only while the condition type is script', () => {
        const condition = entry('condition');

        augmentScriptEntries(tabsWith(condition), {});

        expect(condition.html.indexOf('data-show="isScript"') >= 0).toBe(true);
    });

    it('always shows the button for a script task, which has no condition type', () => {
        const scriptTask = entry('script-implementation');

        augmentScriptEntries(tabsWith(scriptTask), {});

        expect(scriptTask.html.indexOf('data-show') >= 0).toBe(false);
    });

    it('does not augment the same entry twice', () => {
        const condition = entry('condition');

        const tabs = tabsWith(condition);
        augmentScriptEntries(tabs, {});
        augmentScriptEntries(tabs, {});

        const occurrences = condition.html.split('data-action="openScriptEditor"').length - 1;
        expect(occurrences).toBe(1);
    });

    it('hands the current script and format to the editor', () => {
        const { calls, bpmnjs } = fakeBpmnjs();
        const condition: any = entry('condition');
        augmentScriptEntries(tabsWith(condition), bpmnjs);
        const { node } = fakeNode('on && surplus > 0', 'JavaScript');

        condition.openScriptEditor({ businessObject: { name: 'Laden stoppen' } }, node);

        expect(calls[0].model).toEqual({ script: 'on && surplus > 0', scriptFormat: 'JavaScript', label: 'Laden stoppen' });
    });

    it('passes the element through so the available variables can be worked out', () => {
        const { calls, bpmnjs } = fakeBpmnjs();
        const condition: any = entry('condition');
        augmentScriptEntries(tabsWith(condition), bpmnjs);
        const { node } = fakeNode('', '');
        const element = { id: 'SequenceFlow_0u1390w', businessObject: {} };

        condition.openScriptEditor(element, node);

        expect(calls[0].element).toBe(element);
    });

    it('writes the edited script back into the field the panel persists from', () => {
        const { bpmnjs } = fakeBpmnjs({ script: 'edited', scriptFormat: '', label: '' });
        const condition: any = entry('condition');
        augmentScriptEntries(tabsWith(condition), bpmnjs);
        const { node, scriptField } = fakeNode('old', 'JavaScript');

        condition.openScriptEditor({ businessObject: {} }, node);

        expect(scriptField.value).toBe('edited');
    });

    it('notifies the panel with a change event so the script is actually saved', () => {
        const { bpmnjs } = fakeBpmnjs({ script: 'edited', scriptFormat: '', label: '' });
        const condition: any = entry('condition');
        augmentScriptEntries(tabsWith(condition), bpmnjs);
        const { node, dispatched } = fakeNode('old', 'JavaScript');

        condition.openScriptEditor({ businessObject: {} }, node);

        expect(dispatched).toContain('change');
    });

    it('does not touch the script when no editor callback is registered', () => {
        const condition: any = entry('condition');
        augmentScriptEntries(tabsWith(condition), {});
        const { node, scriptField, dispatched } = fakeNode('old', 'JavaScript');

        condition.openScriptEditor({ businessObject: {} }, node);

        expect(scriptField.value).toBe('old');
        expect(dispatched.length).toBe(0);
    });
});
