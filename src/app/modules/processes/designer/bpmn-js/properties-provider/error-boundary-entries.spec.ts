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

import { createProcessModeler } from '../bpmn-js';
import { createSmartServiceModeler } from '../../../../smart-services/designer/smart-service-modeler';
import { fetchText, importXml, mountModeler, MountedModeler, panelSettled, saveXml } from '../../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../../testing/bpmn-xml-compare';
import { errorVariableScript, readErrorVariable, writeErrorVariable } from '../model/error-boundary';

const designers: [string, (canvas: HTMLElement, panel: HTMLElement) => any][] = [
    ['process designer', createProcessModeler],
    ['smart-service designer', createSmartServiceModeler],
];

designers.forEach(([designer, create]) => {
    describe(`error boundary event in the ${designer}`, () => {
        let mounted: MountedModeler;
        let panel: HTMLElement;
        let modeler: any;

        beforeEach(async () => {
            mounted = mountModeler((canvas, panelNode) => {
                panel = panelNode;
                return create(canvas, panelNode);
            });
            modeler = mounted.modeler;
            await importXml(modeler, await fetchText('/bpmn-fixtures/process/error_boundary.bpmn'));
        });
        afterEach(() => mounted.destroy());

        const element = (id: string) => modeler.get('elementRegistry').get(id);
        const select = async (id: string) => {
            modeler.get('selection').select(element(id));
            await panelSettled();
        };
        const entries = (groupId: string) =>
            Array.from(panel.querySelectorAll(`[data-group-id="group-${groupId}"] [data-entry-id]`)).map((entry) => entry.getAttribute('data-entry-id'));
        const field = (entryId: string) => panel.querySelector(`[data-entry-id="${entryId}"] textarea, [data-entry-id="${entryId}"] input`) as HTMLInputElement;
        const type = async (input: HTMLInputElement, value: string) => {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            // the panel commits text after its 600 ms debounce
            await new Promise((resolve) => setTimeout(resolve, 700));
        };
        const outputs = async (id: string) => {
            const doc = parseXml(await saveXml(modeler));
            const node = Array.from(doc.getElementsByTagName('*')).find((el) => el.getAttribute('id') === id)!;
            return Array.from(node.getElementsByTagName('camunda:outputParameter')).map((p) => ({
                name: p.getAttribute('name'),
                script: p.getElementsByTagName('camunda:script')[0]?.textContent,
            }));
        };

        it('offers only the message variable of the panel and the device fields on a service task', async () => {
            await select('Boundary_device');
            expect(entries('error')).toEqual(['errorMessageVariable', 'error-device-id-variable', 'error-service-id-variable']);
            expect(field('errorMessageVariable').value).toBe('failure');
        });

        it('offers no device fields on a script task', async () => {
            await select('Boundary_script');
            expect(entries('error')).toEqual(['errorMessageVariable']);
        });

        it('leaves a timer boundary event to the panel', async () => {
            await select('Boundary_timer');
            expect(panel.querySelector('[data-group-id="group-error"]')).toBeNull();
            expect(panel.querySelector('[data-group-id="group-timer"]')).not.toBeNull();
        });

        it('maps device_id and service_id to the named instance variables and removes a mapping when emptied', async () => {
            await select('Boundary_device');
            let changes = 0;
            modeler.on('commandStack.changed', () => changes++);

            await type(field('error-device-id-variable'), 'failed_thermostat');
            await type(field('error-service-id-variable'), 'failed_service');
            expect(await outputs('Boundary_device')).toEqual([
                { name: 'failed_thermostat', script: errorVariableScript('device_id') },
                { name: 'failed_service', script: errorVariableScript('service_id') },
            ]);
            expect(changes).toBeGreaterThan(0);

            await type(field('error-device-id-variable'), '');
            expect(await outputs('Boundary_device')).toEqual([{ name: 'failed_service', script: errorVariableScript('service_id') }]);
            expect(readErrorVariable(element('Boundary_device'), 'service_id')).toBe('failed_service');

            modeler.get('commandStack').undo();
            expect(readErrorVariable(element('Boundary_device'), 'device_id')).toBe('failed_thermostat');
        });

        it('keeps other mappings and extension elements of the boundary event', async () => {
            const moddle = modeler.get('moddle');
            const bo = element('Boundary_device').businessObject;
            const other = moddle.create('camunda:OutputParameter', { name: 'kept', value: 'x' });
            const input = moddle.create('camunda:InputParameter', { name: 'in', value: 'y' });
            const properties = moddle.create('camunda:Properties', { values: [] });
            bo.extensionElements = moddle.create('bpmn:ExtensionElements', {
                values: [properties, moddle.create('camunda:InputOutput', { inputParameters: [input], outputParameters: [other] })],
            });

            writeErrorVariable(modeler.get('modeling'), moddle, element('Boundary_device'), 'device_id', ' failed_thermostat ');
            const values = bo.extensionElements.values;
            expect(values[0]).toBe(properties);
            expect(values[1].inputParameters.map((p: any) => p.name)).toEqual(['in']);
            expect(values[1].outputParameters.map((p: any) => p.name)).toEqual(['kept', 'failed_thermostat']);

            writeErrorVariable(modeler.get('modeling'), moddle, element('Boundary_device'), 'device_id', 'renamed');
            expect(bo.extensionElements.values[1].outputParameters.map((p: any) => p.name)).toEqual(['kept', 'renamed']);
        });
    });
});
