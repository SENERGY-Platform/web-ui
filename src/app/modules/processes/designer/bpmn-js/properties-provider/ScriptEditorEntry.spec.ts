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
import { createProcessModeler } from '../bpmn-js';
import { createSmartServiceModeler } from '../../../../smart-services/designer/smart-service-modeler';
import { fetchText, importXml, mountModeler, MountedModeler, panelSettled } from '../../../../../../testing/bpmn-modeler';

/* The entry ids and shapes below are the ones the camunda platform provider produces. */
const original = () => null;
const entry = (id: string, script?: any) => ({ id, component: original, script });
const camundaScript = {};

describe('augmentScriptEntries', () => {
    it('wraps the condition, script task and listener script entries', () => {
        const condition = entry('conditionScriptValue');
        const scriptTask = entry('scriptValue');
        const listener = entry('Task_1-executionListener-0scriptValue', camundaScript);
        const taskListener = entry('Task_1-taskListener-2scriptValue', camundaScript);

        augmentScriptEntries([{ entries: [condition, scriptTask] }, { items: [{ entries: [listener] }, { entries: [taskListener] }] }]);

        [condition, scriptTask, listener, taskListener].forEach((wrapped: any) => {
            expect(wrapped.component).not.toBe(original);
            expect(wrapped.senergyScriptComponent).toBe(original);
        });
    });

    it('leaves input/output parameter scripts and other entries as they are', () => {
        const parameter = entry('Task_1-inputParameter-0-scriptValue', camundaScript);
        const format = entry('scriptFormat');
        const condition = entry('conditionExpression');

        augmentScriptEntries([{ entries: [parameter, format, condition] }]);

        expect([parameter, format, condition].map((e) => e.component)).toEqual([original, original, original]);
    });

    it('wraps an entry only once and returns the same groups', () => {
        const condition: any = entry('conditionScriptValue');
        const groups = [{ entries: [condition] }];

        expect(augmentScriptEntries(groups)).toBe(groups);
        const wrapper = condition.component;
        augmentScriptEntries(groups);

        expect(condition.component).toBe(wrapper);
        expect(condition.senergyScriptComponent).toBe(original);
    });
});

[
    { name: 'process designer', create: createProcessModeler },
    { name: 'smart-service designer', create: createSmartServiceModeler },
].forEach(({ name, create }) => {
    describe(`${name} script editor button`, () => {
        let mounted: MountedModeler;
        let panel: HTMLElement;
        let modeler: any;
        let editScript: jasmine.Spy;

        beforeEach(async () => {
            mounted = mountModeler((canvas, panelNode) => {
                panel = panelNode;
                return create(canvas, panelNode);
            });
            modeler = mounted.modeler;
            editScript = jasmine.createSpy('editScript').and.callFake((_model: any, _element: any, callback: any) => callback({ script: 'edited()' }));
            modeler.designerCallbacks = { getInfoHtml: () => '', editScript };
            await importXml(modeler, await fetchText('/bpmn-fixtures/process/senergy_all_attributes.bpmn'));
        });

        afterEach(() => mounted.destroy());

        const element = (id: string) => modeler.get('elementRegistry').get(id);
        const buttons = async (id: string) => {
            modeler.get('selection').select(element(id));
            await panelSettled();
            return Array.from(panel.querySelectorAll('button')).filter((button) => (button.textContent || '').trim() === 'Open in Editor');
        };

        it('offers the editor for the script and the listener script of a script task, not for its input script', async () => {
            expect((await buttons('Task_script')).length).toBe(2);
        });

        it('opens the script task script and writes the edit through the command stack', async () => {
            (await buttons('Task_script'))[0].click();

            expect(editScript.calls.mostRecent().args[0]).toEqual({
                script: 'var hot = temperature > limit;\nexecution.setVariable("hot", hot);',
                scriptFormat: 'Javascript',
                label: 'Compute',
            });
            expect(editScript.calls.mostRecent().args[1]).toBe(element('Task_script'));
            expect(element('Task_script').businessObject.script).toBe('edited()');

            modeler.get('commandStack').undo();
            expect(element('Task_script').businessObject.script).toContain('var hot');
        });

        it('opens the listener script and writes it back to the listener', async () => {
            (await buttons('Task_script'))[1].click();

            expect(editScript.calls.mostRecent().args[0].script).toBe('execution.setVariable("started", true);');
            const listener = element('Task_script').businessObject.extensionElements.values.find((value: any) => value.$type === 'camunda:ExecutionListener');
            expect(listener.script.value).toBe('edited()');
            expect(listener.script.scriptFormat).toBe('Javascript');
        });

        it('offers no editor for an expression condition', async () => {
            expect((await buttons('StartEvent_conditional')).length).toBe(0);
        });

        it('leaves the script alone without an editor callback', async () => {
            modeler.designerCallbacks = { getInfoHtml: () => '' };
            (await buttons('Flow_hot'))[0].click();
            expect(element('Flow_hot').businessObject.conditionExpression.body).toBe('temperature > 20 && temperature < 90');
        });
    });
});
