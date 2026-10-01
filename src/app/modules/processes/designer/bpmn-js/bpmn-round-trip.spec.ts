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
import { canonicalBpmn, diffCanonical, namespaceDeclarations, prefixesInUse, senergyAttributes } from '../../../../../testing/bpmn-xml-compare';
import { fetchText, importXml, mountModeler, MountedModeler, saveSvg, saveXml } from '../../../../../testing/bpmn-modeler';

/*
 * Models the backends parse with literal prefixed paths (process-deployment,
 * smart-service-repository), copied unchanged from their test resources. Importing and saving
 * one in the designer must not change what those backends read.
 */
interface Fixture {
    file: string;
    covers: string;
    /** Import warnings the model is known to raise; any other warning fails. */
    warnings?: string[];
    /** Differences the designer is known to make to the model, each with its reason. */
    expectedDiffs?: string[];
}

const processFixtures: Fixture[] = [
    { file: 'senergy_all_attributes.bpmn', covers: 'every senergy event attribute incl. aspect and aspects, order, task payload with both aspect fields, condition, script task, listener and input scripts, conditional start event' },
    { file: '0pools0lanes1notification.bpmn', covers: 'notification http-connector, Camunda Modeler exporter attributes' },
    { file: '0pools0lanes1task_filtered.bpmn', covers: 'measuring task payload with a single aspect' },
    { file: '0pools0lanes2tasks.bpmn', covers: 'measuring and controlling tasks, inputs.* and outputs.*, senergy:description' },
    { file: '0pools0lanes4events.bpmn', covers: 'timer duration, date, cycle and empty timer, message events, xsi:type' },
    { file: '0pools0lanes5events.bpmn', covers: 'message start event with senergy function, characteristic and aspect' },
    { file: '0pools0lane_with_order.bpmn', covers: 'senergy:order on tasks and events, notification connector' },
    { file: '1pool2lanes4tasks.bpmn', covers: 'pool with two lanes' },
    { file: '2pools3lanes5tasks.bpmn', covers: 'two pools, message flow, senergy:description on the collaboration, payloads with trailing whitespace' },
    { file: 'conditional_event_1.bpmn', covers: 'event with senergy:script and the never written senergy:use_marshaller' },
    { file: 'conditional_event_2.bpmn', covers: 'start event with senergy:script' },
    { file: 'conditional_event_3.bpmn', covers: 'senergy:value_variable_name and JSON in senergy:variables' },
    { file: 'conditional_event_aspect_list.bpmn', covers: 'senergy:aspects without senergy:aspect' },
    { file: 'conditional_event_qos.bpmn', covers: 'senergy:qos' },
    { file: 'use_marshaller.bpmn', covers: 'senergy:use_marshaller without a script' },
    { file: 'task_aspect_list.bpmn', covers: 'task payload with an aspects list' },
    {
        file: 'parameter-restart.bpmn',
        covers: 'start event formData with properties',
        warnings: ['unresolved reference <SequenceFlow_0ax5407>'],
        expectedDiffs: [
            // the fixture names an outgoing flow that does not exist; the modeler drops the dangling reference
            '/bpmn:definitions[id=Definitions_1]/bpmn:process[id=ExampleId]/bpmn:startEvent[id=StartEvent_1]/bpmn:outgoing: text "SequenceFlow_0qjn3dq" instead of "SequenceFlow_0ax5407"',
            '/bpmn:definitions[id=Definitions_1]/bpmn:process[id=ExampleId]/bpmn:startEvent[id=StartEvent_1]: element bpmn:outgoing lost',
        ],
    },
    { file: 'estimate_start_parameter.bpmn', covers: 'formData, output scripts, plain task, empty input parameters, multi-line JSON' },
    { file: 'collaboration_description.bpmn', covers: 'unprefixed description attribute on a collaboration' },
    { file: 'process_description.bpmn', covers: 'unprefixed description attribute on a process' },
    { file: 'email_example.bpmn', covers: 'legacy mail-send connector' },
    { file: 'import.bpmn', covers: 'whitespace around a flow reference, label bounds' },
];

