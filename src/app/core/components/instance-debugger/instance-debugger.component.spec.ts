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

    it('searches the history and jumps to an entry found', async () => {
        create();
        stream.next({ status: 'live', activities: [], state: debugState() });
        flushDiagram();
        await until(() => component.diagramElements.length > 0);
        expect(component.diagramElements).toEqual([
            { id: 'Task_A', name: 'Do A' },
            { id: 'Start', name: 'Start' },
        ]);

        component.search = { variable: ' level ', value: '21', kind: undefined };
        component.runSearch();
        const found = { instance_id: 'i-1', run: 1, seq: 7, time: '', kind: 'variable_set', data: { name: 'level', value: 21.5 } };
        http.expectOne(instance() + '/activities?after_seq=0&limit=50&variable=level&value=21').flush({
            items: Array.from({ length: 50 }, (_, i) => ({ ...found, seq: i + 1 })),
            truncated: false,
        });
        expect(component.searchHasMore).toBeTrue();
        component.runSearch(true);
        http.expectOne(instance() + '/activities?after_seq=50&limit=50&variable=level&value=21').flush({ items: [{ ...found, seq: 70 }], truncated: false });
        expect(component.searchHasMore).toBeFalse();
        expect(component.shownActivities.length).toBe(51);

        component.jumpToActivity(component.shownActivities[50]);
        http.expectOne(instance() + '/history?seq=70').flush(debugState({ seq: 70 }));
        http.expectOne((r) => r.url === instance() + '/activities' && !r.params.has('variable')).flush({ items: [], truncated: false });
        expect(component.shownActivities.length).toBe(51);

        component.clearSearch();
        expect(component.shownActivities).toEqual([]);
        component.runSearch();
        http.expectNone((r) => r.url === instance() + '/activities');
    });

    it('sets a variable and triggers a waiting timer while following the instance live', () => {
        create();
        const wait = { element_id: 'Task_A', kind: 'timer', since: '', timer: { definition: 'PT1H' } };
        stream.next({ status: 'live', activities: [], state: debugState({ waits: [wait] }) });
        fixture.detectChanges();
        expect(component.canIntervene).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Fire now');

        const row = component.variableRows.find((r) => r.name === 'a')!;
        component.editVariable(row);
        expect(component.editing?.text).toBe('1');
        component.editing!.text = 'warm';
        component.saveVariable();
        expect(component.editing?.error).toContain('double quotes');
        http.expectNone(instance() + '/variables/a');
        component.editing!.text = '{"target": 21}';
        component.saveVariable();
        const put = http.expectOne(instance() + '/variables/a');
        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ value: { target: 21 } });
        put.flush(null, { status: 204, statusText: 'No Content' });
        expect(component.editing).toBeNull();
        expect(component.actionDone).toBe('Variable a set.');

        component.startTrigger(wait);
        component.trigger();
        const post = http.expectOne(instance() + '/waits/Task_A/trigger');
        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual({});
        post.flush({ kind: 'forbidden', message: 'missing right write on instance i-1' }, { status: 403, statusText: 'Forbidden' });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('missing right write on instance i-1');
        expect(component.triggering).not.toBeNull();
        flushDiagram();
    });

    it('keeps the variable editor across checks', () => {
        query = { tab: '1' };
        create();
        stream.next({ status: 'live', activities: [], state: debugState() });
        component.editVariable(component.variableRows.find((r) => r.name === 'a')!);
        fixture.detectChanges();
        const editor = fixture.nativeElement.querySelector('.debugger-value textarea');
        expect(editor).not.toBeNull();
        // the rows are built anew on every check; created anew in the DOM as well, the ngModel of each new
        // editor asked for the next check and the page hung
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.debugger-value textarea')).toBe(editor);
        flushDiagram();
    });

    it('passes local variables of a triggered event and loads a cut value before editing it', async () => {
        create();
        const wait = { element_id: 'Task_A', kind: 'message', since: '', message: { name: 'm' } };
        const big = { value: 'abc', type: 'string', updated_at: '', truncated: true, size: 5000 };
        stream.next({ status: 'live', activities: [], state: debugState({ waits: [wait], variables: { big } }) });
        flushDiagram();
        await until(() => component.elementName('Task_A') === 'Do A');

        component.startTrigger(wait);
        component.triggering!.text = '[1]';
        component.trigger();
        expect(component.triggering?.error).toBe('not a JSON object');
        component.triggering!.text = '{"event": 42}';
        component.trigger();
        const post = http.expectOne(instance() + '/waits/Task_A/trigger');
        expect(post.request.body).toEqual({ local_variables: { event: 42 } });
        post.flush(null, { status: 204, statusText: 'No Content' });
        expect(component.triggering).toBeNull();
        expect(component.actionDone).toBe('Do A triggered.');

        component.editVariable(component.variableRows[0]);
        http.expectOne(instance() + '/variables/big').flush({ name: 'big', value: 'abcdef', type: 'string' });
        expect(component.editing).toEqual({ name: 'big', text: '"abcdef"' });
    });

    it('offers no interventions for an instance on a gateway or a step of the history', () => {
        create();
        const wait = { element_id: 'Task_A', kind: 'timer', since: '', timer: { definition: 'PT1H' } };
        stream.next({ status: 'live', activities: [], state: debugState({ waits: [wait], instance: { ...debugState().instance, network_id: 'n-1' } }) });
        fixture.detectChanges();
        expect(component.canIntervene).toBeFalse();
        expect(fixture.nativeElement.textContent).not.toContain('Fire now');
        flushDiagram();

        component.loadStep({ seq: 3 });
        http.expectOne(instance() + '/history?seq=3').flush(debugState({ seq: 3, waits: [wait] }));
        http.expectOne((r) => r.url === instance() + '/activities').flush({ items: [], truncated: false });
        expect(component.canIntervene).toBeFalse();
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
