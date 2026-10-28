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

import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthorizationService } from '../../services/authorization.service';
import { AuthorizationServiceMock } from '../../services/authorization.service.mock';
import { BEARER_PROTOCOL, DEBUG_WEBSOCKET_FACTORY, DebugStreamUpdate, InstanceDebugStreamService, POLL_INTERVAL_MS } from './debug-stream.service';
import { debugState } from './debug-state.mock';

/** stands in for a browser WebSocket; the spec drives its events */
class FakeSocket {
    sent: string[] = [];
    closed = false;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;

    constructor(
        public url: string,
        public protocols: string[],
    ) {}

    send(data: string): void {
        this.sent.push(data);
    }

    close(): void {
        this.closed = true;
    }

    open(): void {
        this.onopen?.();
    }

    receive(message: object): void {
        this.onmessage?.({ data: JSON.stringify(message) });
    }

    serverClose(code: number, reason = ''): void {
        this.onclose?.({ code, reason });
    }
}

describe('InstanceDebugStreamService', () => {
    let service: InstanceDebugStreamService;
    let http: HttpTestingController;
    let sockets: FakeSocket[];
    let updates: DebugStreamUpdate[];
    let completed: boolean;
    let sub: Subscription;

    const watch = (evaluateEvents = false) => {
        sub = service.watch('processes', 'i-1', evaluateEvents).subscribe({ next: (u) => updates.push(u), complete: () => (completed = true) });
        // the token is read asynchronously before the socket opens
        flushMicrotasks();
    };
    const last = () => updates[updates.length - 1];

    beforeEach(() => {
        sockets = [];
        updates = [];
        completed = false;
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                {
                    provide: DEBUG_WEBSOCKET_FACTORY,
                    useValue: (url: string, protocols: string[]) => {
                        const socket = new FakeSocket(url, protocols);
                        sockets.push(socket);
                        return socket as unknown as WebSocket;
                    },
                },
            ],
        });
        service = TestBed.inject(InstanceDebugStreamService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        sub?.unsubscribe();
        http.verify();
    });

    it('offers the token as subprotocol next to bearer and merges snapshot and deltas', fakeAsync(() => {
        watch(true);
        expect(sockets.length).toBe(1);
        expect(sockets[0].url).toContain('/namespaces/processes/instances/i-1/live?evaluate_events=true');
        expect(sockets[0].url).not.toContain('token');
        expect(sockets[0].protocols.length).toBe(2);
        expect(sockets[0].protocols[0]).toBe(BEARER_PROTOCOL);
        // the bare token: a subprotocol cannot contain the space of "Bearer <token>"
        expect(sockets[0].protocols[1]).toMatch(/^eyJ[\w.-]+$/);
        sockets[0].open();
        // a message after a header token would make the engine close the stream
        expect(sockets[0].sent).toEqual([]);

        sockets[0].receive({ type: 'snapshot', seq: 4, state: debugState() });
        expect(last().status).toBe('live');
        expect(last().state!.seq).toBe(4);

        const activity = { instance_id: 'i-1', run: 1, seq: 5, time: '2026-10-27T10:00:05Z', kind: 'element_left' };
        sockets[0].receive({ type: 'delta', seq: 5, active_changed: true, active: [], activities: [activity] });
        expect(last().state!.seq).toBe(5);
        expect(last().state!.active).toEqual([]);
        expect(last().activities).toEqual([activity]);
    }));

    it('ends with the end state and closes the socket', fakeAsync(() => {
        watch();
        sockets[0].receive({ type: 'snapshot', seq: 4, state: debugState() });
        sockets[0].receive({ type: 'end', seq: 9, state: debugState({ seq: 9, instance: { ...debugState().instance, state: 'completed' } }) });
        expect(last().status).toBe('ended');
        expect(last().state!.instance.state).toBe('completed');
        expect(completed).toBeTrue();
        expect(sockets[0].closed).toBeTrue();
    }));

    it('reconnects at once after an expired token and resumes after the last sequence', fakeAsync(() => {
        watch();
        sockets[0].receive({ type: 'snapshot', seq: 7, state: debugState({ seq: 7 }) });
        sockets[0].serverClose(4401, 'token expired');
        flushMicrotasks();
        expect(sockets.length).toBe(2);
        expect(sockets[1].url).toContain('after=7');
    }));

    it('resumes a broken connection with a growing delay', fakeAsync(() => {
        watch();
        sockets[0].receive({ type: 'snapshot', seq: 7, state: debugState({ seq: 7 }) });
        sockets[0].serverClose(1006);
        expect(last().status).toBe('reconnecting');
        tick(499);
        expect(sockets.length).toBe(1);
        tick(1);
        flushMicrotasks();
        expect(sockets.length).toBe(2);
        sockets[1].serverClose(1006);
        tick(999);
        expect(sockets.length).toBe(2);
        tick(1);
        flushMicrotasks();
        expect(sockets.length).toBe(3);
        expect(sockets[2].url).toContain('after=7');
    }));

    it('reads the state periodically when the first connection brings no message', fakeAsync(() => {
        watch();
        // the engine without KEYCLOAK_CERT_URL does not take the token from the subprotocol
        sockets[0].serverClose(4401, 'send the token in the Authorization header');
        const url = environment.automationEngineUrl + '/namespaces/processes/instances/i-1/debug';
        http.expectOne(url).flush(debugState());
        expect(last().status).toBe('polling');
        expect(last().error).toContain('send the token in the Authorization header');
        expect(last().state!.seq).toBe(4);

        tick(POLL_INTERVAL_MS);
        http.expectOne(url).flush(debugState({ seq: 8, instance: { ...debugState().instance, state: 'completed' } }));
        expect(last().status).toBe('ended');
        expect(last().state!.seq).toBe(8);
        expect(completed).toBeTrue();
        expect(sockets.length).toBe(1);
    }));

    it('ends with the message of the engine when the instance cannot be read', fakeAsync(() => {
        watch();
        sockets[0].receive({ type: 'error', seq: 0, error: 'instance i-1 not found', error_kind: 'not_found' });
        expect(last().status).toBe('ended');
        expect(last().error).toBe('instance i-1 not found');
        expect(completed).toBeTrue();
    }));

    it('closes the socket when the subscriber leaves', fakeAsync(() => {
        watch();
        sockets[0].receive({ type: 'snapshot', seq: 4, state: debugState() });
        sub.unsubscribe();
        expect(sockets[0].closed).toBeTrue();
        // a close event after leaving reconnects nothing
        sockets[0].serverClose(1006);
        tick(60000);
        expect(sockets.length).toBe(1);
    }));
});
