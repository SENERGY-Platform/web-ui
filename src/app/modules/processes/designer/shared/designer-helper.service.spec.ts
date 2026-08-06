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

import { DesignerHelperService } from './designer-helper.service';
import { BpmnElement } from './designer.model';

/*
 * Covers which process variables a script is offered. Getting this wrong in the
 * permissive direction is the failure that matters: suggesting a variable that is not
 * set yet produces a condition that silently evaluates against undefined at runtime.
 *
 * getAvailableVariables touches none of the injected services, so the service is
 * constructed directly rather than through the TestBed.
 */
describe('DesignerHelperService.getAvailableVariables', () => {
    const service = new DesignerHelperService(null as any);

    const task = (id: string, outputs: string[] = [], incoming: BpmnElement[] = []): BpmnElement =>
        ({
            id,
            incoming: incoming.map((source) => ({ source })),
            businessObject: {
                $type: 'bpmn:ServiceTask',
                extensionElements: {
                    values: [
                        {
                            $type: 'camunda:InputOutput',
                            inputParameters: [],
                            outputParameters: outputs.map((name) => ({ name, value: '' })),
                        },
                    ],
                },
            },
        }) as BpmnElement;

    const gateway = (id: string, incoming: BpmnElement[] = []): BpmnElement =>
        ({
            id,
            incoming: incoming.map((source) => ({ source })),
            businessObject: { $type: 'bpmn:ExclusiveGateway', extensionElements: {} },
        }) as BpmnElement;

    const sequenceFlow = (id: string, source: BpmnElement): BpmnElement =>
        ({
            id,
            businessObject: { $type: 'bpmn:SequenceFlow', extensionElements: {} },
            source,
        }) as BpmnElement;

    it('offers nothing at the very start of a process', () => {
        expect(service.getAvailableVariables(task('Task_1'))).toEqual([]);
    });

    it('offers the outputs of the directly preceding task', () => {
        const first = task('Task_1', ['consumption']);

        expect(service.getAvailableVariables(task('Task_2', [], [first]))).toEqual(['consumption']);
    });

    it('offers outputs from further upstream, not just the immediate predecessor', () => {
        const first = task('Task_1', ['surplus']);
        const second = task('Task_2', ['consumption'], [first]);

        expect(service.getAvailableVariables(task('Task_3', [], [second]))).toEqual(['consumption', 'surplus']);
    });

    it('does not offer an element its own outputs, which it has not produced yet', () => {
        const previous = task('Task_1', ['consumption']);

        expect(service.getAvailableVariables(task('Task_2', ['not_yet_set'], [previous]))).toEqual(['consumption']);
    });

    it('offers a sequence flow the outputs of the element it leaves', () => {
        // the condition is evaluated after that element has run
        const source = task('Task_1', ['consumption']);

        expect(service.getAvailableVariables(sequenceFlow('SequenceFlow_1', source))).toEqual(['consumption']);
    });

    it('offers a sequence flow out of a gateway everything set before the gateway', () => {
        const power = task('Task_1', ['consumption', 'consumption_device']);
        const surplus = task('Task_2', ['surplus', 'on'], [power]);

        const flow = sequenceFlow('SequenceFlow_0u1390w', gateway('Gateway_1', [surplus]));

        expect(service.getAvailableVariables(flow)).toEqual(['consumption', 'consumption_device', 'on', 'surplus']);
    });

    it('offers nothing on a flow leaving the start of the process', () => {
        expect(service.getAvailableVariables(sequenceFlow('SequenceFlow_1', task('StartEvent_1')))).toEqual([]);
    });

    it('merges the branches of a joining gateway', () => {
        const left = task('Task_left', ['left_value']);
        const right = task('Task_right', ['right_value']);

        const join = gateway('Gateway_join', [left, right]);

        expect(service.getAvailableVariables(join)).toEqual(['left_value', 'right_value']);
    });

    it('reports a variable once when two upstream branches both set it', () => {
        const left = task('Task_left', ['shared']);
        const right = task('Task_right', ['shared']);

        expect(service.getAvailableVariables(gateway('Gateway_join', [left, right]))).toEqual(['shared']);
    });

    it('ignores what happens after the element, which has not run yet', () => {
        const previous = task('Task_1', ['before']);
        const current = task('Task_2', [], [previous]);
        // a later task pointing back at current must not contribute its outputs
        task('Task_3', ['after'], [current]);

        expect(service.getAvailableVariables(current)).toEqual(['before']);
    });

    it('terminates on a loop in the flow instead of recursing forever', () => {
        const first = task('Task_1', ['first_value']);
        const second = task('Task_2', ['second_value'], [first]);
        // close the loop: Task_1 also comes back from Task_2
        first.incoming = [{ source: second }];

        expect(service.getAvailableVariables(task('Task_3', [], [second]))).toEqual(['first_value', 'second_value']);
    });

    it('skips elements that declare no output parameters at all', () => {
        const noExtensions = gateway('Gateway_1');
        const withOutput = task('Task_1', ['kept'], [noExtensions]);

        expect(service.getAvailableVariables(task('Task_2', [], [withOutput]))).toEqual(['kept']);
    });

    it('drops output parameters that have no name', () => {
        const broken = task('Task_1');
        broken.businessObject.extensionElements.values = [
            { $type: 'camunda:InputOutput', inputParameters: [], outputParameters: [{ name: '', value: '' }] },
        ];

        expect(service.getAvailableVariables(task('Task_2', [], [broken]))).toEqual([]);
    });
});
