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

import { LadonService } from '../../modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../environments/environment';
import { AuthorizationService } from './authorization.service';
import { initializerService } from './initializer.service';

describe('initializerService', () => {
    let calls: string[];
    let errorBox: HTMLElement;
    let ladon: LadonService;

    function authorization(init: () => Promise<boolean>): AuthorizationService {
        return {
            init: () => {
                calls.push('init');
                return init();
            },
            getToken: () => {
                calls.push('getToken');
                return Promise.resolve('Bearer tok');
            },
        } as unknown as AuthorizationService;
    }

    beforeEach(() => {
        calls = [];
        errorBox = document.createElement('div');
        errorBox.id = 'error';
        document.body.appendChild(errorBox);
        ladon = {
            checkAllServiceEndpointAuthorizations: (url: string) => {
                calls.push('ladon ' + url);
                return Promise.resolve();
            },
        } as unknown as LadonService;
        spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
            const request = input as Request;
            calls.push('fetch ' + request.url + ' ' + request.headers.get('Authorization'));
            return Promise.resolve(new Response('[]'));
        });
        spyOn(console, 'log');
    });

    afterEach(() => errorBox.remove());

    it('logs in, then loads the config with the token, then checks Ladon', async () => {
        await initializerService(authorization(() => Promise.resolve(true)), ladon)();

        const expected = ['init', 'getToken', 'fetch ' + new Request(environment.configUrl).url + ' Bearer tok'];
        if (!environment.production) {
            expected.push('getToken', 'fetch ' + new Request('/assets/env.json').url + ' Bearer tok');
        }
        expected.push('ladon ' + environment.ladonUrl);
        expect(calls).toEqual(expected);
        expect(errorBox.classList).not.toContain('show');
    });

    it('shows the error box and loads nothing when the login fails', async () => {
        await initializerService(authorization(() => Promise.reject(new Error('down'))), ladon)();

        expect(calls).toEqual(['init']);
        expect(errorBox.classList).toContain('show');
    });
});
