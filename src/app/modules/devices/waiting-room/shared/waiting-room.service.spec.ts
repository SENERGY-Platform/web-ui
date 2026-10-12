/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../../../environments/environment';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';
import { WaitingRoomService } from './waiting-room.service';
import { WaitingRoomEvent, WaitingRoomEventTypeSet } from './waiting-room.model';

class TestableWaitingRoomService extends WaitingRoomService {
    sockets: Subject<WaitingRoomEvent>[] = [];

    protected override openSocket(): WebSocketSubject<WaitingRoomEvent> {
        const incoming = new Subject<WaitingRoomEvent>();
        this.sockets.push(incoming);
        // Outgoing messages (auth) are dropped so they do not loop back as incoming events.
        const fake = {
            subscribe: incoming.subscribe.bind(incoming),
            next: () => undefined,
            complete: () => incoming.complete(),
        };
        return fake as unknown as WebSocketSubject<WaitingRoomEvent>;
    }

    openCount(): number {
        return this.sockets.filter((s) => !s.closed && !s.isStopped).length;
    }
}

describe('WaitingRoomService events', () => {
    let service: TestableWaitingRoomService;
    const originalUrl = environment.waitingRoomWsUrl;

    beforeEach(() => {
        environment.waitingRoomWsUrl = 'ws://test';
        TestBed.configureTestingModule({
            providers: [
                TestableWaitingRoomService,
                { provide: HttpClient, useValue: {} },
                { provide: ErrorHandlerService, useValue: {} },
                { provide: AuthorizationService, useValue: { getToken: () => Promise.resolve('token') } },
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
            ],
        });
        service = TestBed.inject(TestableWaitingRoomService);
        spyOn(console, 'error');
    });

    afterEach(() => {
        environment.waitingRoomWsUrl = originalUrl;
    });

    it('shares one socket between consumers and closes it with the last one', () => {
        const a = service.events().subscribe();
        const b = service.events().subscribe();
        expect(service.openCount()).toBe(1);
        a.unsubscribe();
        expect(service.openCount()).toBe(1);
        b.unsubscribe();
        expect(service.openCount()).toBe(0);
    });

    it('opens a new socket for a consumer that arrives after the last one left', () => {
        service.events().subscribe().unsubscribe();
        const again = service.events().subscribe();
        expect(service.openCount()).toBe(1);
        again.unsubscribe();
        expect(service.openCount()).toBe(0);
    });

    it('reconnects after a drop while consumed, with one socket at a time', fakeAsync(() => {
        const sub = service.events().subscribe();
        service.sockets[0].error('drop');
        expect(service.openCount()).toBe(0);
        tick(5000);
        expect(service.sockets.length).toBe(2);
        expect(service.openCount()).toBe(1);
        service.sockets[1].complete();
        tick(5000);
        expect(service.sockets.length).toBe(3);
        expect(service.openCount()).toBe(1);
        sub.unsubscribe();
        expect(service.openCount()).toBe(0);
    }));

    it('does not reconnect when the last consumer leaves during the reconnect delay', fakeAsync(() => {
        const sub = service.events().subscribe();
        service.sockets[0].error('drop');
        sub.unsubscribe();
        tick(5000);
        expect(service.sockets.length).toBe(1);
        expect(service.openCount()).toBe(0);
    }));

    it('forwards events to every consumer', () => {
        const got: string[][] = [[], []];
        const subs = [0, 1].map((i) => service.events().subscribe((m) => got[i].push(m.type)));
        service.sockets[0].next({ type: WaitingRoomEventTypeSet, payload: {} } as WaitingRoomEvent);
        expect(got).toEqual([[WaitingRoomEventTypeSet], [WaitingRoomEventTypeSet]]);
        subs.forEach((s) => s.unsubscribe());
    });
});
