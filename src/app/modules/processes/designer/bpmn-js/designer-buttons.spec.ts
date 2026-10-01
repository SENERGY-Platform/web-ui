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
import { defaultProcessIoDesignerConfig } from '../../process-io/shared/process-io.model';
import { fetchText, importXml, mountModeler, MountedModeler } from '../../../../../testing/bpmn-modeler';

/*
 * Clicks the Senergy buttons the way a user does: found by label in the rendered properties
 * panel, independent of how the panel builds its DOM. Each must open its dialog through
 * designerCallbacks, and the dialog's answer must reach the model.
 */

const measuring = { id: 'urn:infai:ses:measuring-function:temperature', name: 'Get Temperature', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction' };
const controlling = { id: 'urn:infai:ses:controlling-function:color', name: 'Set Color', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction' };
const integer = (name: string) => ({ id: 'urn:infai:ses:characteristic:' + name, name, type: 'https://schema.org/Integer' });
const rgb = { id: 'urn:infai:ses:characteristic:rgb', name: 'rgb', type: 'https://schema.org/StructuredValue', sub_characteristics: [integer('r'), integer('g'), integer('b')] };
const connectorInfo = (overrides: any) => ({
    function: measuring,
    device_class: null,
    aspect: null,
    aspects: [],
    characteristic: rgb,
    completionStrategy: 'pessimistic',
    retries: 0,
    prefer_events: false,
    ...overrides,
});

/** Lets an asynchronously rendering panel catch up. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

function designer(create: (canvas: HTMLElement, panel: HTMLElement) => any, fixture: string) {
    let mounted: MountedModeler;
    let panel: HTMLElement;
    // fresh per test, so a test that forgets its spy finds no callback instead of a previous test's
    let callbacks: Record<string, jasmine.Spy>;

    const context = {
        get modeler() {
            return mounted.modeler;
        },
        get callbacks() {
            return callbacks;
        },
        element: (id: string) => mounted.modeler.get('elementRegistry').get(id),
        selected: () => mounted.modeler.get('selection').get()[0],
        async select(id: string) {
            mounted.modeler.get('selection').select(context.element(id));
            await settle();
        },
        /** The visible label of every button the panel shows for the selection. */
        buttonLabels: () => Array.from(panel.querySelectorAll('button')).map((button) => (button.textContent || '').trim()),
        async click(label: string) {
            const button = Array.from(panel.querySelectorAll('button')).find((candidate) => (candidate.textContent || '').trim() === label);
            if (!button) {
                throw new Error(`no button "${label}" in the panel, only ${JSON.stringify(context.buttonLabels())}`);
            }
            button.click();
            await settle();
        },
    };

    beforeEach(async () => {
        mounted = mountModeler((canvas, panelNode) => {
            panel = panelNode;
            return create(canvas, panelNode);
        });
        callbacks = { getInfoHtml: jasmine.createSpy('getInfoHtml').and.returnValue('') };
        mounted.modeler.designerCallbacks = callbacks;
        await importXml(mounted.modeler, await fetchText(fixture));
    });

    afterEach(() => mounted.destroy());

    return context;
}

/** A spy that answers the dialog by calling the argument at `callbackIndex` with `reply`. */
function answering(name: string, callbackIndex: number, ...reply: any[]): jasmine.Spy {
    return jasmine.createSpy(name).and.callFake((...args: any[]) => args[callbackIndex](...reply));
}

