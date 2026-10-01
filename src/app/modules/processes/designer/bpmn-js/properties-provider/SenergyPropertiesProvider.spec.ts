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
import { senergyGroups } from './SenergyPropertiesProvider';
import { smartServiceGroups } from '../../../../smart-services/designer/smart-service-properties-provider';
import { fetchText, importXml, mountModeler, MountedModeler, panelSettled, saveXml } from '../../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../../testing/bpmn-xml-compare';

const air = 'urn:infai:ses:aspect:air';
const water = 'urn:infai:ses:aspect:water';

describe('Senergy properties provider', () => {
    let mounted: MountedModeler;
    let panel: HTMLElement;
    let modeler: any;

    const setup = (create: (canvas: HTMLElement, panel: HTMLElement) => any) => {
        beforeEach(async () => {
            mounted = mountModeler((canvas, panelNode) => {
                panel = panelNode;
                return create(canvas, panelNode);
            });
            modeler = mounted.modeler;
            modeler.designerCallbacks = {
                getInfoHtml: () => '<table></table>',
                processIncident: () => {},
                configNotification: () => {},
            };
            await importXml(modeler, await fetchText('/bpmn-fixtures/process/writers.bpmn'));
        });
        afterEach(() => mounted.destroy());
    };

    const element = (id: string) => modeler.get('elementRegistry').get(id);
    const root = () => modeler.get('canvas').getRootElement();
    const ids = (groups: any[]) => groups.map((group) => group.id);
    const attribute = async (id: string, name: string) => {
        const node = Array.from(parseXml(await saveXml(modeler)).getElementsByTagName('*')).find((el) => el.getAttribute('id') === id);
        return node!.hasAttribute(name) ? node!.getAttribute(name) : undefined;
    };

    describe('groups', () => {
        setup(createProcessModeler);

        it('shows the task groups in the order the designer always had', () => {
            expect(ids(senergyGroups(element('Task_1'), modeler))).toEqual([
                'incident', 'iot-influx', 'iot-helper', 'process-io', 'iot-extern', 'iot-info', 'order',
            ]);
        });

        it('leaves out Incident and Notification without their dialogs', () => {
            modeler.designerCallbacks = { getInfoHtml: () => '' };
            expect(ids(senergyGroups(element('Task_1'), modeler))).toEqual(['iot-influx', 'process-io', 'iot-extern', 'iot-info', 'order']);
        });

        it('shows the timer helper and the order for a timer event', () => {
            expect(ids(senergyGroups(element('Timer_1'), modeler))).toEqual(['time-event-helper', 'order']);
        });

        it('shows the event fields with the aspect list next to the single aspect', () => {
            const groups = senergyGroups(element('Event_msg'), modeler);
            expect(ids(groups)).toEqual(['iot-event', 'order']);
            expect(groups[0].entries.map((entry: any) => entry.id)).toEqual([
                'iot-conditional-event-button', 'aspect-field', 'aspects-field', 'function-field', 'characteristic-field',
                'script-field', 'value-variable-field', 'variables-field', 'qos-field',
            ]);
        });

        it('shows the description for the process', () => {
            expect(ids(senergyGroups(root(), modeler))).toEqual(['description']);
            expect(ids(senergyGroups(element('StartEvent_1'), modeler))).toEqual([]);
        });

        it('renders the Senergy groups open and above the camunda groups', async () => {
            modeler.get('selection').select(element('Task_1'));
            await panelSettled();
            const rendered = Array.from(panel.querySelectorAll('[data-group-id]')).map((group) => group.getAttribute('data-group-id'));
            expect(rendered.slice(0, 8)).toEqual([
                'group-incident', 'group-iot-influx', 'group-iot-helper', 'group-process-io', 'group-iot-extern', 'group-iot-info', 'group-order', 'group-general',
            ]);
            expect(panel.querySelector('[data-group-id="group-iot-extern"] .bio-properties-panel-group-entries.open')).not.toBeNull();
            expect(panel.querySelector('[data-entry-id="iot-extern-device-variable-list"]')!.innerHTML).toBe('<table></table>');
        });
    });

    describe('conditional event button', () => {
        setup(createProcessModeler);

        const open = (reply?: any) => {
            const opened: any[] = [];
            modeler.designerCallbacks.editConditionalEvent = (model: any, callback: (result: any) => void) => {
                opened.push(model);
                if (reply) {
                    callback(reply);
                }
            };
            const button = senergyGroups(element('Event_msg'), modeler)[0].entries[0];
            button.onClick(element('Event_msg'));
            return opened;
        };
        const reply = (aspect: string, aspects: string[]) => ({
            aspect, aspects, iotfunction: 'f', characteristic: 'c', script: 'value > 20', valueVariableName: 'value', variables: '', qos: '0', label: '',
        });

        it('passes the list attribute into the dialog', () => {
            modeler.get('modeling').updateProperties(element('Event_msg'), { 'senergy:aspects': `${air},${water}` });
            const opened = open();
            expect(opened[0].aspects).toEqual([air, water]);
            expect(opened[0].aspect).toBe(air);
        });

        it('passes an element written before the list as a list of its single aspect', () => {
            expect(open()[0].aspects).toEqual([air]);
        });

        it('writes the sorted list and its alias', async () => {
            open(reply(water, [water, air]));
            expect(await attribute('Event_msg', 'senergy:aspects')).toBe(`${air},${water}`);
            expect(await attribute('Event_msg', 'senergy:aspect')).toBe(air);
        });

        it('removes both attributes for an empty selection', async () => {
            open(reply('', []));
            expect(await attribute('Event_msg', 'senergy:aspects')).toBeUndefined();
            expect(await attribute('Event_msg', 'senergy:aspect')).toBeUndefined();
        });
    });

    describe('fields', () => {
        setup(createProcessModeler);

        const fieldOf = async (elementId: string | null, entryId: string, tag: string) => {
            modeler.get('selection').select(elementId ? element(elementId) : []);
            await panelSettled();
            return panel.querySelector(`[data-entry-id="${entryId}"] ${tag}`) as HTMLTextAreaElement | HTMLSelectElement;
        };
        // what the browser fires when focus leaves a field; preact listens to focusout
        const leave = (field: Element) => {
            field.dispatchEvent(new FocusEvent('blur'));
            field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        };
        const type = async (field: HTMLTextAreaElement | HTMLSelectElement, value: string) => {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            // the panel commits text after its 600 ms debounce
            await new Promise((resolve) => setTimeout(resolve, 700));
        };

        it('writes an event attribute and removes it when emptied', async () => {
            const field = await fieldOf('Event_msg', 'function-field', 'textarea');
            expect(field.value).toBe('urn:infai:ses:measuring-function:temperature');

            await type(field, 'urn:infai:ses:measuring-function:humidity');
            expect(await attribute('Event_msg', 'senergy:function')).toBe('urn:infai:ses:measuring-function:humidity');

            await type(field, '');
            expect(await attribute('Event_msg', 'senergy:function')).toBeUndefined();
            expect(await attribute('Event_msg', 'senergy:use_marshaller')).toBe('true');
        });

        // the panel's own text entries trim on blur; the designers always wrote what was typed
        it('writes an attribute exactly as typed, surrounding spaces included, when leaving the field', async () => {
            const field = await fieldOf('Event_msg', 'script-field', 'textarea');
            field.value = '  value > 1  ';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            leave(field);
            await panelSettled();

            expect(await attribute('Event_msg', 'senergy:script')).toBe('  value > 1  ');
            expect(field.value).toBe('  value > 1  ');
        });

        it('keeps line breaks and spaces in the process description', async () => {
            const field = await fieldOf(null, 'desc-field', 'textarea');
            await type(field, ' first line\nsecond line ');
            leave(field);
            await panelSettled();
            expect(await attribute('writers', 'senergy:description')).toBe(' first line\nsecond line ');
        });

        it('writes the deployment order', async () => {
            const field = await fieldOf('Task_1', 'order-field', 'select');
            expect((field as HTMLSelectElement).options.length).toBe(101);
            await type(field, '7');
            expect(await attribute('Task_1', 'senergy:order')).toBe('7');
        });

        it('writes the process description and removes it when emptied', async () => {
            const field = await fieldOf(null, 'desc-field', 'textarea');
            await type(field, 'heats the hall');
            expect(await attribute('writers', 'senergy:description')).toBe('heats the hall');
            await type(field, '');
            expect(await attribute('writers', 'senergy:description')).toBeUndefined();
        });
    });

    describe('smart-service groups', () => {
        setup(createSmartServiceModeler);

        it('shows inputs for start events, the task buttons for tasks and the description for the process', () => {
            expect(ids(smartServiceGroups(element('StartEvent_1'), modeler))).toEqual(['smart_service_inputs_group']);
            expect(smartServiceGroups(element('Task_1'), modeler).map((group: any) => group.entries.map((entry: any) => entry.id))).toEqual([
                ['smart-service-task-button', 'smart-service-extract-button'],
            ]);
            expect(ids(smartServiceGroups(root(), modeler))).toEqual(['description']);
            expect(ids(smartServiceGroups(element('Event_msg'), modeler))).toEqual([]);
        });

        it('writes the smart-service description and removes it when emptied', async () => {
            modeler.get('selection').select([]);
            await panelSettled();
            const field = panel.querySelector('[data-entry-id="desc-field"] textarea') as HTMLTextAreaElement;
            field.value = 'turns lights on';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 700));
            expect(await attribute('writers', 'senergy:description')).toBe('turns lights on');
            field.value = '';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 700));
            expect(await attribute('writers', 'senergy:description')).toBeUndefined();
        });
    });
});
