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

import { Injectable, InjectionToken, Inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EngineActivity, EngineDebugMessage, EngineDebugState } from '../../model/automation-engine.model';
import { AuthorizationService } from '../../services/authorization.service';
import { AutomationEngineService, engineErrorMessage } from '../../services/automation-engine.service';
import { applyDebugMessage, instanceIsRunning, liveUrl } from './debug-state';

/** opens a WebSocket with subprotocols; replaced in specs */
export const DEBUG_WEBSOCKET_FACTORY = new InjectionToken<(url: string, protocols: string[]) => WebSocket>('DEBUG_WEBSOCKET_FACTORY', {
    providedIn: 'root',
    factory: () => (url: string, protocols: string[]) => new WebSocket(url, protocols),
});

/** the subprotocol the token is offered next to; the engine answers with it alone */
export const BEARER_PROTOCOL = 'bearer';

/**
 * connecting: no state yet; live: the WebSocket sends; reconnecting: the connection broke and is resumed;
 * polling: the WebSocket could not be opened, the state is read periodically; ended: the instance ended
 * or the stream gave up, the state does not change any more
 */
export type DebugStreamStatus = 'connecting' | 'live' | 'reconnecting' | 'polling' | 'ended';

export interface DebugStreamUpdate {
    state: EngineDebugState | null;
    status: DebugStreamStatus;
    /** entries the last message brought, in sequence order */
    activities: EngineActivity[];
    /** why the stream is polling, reconnecting or ended without the instance ending */
    error?: string;
}

export const POLL_INTERVAL_MS = 5000;
const CLOSE_TOKEN_EXPIRED = 4401;
const MAX_RETRY_MS = 30000;

/**
 * Follows an instance through the live stream of the automation-engine (GET .../live): a snapshot, then
 * deltas merged with applyDebugMessage, then the end state. A browser cannot set the Authorization
 * header on a WebSocket, so the token goes as subprotocol next to "bearer"; Kong copies it into the
 * header for Ladon, and the engine verifies it against Keycloak. An interrupted stream resumes after the
 * last sequence; close code 4401 after the first message means the token expired and reconnects at once
 * with a new one.
 *
 * If the first connection does not bring a single message, the WebSocket is not usable here: Kong
 * refused the upgrade, or the engine runs without KEYCLOAK_CERT_URL and closes with 4401. The stream
 * then reads GET .../debug every POLL_INTERVAL_MS instead.
 */
@Injectable({
    providedIn: 'root',
})
export class InstanceDebugStreamService {
    constructor(
        private automationEngineService: AutomationEngineService,
        private authorizationService: AuthorizationService,
        @Inject(DEBUG_WEBSOCKET_FACTORY) private openSocket: (url: string, protocols: string[]) => WebSocket,
    ) {}

    watch(namespace: string, id: string, evaluateEvents: boolean): Observable<DebugStreamUpdate> {
        return new Observable<DebugStreamUpdate>((subscriber) => {
            let state: EngineDebugState | null = null;
            let socket: WebSocket | null = null;
            let timer: ReturnType<typeof setTimeout> | null = null;
            let poll: Subscription | null = null;
            let everReceived = false;
            let stopped = false;
            let retry = 500;

            const emit = (status: DebugStreamStatus, activities: EngineActivity[] = [], error?: string) =>
                subscriber.next({ state, status, activities, error });

            const closeSocket = () => {
                if (socket) {
                    const ws = socket;
                    socket = null;
                    ws.close();
                }
            };

            const finish = (error?: string) => {
                stopped = true;
                closeSocket();
                emit('ended', [], error);
                subscriber.complete();
            };

            const schedule = (fn: () => void, ms: number) => {
                timer = setTimeout(() => {
                    timer = null;
                    fn();
                }, ms);
            };

            const pollOnce = (reason: string) => {
                poll = this.automationEngineService.getDebugState(namespace, id, evaluateEvents).subscribe({
                    next: (s) => {
                        state = s;
                        if (!instanceIsRunning(s.instance.state)) {
                            finish();
                            return;
                        }
                        emit('polling', [], reason);
                        schedule(() => pollOnce(reason), POLL_INTERVAL_MS);
                    },
                    error: (err) => {
                        if (state === null) {
                            // nothing to show: the instance is not readable at all
                            finish(engineErrorMessage(err));
                            return;
                        }
                        emit('polling', [], engineErrorMessage(err));
                        schedule(() => pollOnce(reason), POLL_INTERVAL_MS);
                    },
                });
            };

            const handle = (message: EngineDebugMessage) => {
                switch (message.type) {
                    case 'snapshot':
                    case 'end':
                        if (message.state) {
                            state = message.state;
                        }
                        if (message.type === 'end') {
                            finish();
                        } else {
                            emit('live');
                        }
                        break;
                    case 'delta':
                        if (state) {
                            state = applyDebugMessage(state, message);
                            emit('live', message.activities || []);
                        }
                        break;
                    case 'error':
                        if (message.error_kind === 'not_found' || message.error_kind === 'forbidden') {
                            finish(message.error);
                        } else {
                            emit('reconnecting', [], message.error);
                        }
                        break;
                }
            };

            const onClose = (code: number, reason: string, received: boolean) => {
                if (stopped) {
                    return;
                }
                if (!everReceived) {
                    pollOnce('live stream not available' + (reason ? ': ' + reason : ' (' + code + ')'));
                    return;
                }
                if (code === CLOSE_TOKEN_EXPIRED && received) {
                    connect();
                    return;
                }
                emit('reconnecting', [], reason || 'connection closed (' + code + ')');
                schedule(connect, retry);
                retry = Math.min(2 * retry, MAX_RETRY_MS);
            };

            const connect = () => {
                this.authorizationService.getToken().then(
                    (token) => {
                        if (stopped) {
                            return;
                        }
                        const url = liveUrl(environment.automationEngineUrl, namespace, id, state?.seq || 0, evaluateEvents, window.location.href);
                        let ws: WebSocket;
                        try {
                            ws = this.openSocket(url, [BEARER_PROTOCOL, token.replace(/^bearer\s+/i, '')]);
                        } catch (e) {
                            onClose(0, String(e), false);
                            return;
                        }
                        socket = ws;
                        let received = false;
                        ws.onmessage = (event: MessageEvent) => {
                            if (socket !== ws || stopped) {
                                return;
                            }
                            let message: EngineDebugMessage;
                            try {
                                message = JSON.parse(event.data);
                            } catch {
                                return;
                            }
                            received = everReceived = true;
                            retry = 500;
                            handle(message);
                        };
                        ws.onclose = (event: CloseEvent) => {
                            if (socket !== ws) {
                                return;
                            }
                            socket = null;
                            onClose(event.code, event.reason, received);
                        };
                    },
                    (err) => onClose(0, String(err), false),
                );
            };

            emit('connecting');
            connect();

            return () => {
                stopped = true;
                if (timer !== null) {
                    clearTimeout(timer);
                }
                poll?.unsubscribe();
                closeSocket();
            };
        });
    }
}