describe('process designer buttons', () => {
    const d = designer(createProcessModeler, '/bpmn-fixtures/process/writers.bpmn');

    it('Incident opens the incident dialog and makes an optimistic task', async () => {
        d.callbacks['processIncident'] = answering('processIncident', 1, { message: 'pump failed' });
        await d.select('Task_1');
        await d.click('Incident');

        expect(d.callbacks['processIncident']).toHaveBeenCalledWith({ message: '' }, jasmine.any(Function));
        expect(d.selected().businessObject.topic).toBe('optimistic');
    });

    it('Select Function opens the task config dialog and writes the device task', async () => {
        d.callbacks['findIotDeviceType'] = answering('findIotDeviceType', 1, connectorInfo({}));
        await d.select('Task_1');
        await d.click('Select Function');

        expect(d.callbacks['findIotDeviceType']).toHaveBeenCalledWith(undefined, jasmine.any(Function));
        expect(d.selected().businessObject.topic).toBe('pessimistic');
        expect(d.selected().businessObject.name).toBe('Task Get Temperature');
    });

    it('Select Output-Variables and Edit Input open their dialogs on a device task', async () => {
        d.callbacks['findIotDeviceType'] = answering('findIotDeviceType', 1, connectorInfo({}));
        d.callbacks['editOutput'] = jasmine.createSpy('editOutput');
        d.callbacks['editInput'] = jasmine.createSpy('editInput');
        await d.select('Task_1');
        await d.click('Select Function');
        await d.select(d.selected().id);
        await d.click('Select Output-Variables');
        expect(d.callbacks['editOutput'].calls.mostRecent().args[0].map((output: any) => output.name)).toEqual(['outputs.r', 'outputs.g', 'outputs.b']);
        expect(d.buttonLabels()).not.toContain('Edit Input');

        d.callbacks['findIotDeviceType'] = answering('findIotDeviceType', 1, connectorInfo({ function: controlling, completionStrategy: 'optimistic' }));
        await d.click('Select Function');
        await d.select(d.selected().id);
        await d.click('Edit Input');
        expect(d.callbacks['editInput']).toHaveBeenCalledWith(d.selected(), jasmine.any(Function));
        expect(d.buttonLabels()).not.toContain('Select Output-Variables');
    });

    it('Process-IO reads the config, opens the dialog and writes a process_io task', async () => {
        d.callbacks['getProcessIoConfigs'] = answering('getProcessIoConfigs', 0, defaultProcessIoDesignerConfig);
        d.callbacks['openProcessIoDialog'] = answering('openProcessIoDialog', 1, {
            set: [{ key: 'counter', instanceBound: false, definitionBound: false, value: '1' }],
            get: [],
        });
        await d.select('Task_1');
        await d.click('Process-IO');

        expect(d.callbacks['openProcessIoDialog']).toHaveBeenCalledWith({ set: [], get: [] }, jasmine.any(Function));
        expect(d.selected().businessObject.topic).toBe('process_io');
    });

    it('Notification opens the notification dialog and writes the connector', async () => {
        d.callbacks['configNotification'] = answering('configNotification', 2, 'Alarm', 'too hot');
        await d.select('Task_1');
        await d.click('Notification');

        expect(d.callbacks['configNotification']).toHaveBeenCalledWith('', '', jasmine.any(Function), jasmine.any(Function));
        expect(d.selected().businessObject.name).toBe('send notification');
    });

    it('Add data analysis opens the historic data dialog and writes an export task', async () => {
        d.callbacks['editHistoricDataConfig'] = answering('editHistoricDataConfig', 1, { analysisAction: 'mean' });
        await d.select('Task_1');
        await d.click('Add data analysis');

        expect(d.callbacks['editHistoricDataConfig']).toHaveBeenCalledWith(undefined, jasmine.any(Function));
        expect(d.selected().businessObject.topic).toBe('export');
    });

    it('shows the incoming variables of a task from getInfoHtml', async () => {
        await d.select('Task_1');
        expect(d.callbacks['getInfoHtml']).toHaveBeenCalledWith(d.element('Task_1'));
    });

    it('Edit Conditional Event opens the dialog with the attributes and writes the answer', async () => {
        d.callbacks['editConditionalEvent'] = answering('editConditionalEvent', 1, {
            aspect: 'urn:infai:ses:aspect:water',
            aspects: ['urn:infai:ses:aspect:water'],
            iotfunction: measuring.id,
            characteristic: '',
            script: 'value > 1',
            valueVariableName: 'value',
            variables: '',
            qos: '0',
            label: 'Water',
        });
        await d.select('Event_msg');
        await d.click('Edit Conditional Event');

        const model = d.callbacks['editConditionalEvent'].calls.mostRecent().args[0];
        expect(model.aspect).toBe('urn:infai:ses:aspect:air');
        expect(model.aspects).toEqual(['urn:infai:ses:aspect:air']);
        const bo = d.element('Event_msg').businessObject;
        expect(bo.get('senergy:aspect')).toBe('urn:infai:ses:aspect:water');
        expect(bo.get('senergy:script')).toBe('value > 1');
        expect(bo.name).toBe('Water');
    });

    [
        { label: 'set Duration', dialog: 'durationDialog', initial: undefined, result: { iso: { string: 'PT1M' }, text: '1 minute' }, kind: 'timeDuration', body: 'PT1M' },
        { label: 'set Date', dialog: 'dateDialog', initial: '2020-05-12T23:13:00.000Z', result: { iso: '2030-01-01T00:00:00.000Z', text: 'new year' }, kind: 'timeDate', body: '2030-01-01T00:00:00.000Z' },
        { label: 'set Cycle', dialog: 'cycleDialog', initial: undefined, result: { cron: '0 0 * * * ?', text: 'hourly' }, kind: 'timeCycle', body: '0 0 * * * ?' },
    ].forEach(({ label, dialog, initial, result, kind, body }) => {
        it(`${label} opens its dialog with the current value and writes the timer`, async () => {
            d.callbacks[dialog] = jasmine.createSpy(dialog).and.returnValue(Promise.resolve(result));
            await d.select('Timer_1');
            await d.click(label);

            expect(d.callbacks[dialog]).toHaveBeenCalledWith(initial);
            const definition = d.element('Timer_1').businessObject.eventDefinitions[0];
            expect(definition[kind].body).toBe(body);
            expect(d.element('Timer_1').businessObject.name).toBe(result.text);
        });
    });
});

