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

import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { KeycloakConfidentialService } from './keycloak-confidential.service';

const STORAGE_PREFIX = 'KeycloakConfidentialService_';

describe('KeycloakConfidentialService', () => {
    let http: HttpTestingController;
    let service: KeycloakConfidentialService;
    const tokenUrl = () => environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token';
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    function storeUserToken(accessExpiresIn: number, refreshToken = 'r1'): void {
        sessionStorage.setItem(STORAGE_PREFIX + 'clientSecret', 'secret');
        sessionStorage.setItem(STORAGE_PREFIX + 'isUserToken', 'true');
        sessionStorage.setItem(STORAGE_PREFIX + 'tokenResponse', JSON.stringify({ access_token: 'old', refresh_token: refreshToken }));
        sessionStorage.setItem(STORAGE_PREFIX + 'tokenExpires', String(Date.now() + accessExpiresIn));
        sessionStorage.setItem(STORAGE_PREFIX + 'refreshTokenExpires', String(Date.now() + 1800000));
    }

    const refreshed = { access_token: 'new', refresh_token: 'r2', expires_in: 300, refresh_expires_in: 1800 };

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(KeycloakConfidentialService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem('sub');
        Object.keys(sessionStorage)
            .filter((k) => k.startsWith(STORAGE_PREFIX))
            .forEach((k) => sessionStorage.removeItem(k));
    });

    it('renews a stored token that expired a moment ago before init resolves', async () => {
        storeUserToken(-5000);
        let resolved = false;
        const done = service.init().then((v) => (resolved = v));
        await settle();

        expect(resolved).toBeFalse();
        http.expectOne(tokenUrl()).flush(refreshed);
        await done;

        expect(resolved).toBeTrue();
        expect(await service.getToken()).toBe('new');
        http.verify();
    });

    it('keeps a stored token that is still valid without a request', async () => {
        storeUserToken(60000);

        expect(await service.init()).toBeTrue();
        http.verify();
    });

    it('sends one refresh for concurrent callers', async () => {
        storeUserToken(60000);
        await service.init();

        const first = service.updateToken();
        const second = service.updateToken();
        const refresh = http.expectOne(tokenUrl());
        refresh.flush(refreshed);

        expect(await first).toBeTrue();
        expect(await second).toBeTrue();
        http.verify();
    });

    it('starts a fresh refresh with the current refresh token after a failed one', async () => {
        storeUserToken(60000);
        await service.init();

        const failed = service.updateToken();
        http.expectOne(tokenUrl()).flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Bad Request' });
        await expectAsync(failed).toBeRejected();

        sessionStorage.setItem(STORAGE_PREFIX + 'tokenResponse', JSON.stringify({ access_token: 'old', refresh_token: 'r9' }));
        const retry = service.updateToken();
        const request = http.expectOne(tokenUrl());
        expect(request.request.body).toContain('refresh_token=r9');
        request.flush(refreshed);

        expect(await retry).toBeTrue();
        http.verify();
    });
});
