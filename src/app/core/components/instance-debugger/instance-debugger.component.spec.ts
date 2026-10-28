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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UrlStateService } from '../../services/url-state.service';
import { DebugStreamUpdate, InstanceDebugStreamService } from './debug-stream.service';
import { debugState } from './debug-state.mock';
import { InstanceDebuggerComponent } from './instance-debugger.component';

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Defs" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="P" isExecutable="true">
    <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_A" />
    <bpmn:serviceTask id="Task_A" name="Do A"><bpmn:incoming>Flow_1</bpmn:incoming></bpmn:serviceTask>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram">
    <bpmndi:BPMNPlane id="Plane" bpmnElement="P">
      <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="100" y="100" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="136" y="118" /><di:waypoint x="200" y="118" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Task_A_di" bpmnElement="Task_A"><dc:Bounds x="200" y="78" width="100" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

describe('InstanceDebuggerComponent', () => {
    let fixture: ComponentFixture<InstanceDebuggerComponent>;
    let component: InstanceDebuggerComponent;
    let http: HttpTestingController;
    let query: { [key: string]: string };
    let urlSets: any[];
    let stream: Subject<DebugStreamUpdate>;
    let watchCalls: any[][];
    const instance = () => environment.automationEngineUrl + '/namespaces/smart-services/instances/i-1';

    const urlState = {
        get: (key: string) => query[key] ?? null,
        getInt: (key: string, fallback: number) => (query[key] ? parseInt(query[key], 10) : fallback),
        getBoolean: (key: string, fallback: boolean) => (query[key] ? query[key] === 'true' : fallback),
        set: (params: any) => urlSets.push(params),
    };

    /** bpmn-js imports asynchronously */
    const until = async (condition: () => boolean) => {
        for (let i = 0; i < 100 && !condition(); i++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(condition()).toBeTrue();
    };

    const create = () => {
        fixture = TestBed.createComponent(InstanceDebuggerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    const flushDiagram = () => http.expectOne(environment.automationEngineUrl + '/namespaces/smart-services/deployments/d-1/versions/2').flush({ deployment_id: 'd-1', version: 2, xml: BPMN, svg: '' });

    const hasMarker = (id: string, marker: string): boolean => {
        const viewer = (component as any).viewer;
        return !!viewer.get('elementRegistry').get(id) && viewer.get('canvas').hasMarker(id, marker);
    };

    beforeEach(() => {
        query = {};
        urlSets = [];
        stream = new Subject<DebugStreamUpdate>();
        watchCalls = [];
        TestBed.configureTestingModule({
            imports: [InstanceDebuggerComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideNoopAnimations(),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { data: { namespace: 'smart-services', back: '/smart-services/instances' }, paramMap: convertToParamMap({ id: 'i-1' }) } },
                },
                { provide: UrlStateService, useValue: urlState },
                {
                    provide: InstanceDebugStreamService,
                    useValue: {
                        watch: (...args: any[]) => {
                            watchCalls.push(args);
                            return stream;
                        },
                    },
                },
            ],
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => fixture?.destroy());

    it('follows the instance live and marks the diagram', async () => {
        create();
        expect(watchCalls).toEqual([['smart-services', 'i-1', false]]);
        stream.next({
            status: 'live',
            activities: [],
            state: debugState({
                instance: { ...debugState().instance, namespace: 'smart-services' },
                elements: [
                    { element_id: 'Start', run: 1, count: 1, last_at: '' },
                    { element_id: 'Flow_1', run: 1, count: 1, last_at: '' },
                    { element_id: 'Task_A', run: 1, count: 2, last_at: '' },
                ],
            }),
        });
        flushDiagram();
        await until(() => hasMarker('Task_A', 'debug-active'));
        expect(hasMarker('Flow_1', 'debug-passed')).toBeTrue();
        expect(hasMarker('Start', 'debug-active')).toBeFalse();
        const badges = Array.from(fixture.nativeElement.querySelectorAll('.debug-count')).map((e: any) => e.textContent);
        // counts on shapes only, not on the sequence flow
        expect(badges.sort()).toEqual(['1', '2']);
        expect(component.elementName('Task_A')).toBe('Do A');

        // the next delta moves the token on; the old marker goes
        stream.next({ status: 'live', activities: [], state: debugState({ active: [], elements: [] }) });
        expect(hasMarker('Task_A', 'debug-active')).toBeFalse();
        expect(urlSets).toEqual([]);
    });

    it('shows a step of the history from the URL and steps through it', async () => {
        query = { step: '4' };
        create();
        expect(watchCalls.length).toBe(0);
        http.expectOne(instance() + '/history?seq=4').flush(debugState({ reconstructed: true, first_seq: 2 }));
        expect(component.mode).toBe('history');
        expect(urlSets).toContain({ step: 4 });
        http.expectOne(instance() + '/activities?after_seq=1&limit=21').flush({ items: [{ instance_id: 'i-1', run: 1, seq: 4, time: '', kind: 'element_entered', element_id: 'Task_A' }], truncated: false });
        // the latest step bounds the step forward
        http.expectOne(instance() + '/history').flush(debugState({ seq: 9 }));
        expect(component.latestSeq).toBe(9);
        flushDiagram();
        await until(() => hasMarker('Task_A', 'debug-active'));

        component.next();
        http.expectOne(instance() + '/history?seq=5').flush(debugState({ seq: 5, first_seq: 2 }));
        http.expectOne(instance() + '/activities?after_seq=1&limit=21').flush({ items: [], truncated: false });
        component.first();
        http.expectOne(instance() + '/history?seq=2').flush(debugState({ seq: 2, first_seq: 2 }));
        http.expectOne(instance() + '/activities?after_seq=1&limit=21').flush({ items: [], truncated: false });
        component.previous();
        http.expectNone(instance() + '/history?seq=1');

        component.startLive();
        expect(component.mode).toBe('live');
        expect(watchCalls.length).toBe(1);
    });

    it('shows the message of the engine when a step is no longer available', () => {
        query = { step: '1' };
        create();
        http.expectOne(instance() + '/history?seq=1').flush(
            { kind: 'not_found', message: 'step 1 of instance i-1 is no longer available, the earliest is 40' },
            { status: 404, statusText: 'Not Found' },
        );
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('the earliest is 40');
    });

    it('loads the complete value of a truncated local variable at the step shown', () => {
        query = { step: '4' };
        create();
        const state = debugState({
            active: [{ element_id: 'Task_A', element_type: 'serviceTask', since: '', tokens: 1, locals: { big: { value: 'abc', type: 'string', updated_at: '', truncated: true, size: 5000 } } }],
        });
        http.expectOne(instance() + '/history?seq=4').flush(state);
        http.expectOne(instance() + '/activities?after_seq=0&limit=21').flush({ items: [], truncated: false });
        http.expectOne(instance() + '/history').flush(state);
        const row = component.variableRows.find((r) => r.name === 'big')!;
        expect(row.elementId).toBe('Task_A');
        component.loadFullValue(row);
        http.expectOne(instance() + '/history/variables/big?seq=4&element_id=Task_A').flush({ seq: 4, name: 'big', available: false });
        expect(component.fullValues.get('Task_A/big')).toEqual({ unavailable: true });
        flushDiagram();
    });
});