const smartServiceFixtures: Fixture[] = [
    { file: 'params.bpmn', covers: 'every formField shape the smart-service parameters read, single-line XML' },
    { file: 'nameanddesc.bpmn', covers: 'senergy:description on the process' },
    { file: 'no_device_option.bpmn', covers: 'start event without outgoing flow' },
    { file: 'json_location_input.bpmn', covers: 'task output scripts, info module with ${} placeholders' },
    { file: 'process_deployment.bpmn', covers: 'non-JSON parameter text with trailing whitespace' },
    { file: 'maintenance_test.bpmn', covers: 'two start events, message start event with formData' },
    { file: 'v2_smart_service_analytics_process_example.bpmn', covers: 'input script parameter, analytics and process_deployment topics' },
    { file: 'test_big_inputs.bpmn', covers: 'large multi-line parameter values, empty parameters' },
    { file: 'empty-analytics-test.bpmn', covers: 'parameters with empty text' },
    { file: 'auto_select_all_input.bpmn', covers: 'auto_select_all and entity_only properties' },
    { file: 'invalid_conditional_start.bpmn', covers: 'conditional start event outside an event subprocess' },
];

// senergy:* (and the stray unprefixed description) are untyped by design; the specs below assert they survive
const UNTYPED_ATTRIBUTE = /^unknown attribute <(senergy:[a-z_]+|description)>$/;

async function importWarnings(modeler: any, xml: string): Promise<string[]> {
    return (await importXml(modeler, xml)).filter((message) => !UNTYPED_ATTRIBUTE.test(message));
}

function roundTrip(name: string, createModeler: (canvas: HTMLElement, panel: HTMLElement) => any, url: (file: string) => string, fixtures: Fixture[]) {
    describe(`${name} round trip`, () => {
        let mounted: MountedModeler;
        let modeler: any;

        beforeEach(() => {
            mounted = mountModeler(createModeler);
            modeler = mounted.modeler;
        });

        afterEach(() => mounted.destroy());

        fixtures.forEach((fixture) => {
            describe(`${fixture.file} (${fixture.covers})`, () => {
                let original: string;
                let saved: string;
                let warnings: string[];

                beforeEach(async () => {
                    original = await fetchText(url(fixture.file));
                    warnings = await importWarnings(modeler, original);
                    saved = await saveXml(modeler);
                });

                it('imports with only the known warnings', () => {
                    expect(warnings).toEqual(fixture.warnings || []);
                });

                // The designer has always trimmed element text on import, and the backends compare
                // text exactly (connectorId, deploymentIdentifier, flowNodeRef), so trimmed is the contract.
                it('keeps every element, attribute, trimmed text and DI bound', () => {
                    expect(diffCanonical(canonicalBpmn(original, { trimText: true }), canonicalBpmn(saved))).toEqual(fixture.expectedDiffs || []);
                });

                it('keeps the bpmn, bpmndi and camunda prefixes the backends parse with', () => {
                    const inUse = prefixesInUse(saved);
                    expect(inUse).toEqual(prefixesInUse(original));
                    expect(inUse['bpmn']).toBe('http://www.omg.org/spec/BPMN/20100524/MODEL');
                    expect(inUse['bpmndi']).toBe('http://www.omg.org/spec/BPMN/20100524/DI');
                    if (original.includes('camunda:')) {
                        expect(inUse['camunda']).toBe('http://camunda.org/schema/1.0/bpmn');
                    }
                    const declared = namespaceDeclarations(saved);
                    Object.keys(inUse).forEach((prefix) => expect(declared[prefix]).withContext(prefix).toBe(inUse[prefix]));
                });

                it('keeps every senergy attribute with its value', () => {
                    expect(senergyAttributes(saved)).toEqual(senergyAttributes(original));
                });

                it('saves its own output unchanged', async () => {
                    expect(await importWarnings(modeler, saved)).toEqual([]);
                    expect(await saveXml(modeler)).toBe(saved);
                });

                it('renders an SVG preview', async () => {
                    const svg = await saveSvg(modeler);
                    expect(svg).toContain('<svg');
                    expect(svg).toContain('djs-');
                });
            });
        });
    });
}

roundTrip('process designer', createProcessModeler, (file) => '/bpmn-fixtures/process/' + file, processFixtures);
roundTrip('smart-service designer', createSmartServiceModeler, (file) => '/bpmn-fixtures/smart-service/' + file, smartServiceFixtures);
roundTrip('new diagram', createProcessModeler, () => '/assets/bpmn/initial.bpmn', [{ file: 'initial.bpmn', covers: 'the template a new process starts from' }]);
