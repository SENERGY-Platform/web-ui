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

import { createProcessModeler } from './bpmn-js';
import { createSmartServiceModeler } from '../../../smart-services/designer/smart-service-modeler';
import { legacyAllowsCopy } from './extension-copy-rules';
import { fetchText, importXml, mountModeler, MountedModeler, saveXml } from '../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../testing/bpmn-xml-compare';

/* Modeling behaviour the designers had on bpmn-js 4 and keep on bpmn-js 18. */

describe('legacyAllowsCopy', () => {
    it('compares the target type exactly, as bpmn-js 4 did, without type inheritance', () => {
        expect(legacyAllowsCopy('camunda:InputOutput', 'bpmn:Task')).toBe(false);
        expect(legacyAllowsCopy('camunda:InputOutput', 'bpmn:FlowNode')).toBe(true);
        expect(legacyAllowsCopy('camunda:ExecutionListener', 'bpmn:ServiceTask')).toBe(true);
        expect(legacyAllowsCopy('camunda:Properties', 'bpmn:Task')).toBe(true);
        expect(legacyAllowsCopy('camunda:ErrorEventDefinition', 'bpmn:Task')).toBe(true);
    });
});

[
    { name: 'process designer', create: createProcessModeler },
    { name: 'smart-service designer', create: createSmartServiceModeler },
].forEach(({ name, create }) => {
    describe(`${name} modeling`, () => {
        let mounted: MountedModeler;
        let modeler: any;

        beforeEach(async () => {
            mounted = mountModeler(create);
            modeler = mounted.modeler;
            await importXml(modeler, await fetchText('/bpmn-fixtures/process/senergy_all_attributes.bpmn'));
        });

        afterEach(() => mounted.destroy());

        const element = (id: string) => modeler.get('elementRegistry').get(id);
        const replace = (id: string, type: string) => modeler.get('bpmnReplace').replaceElement(element(id), { type });
        const savedElement = async (id: string) =>
            Array.from(parseXml(await saveXml(modeler)).getElementsByTagName('*')).find((el) => el.getAttribute('id') === id) as Element;
        const attributes = (el: Element) => Array.from(el.attributes).map((attr) => attr.name).sort();
        const children = (el: Element) => Array.from(el.children).map((child) => child.tagName);

        describe('replace from the popup menu', () => {
            it('turns a device task into a bare task, as bpmn-js 4 did', async () => {
                replace('Task_device', 'bpmn:Task');

                const task = await savedElement('Task_device');
                expect(task.tagName).toBe('bpmn:task');
                expect(attributes(task)).toEqual(['id', 'name']);
                expect(children(task)).toEqual(['bpmn:incoming', 'bpmn:outgoing']);
            });

            it('drops a user task form when the task becomes a service task', async () => {
                const userTask = replace('Task_device', 'bpmn:UserTask');
                const moddle = modeler.get('moddle');
                userTask.businessObject.extensionElements = moddle.create('bpmn:ExtensionElements', {
                    values: [moddle.create('camunda:FormData', { fields: [moddle.create('camunda:FormField', { id: 'f', type: 'string' })] })],
                });

                replace('Task_device', 'bpmn:ServiceTask');

                const task = await savedElement('Task_device');
                expect(task.tagName).toBe('bpmn:serviceTask');
                expect(children(task)).toEqual(['bpmn:incoming', 'bpmn:outgoing']);
            });

            it('keeps what bpmn-js 4 kept: a listener allowed in the new type, but not the input/output mapping', async () => {
                replace('Task_script', 'bpmn:ServiceTask');

                const task = await savedElement('Task_script');
                const extensions = Array.from(task.getElementsByTagName('bpmn:extensionElements')[0].children).map((child) => child.tagName);
                expect(extensions).toEqual(['camunda:executionListener']);
            });
        });

        it('applies the same rule on paste', async () => {
            const copyPaste = modeler.get('copyPaste');
            copyPaste.copy([element('Task_script')]);
            const pasted = copyPaste.paste({ element: modeler.get('canvas').getRootElement(), point: { x: 900, y: 400 } });

            const task = await savedElement(pasted[0].id);
            const extensions = Array.from(task.getElementsByTagName('bpmn:extensionElements')[0].children).map((child) => child.tagName);
            expect(extensions).toEqual(['camunda:executionListener']);
        });

        it('has no keyboard shortcuts on the canvas, as before', () => {
            const svg = modeler.get('canvas').getContainer().querySelector('svg') as SVGElement;
            modeler.get('selection').select(element('Task_device'));
            modeler.get('modeling').updateProperties(element('Task_device'), { name: 'renamed' });

            svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
            svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

            expect(element('Task_device')).toBeDefined();
            expect(element('Task_device').businessObject.name).toBe('renamed');
            expect(modeler.get('keyboard')._node).toBeFalsy();
        });
    });
});
