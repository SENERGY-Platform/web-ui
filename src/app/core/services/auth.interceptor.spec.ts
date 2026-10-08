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

import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AUTH_CLIENT, AuthClient } from './auth-client';
import { authInterceptor } from './auth.interceptor';

const API = 'https://api.example.org/devices';

describe('authInterceptor', () => {
    let client: jasmine.SpyObj<AuthClient>;
    let http: HttpClient;
    let controller: HttpTestingController;
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(() => {
        client = jasmine.createSpyObj<AuthClient>('client', ['isTokenExpired', 'updateToken', 'getToken']);
        client.isTokenExpired.and.returnValue(false);
        client.getToken.and.resolveTo('tok');
        TestBed.configureTestingModule({
            providers: [
                { provide: AUTH_CLIENT, useValue: client },
                provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
            ],
        });
        http = TestBed.inject(HttpClient);
        controller = TestBed.inject(HttpTestingController);
    });

    afterEach(() => controller.verify());

    it('attaches the current token as Bearer', async () => {
        let body: unknown;
        http.get(API).subscribe((b) => (body = b));
        await settle();

        const req = controller.expectOne(API);
        expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
        req.flush({ ok: true });
        expect(body).toEqual({ ok: true });
        expect(client.updateToken).not.toHaveBeenCalled();
    });

    it('keeps the other headers of the request', async () => {
        http.get(API, { headers: { Accept: 'text/csv' } }).subscribe();
        await settle();

        const req = controller.expectOne(API);
        expect(req.request.headers.get('Accept')).toBe('text/csv');
        expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
        req.flush('');
    });

    it('refreshes an expired token before attaching it', async () => {
        let refreshed = false;
        client.isTokenExpired.and.returnValue(true);
        client.updateToken.and.callFake(
            () =>
                new Promise((resolve) =>
                    setTimeout(() => {
                        refreshed = true;
                        resolve(true);
                    }),
                ),
        );
        client.getToken.and.callFake(() => Promise.resolve(refreshed ? 'fresh' : 'stale'));

        http.get(API).subscribe();
        await settle();
        await settle();

        const req = controller.expectOne(API);
        expect(client.updateToken).toHaveBeenCalledTimes(1);
        expect(req.request.headers.get('Authorization')).toBe('Bearer fresh');
        req.flush('');
    });

    it('leaves requests to the token endpoint alone', () => {
        const url = environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token';

        http.post(url, 'grant_type=refresh_token').subscribe();

        const req = controller.expectOne(url);
        expect(req.request.headers.has('Authorization')).toBeFalse();
        expect(client.isTokenExpired).not.toHaveBeenCalled();
        req.flush({});
    });

    it('decides the token endpoint by the environment at request time', async () => {
        const realm = environment.keyCloakRealm;
        const url = environment.keycloakUrl + '/auth/realms/' + realm + '/protocol/openid-connect/token';
        environment.keyCloakRealm = 'other';
        try {
            http.post(url, '').subscribe();
            await settle();
        } finally {
            environment.keyCloakRealm = realm;
        }

        const req = controller.expectOne(url);
        expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
        req.flush({});
    });

    it('passes backend errors through unchanged', async () => {
        let error: HttpErrorResponse | undefined;
        http.get(API).subscribe({ error: (e) => (error = e) });
        await settle();

        controller.expectOne(API).flush('nope', { status: 503, statusText: 'Service Unavailable' });

        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(error?.status).toBe(503);
        expect(error?.error).toBe('nope');
    });

    it('fails the request without sending it when the refresh fails', async () => {
        const failure = new Error('refresh failed');
        client.isTokenExpired.and.returnValue(true);
        client.updateToken.and.rejectWith(failure);
        let error: unknown;

        http.get(API).subscribe({ error: (e) => (error = e) });
        await settle();

        controller.expectNone(API);
        expect(error).toBe(failure);
    });
});