describe('process designer script editor button', () => {
    const d = designer(createProcessModeler, '/bpmn-fixtures/process/senergy_all_attributes.bpmn');

    it('opens the condition in the script editor and saves the edited script', async () => {
        d.callbacks['editScript'] = answering('editScript', 2, { script: 'temperature > 30', scriptFormat: 'JavaScript', label: '' });
        await d.select('Flow_hot');
        await d.click('Open in Editor');

        const [model, element] = d.callbacks['editScript'].calls.mostRecent().args;
        expect(model.script).toBe('temperature > 20 && temperature < 90');
        expect(element).toBe(d.element('Flow_hot'));
        expect(d.element('Flow_hot').businessObject.conditionExpression.body).toBe('temperature > 30');
    });
});

describe('smart-service designer buttons', () => {
    const d = designer(createSmartServiceModeler, '/bpmn-fixtures/process/writers.bpmn');

    it('Edit Smart-Service Inputs opens the inputs dialog and writes the formData', async () => {
        d.callbacks['openSmartServiceInputsEditDialog'] = answering('openSmartServiceInputsEditDialog', 2, {
            inputs: [{ id: 'device', label: 'Device', type: 'string', default_value: '', properties: [] }],
        });
        await d.select('StartEvent_1');
        await d.click('Edit Smart-Service Inputs');

        expect(d.callbacks['openSmartServiceInputsEditDialog']).toHaveBeenCalledWith({ inputs: [] }, d.element('StartEvent_1'), jasmine.any(Function));
        expect(d.element('StartEvent_1').businessObject.extensionElements.values[0].fields[0].id).toBe('device');
    });

    it('Edit Smart-Service Task opens the task dialog and writes the task', async () => {
        d.callbacks['openTaskEditDialog'] = answering('openTaskEditDialog', 2, {
            name: 'import weather', topic: 'import', inputs: [], outputs: [], smartServiceInputs: { inputs: [] },
        });
        await d.select('Task_1');
        await d.click('Edit Smart-Service Task');

        const [info, element] = d.callbacks['openTaskEditDialog'].calls.mostRecent().args;
        expect(info).toEqual({ topic: '', name: 'Task', inputs: [], smartServiceInputs: { inputs: [] } });
        expect(element.businessObject.$type).toBe('bpmn:Task');
        // the replacement keeps the id, so the result variables match the task
        expect(d.selected().id).toBe('Task_1');
        expect(d.selected().businessObject.topic).toBe('import');
        expect(d.selected().businessObject.extensionElements.values[0].outputParameters[0].name).toBe('Task_1_import_id');
    });

    it('Extract Field from JSON opens the extraction dialog and writes a plain task', async () => {
        d.callbacks['openExtractJsonFieldsDialog'] = answering('openExtractJsonFieldsDialog', 2, {
            name: 'extract lon', inputs: [], outputs: [{ type: 'script', name: 'lon', value: '1' }],
        });
        await d.select('Task_extract');
        await d.click('Extract Field from JSON');

        expect(d.callbacks['openExtractJsonFieldsDialog'].calls.mostRecent().args[0].name).toBe('extract');
        expect(d.selected().businessObject.$type).toBe('bpmn:Task');
        expect(d.selected().businessObject.name).toBe('extract lon');
    });
});
