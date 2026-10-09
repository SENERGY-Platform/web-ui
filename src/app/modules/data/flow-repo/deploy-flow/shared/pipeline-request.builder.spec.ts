/*
 * Copyright 2020 InfAI (CC SES)
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

import { buildPipelineRequest, InputFormValue, NodeFormValue, PipelineFormValue, sortedAspectIds } from './pipeline-request.builder';

describe('pipeline request builder', () => {
    const service = 'urn:infai:ses:service:s1';
    const importId = 'urn:infai:ses:import:i1';

    const input = (name: string, filter: [string, { serviceId: string; path: string }[]][] = [], extra: Partial<InputFormValue> = {}): InputFormValue => ({
        name, aspectIds: [], characteristics: ['c1'], functionId: 'fn', selectableId: 'sel', filter: new Map(filter), pipelines: [], ...extra,
    });
    const node = (inputs: InputFormValue[], extra: Partial<NodeFormValue> = {}): NodeFormValue => ({
        id: 'n1', deploymentType: 'cloud', persistData: false, configs: [], inputs, ...extra,
    });
    const form = (nodes: NodeFormValue[], extra: Partial<PipelineFormValue> = {}): PipelineFormValue => ({
        name: 'P', description: 'D', consumeAllMessages: false, metrics: true, windowTime: 30, mergeStrategy: 'inner', nodes, ...extra,
    });

    it('copies the top level, takes the ids as given and parses the window time', () => {
        const req = buildPipelineRequest(form([], { windowTime: '45', consumeAllMessages: true, mergeStrategy: 'outer' }), 'flow', 'p1');
        expect(req).toEqual({
            flowId: 'flow', id: 'p1', name: 'P', description: 'D', consumeAllMessages: true, metrics: true, windowTime: 45, mergeStrategy: 'outer', nodes: [],
        });
        expect(buildPipelineRequest(form([]), 'flow', null).id).toBeNull();
    });

    it('copies node fields and configs in order', () => {
        const req = buildPipelineRequest(form([node([], { persistData: true, configs: [{ name: 'a', value: '1' }, { name: 'b', value: '2' }] })]), 'f', null);
        expect(req.nodes[0]).toEqual({
            nodeId: 'n1', deploymentType: 'cloud', persistData: true, inputSelections: [], inputs: [],
            config: [{ name: 'a', value: '1' }, { name: 'b', value: '2' }],
        });
    });

    it('writes both aspect spellings sorted, and the null alias without aspect', () => {
        const aspects = ['urn:infai:ses:aspect:water', 'urn:infai:ses:aspect:air', 'urn:infai:ses:aspect:air'];
        const selections = buildPipelineRequest(form([node([input('a', [], { aspectIds: aspects }), input('b')])]), 'f', null).nodes[0].inputSelections;
        expect(selections?.[0]).toEqual({
            inputName: 'a', aspectId: 'urn:infai:ses:aspect:air', aspectIds: ['urn:infai:ses:aspect:air', 'urn:infai:ses:aspect:water'],
            characteristicIds: ['c1'], functionId: 'fn', selectableId: 'sel',
        });
        expect(selections?.[1].aspectId).toBeNull();
        expect('aspectIds' in (selections?.[1] as object)).toBe(false);
    });

    it('sorts and deduplicates aspect ids', () => {
        expect(sortedAspectIds(['b', 'a', 'b'])).toEqual(['a', 'b']);
        expect(sortedAspectIds(null)).toEqual([]);
        expect(sortedAspectIds(undefined)).toEqual([]);
    });

    it('joins devices per topic and value, trims id modifiers and replaces colons in the topic', () => {
        const inputs = [input('a', [['d1$m', [{ serviceId: service, path: 'x' }]], ['d2', [{ serviceId: service, path: 'x' }]], ['d2', [{ serviceId: service, path: 'x' }]]])];
        expect(buildPipelineRequest(form([node(inputs)]), 'f', null).nodes[0].inputs).toEqual([
            { filterType: 'deviceId', filterIds: 'd1,d2', topicName: 'urn_infai_ses_service_s1', values: [{ name: 'a', path: 'x' }] },
        ]);
    });

    it('joins the values of inputs over the same devices and topic', () => {
        const same = (path: string) => [['d1', [{ serviceId: service, path }]], ['d2', [{ serviceId: service, path }]]] as [string, { serviceId: string; path: string }[]][];
        const req = buildPipelineRequest(form([node([input('a', same('x')), input('b', same('y'))])]), 'f', null);
        expect(req.nodes[0].inputs?.length).toBe(1);
        expect(req.nodes[0].inputs?.[0].values).toEqual([{ name: 'a', path: 'x' }, { name: 'b', path: 'y' }]);
    });

    it('types the filter by the first id of the group', () => {
        const req = buildPipelineRequest(form([node([input('a', [[importId, [{ serviceId: 'urn:infai:ses:import-type:t', path: 'x' }]]])])]), 'f', null);
        expect(req.nodes[0].inputs?.[0].filterType).toBe('ImportId');
    });

    it('puts operator inputs first and joins operators by topic and value, then values by operators', () => {
        const pipe = (pipelineId: string, operatorId: string, path: string) => ({ pipelineId, operatorId, topic: 'analytics-A', path });
        const inputs = [
            input('a', [['d1', [{ serviceId: service, path: 'x' }]]], { pipelines: [pipe('p1', 'o1', 'v'), pipe('p2', 'o2', 'v'), pipe('p1', 'o1', 'v')] }),
            input('b', [], { pipelines: [pipe('p1', 'o1', 'w'), pipe('p2', 'o2', 'w')] }),
        ];
        expect(buildPipelineRequest(form([node(inputs)]), 'f', null).nodes[0].inputs).toEqual([
            { filterType: 'operatorId', filterIds: 'o1:p1,o2:p2', topicName: 'analytics-A', values: [{ name: 'a', path: 'v' }, { name: 'b', path: 'w' }] },
            { filterType: 'deviceId', filterIds: 'd1', topicName: 'urn_infai_ses_service_s1', values: [{ name: 'a', path: 'x' }] },
        ]);
    });

    it('does not carry filters from one node to the next', () => {
        const req = buildPipelineRequest(form([node([input('a', [['d1', [{ serviceId: service, path: 'x' }]]])]), node([input('b')], { id: 'n2' })]), 'f', null);
        expect(req.nodes[1].inputs).toEqual([]);
        expect(req.nodes[1].nodeId).toBe('n2');
    });
});
