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

import { HttpClient, HttpEvent, HttpHandler, HttpRequest, HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { KeycloakAngularModule, KeycloakOptions, KeycloakService } from 'keycloak-angular';
import Keycloak, { KeycloakLoginOptions } from 'keycloak-js';
import { lastValueFrom, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthorizationService } from './authorization.service';
import { ErrorHandlerService } from './error-handler.service';
import { initializerService } from './initializer.service';
import { LadonService } from '../../modules/admin/permissions/shared/services/ladom.service';

describe('AuthorizationService', () => {
    // A hand-built auth link comes back with ?code=&iss=, which keycloak-js ignores and Keycloak then refuses as redirect_uri.
    it('should start the password change through keycloak-js with the given redirect', async () => {
        const logins: (KeycloakLoginOptions | undefined)[] = [];
        const keycloakService = Object.create(KeycloakService.prototype) as KeycloakService;
        keycloakService.login = (options?: KeycloakLoginOptions) => {
            logins.push(options);
            return Promise.resolve();
        };
        const service = new AuthorizationService([keycloakService], {} as ErrorHandlerService, {} as HttpClient);

        await service.changePassword('https://ui.example.org/settings');

        expect(logins).toEqual([{ action: 'UPDATE_PASSWORD', redirectUri: 'https://ui.example.org/settings' }]);
    });

    describe('as HTTP interceptor', () => {
        let initOptions: KeycloakOptions;
        let instance: { token: string; expired: boolean; updates: (number | undefined)[] };
        let service: AuthorizationService;
        let sent: HttpRequest<unknown>[];
        const next: HttpHandler = {
            handle: (req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> => {
                sent.push(req);
                return of(new HttpResponse({ status: 200 }));
            },
        };

        beforeAll(async () => {
            const captured: KeycloakOptions[] = [];
            const authorization = {
                init: (o: KeycloakOptions) => {
                    captured.push(o);
                    return Promise.reject(new Error('stop'));
                },
            };
            spyOn(console, 'log');
            await initializerService(authorization as unknown as AuthorizationService, {} as LadonService)();
            initOptions = captured[0];
        });

        beforeEach(() => {
            sent = [];
            instance = { token: 'tok', expired: false, updates: [] };
            const fake = {
                get token() {
                    return instance.token;
                },
                isTokenExpired: () => instance.expired,
                updateToken: (minValidity?: number) => {
                    instance.updates.push(minValidity);
                    instance.token = 'fresh';
                    instance.expired = false;
                    return Promise.resolve(true);
                },
            } as unknown as Keycloak;
            // The real legacy KeycloakService, set up with the app's init options but without keycloak-js contacting a server.
            const keycloak = new KeycloakService();
            (keycloak as unknown as { initServiceValues(o: KeycloakOptions): void }).initServiceValues(initOptions);
            (keycloak as unknown as { _instance: Keycloak })._instance = fake;
            service = new AuthorizationService([keycloak], {} as ErrorHandlerService, {} as HttpClient);
        });

        it('starts keycloak-js with a forced login and without the session iframe', () => {
            expect(initOptions.initOptions).toEqual({ onLoad: 'login-required', checkLoginIframe: false });
            expect(initOptions.config).toEqual({
                url: environment.keycloakUrl + '/auth',
                realm: environment.keyCloakRealm,
                clientId: environment.keyCloakClientId,
            });
        });

        it('attaches the current token as Bearer', async () => {
            await lastValueFrom(service.intercept(new HttpRequest('GET', 'https://api.example.org/devices'), next));

            expect(sent.length).toBe(1);
            expect(sent[0].headers.get('Authorization')).toBe('Bearer tok');
            expect(instance.updates).toEqual([]);
        });

        it('refreshes an expired token before attaching it', async () => {
            instance.expired = true;

            await lastValueFrom(service.intercept(new HttpRequest('GET', 'https://api.example.org/devices'), next));

            expect(instance.updates).toEqual([20]);
            expect(sent[0].headers.get('Authorization')).toBe('Bearer fresh');
        });

        it('leaves requests to the token endpoint alone', async () => {
            const url = environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token';

            await lastValueFrom(service.intercept(new HttpRequest('POST', url, 'grant_type=refresh_token'), next));

            expect(sent[0].headers.has('Authorization')).toBeFalse();
        });
    });

    // AppModule imports KeycloakAngularModule, whose own interceptor sees a KeycloakService nobody initialises.
    it('lets the uninitialised KeycloakAngularModule interceptor pass requests unchanged', () => {
        TestBed.configureTestingModule({
            imports: [KeycloakAngularModule],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        const http = TestBed.inject(HttpClient);
        const controller = TestBed.inject(HttpTestingController);
        let body: unknown;

        http.get('https://api.example.org/devices').subscribe((b) => (body = b));
        const req = controller.expectOne('https://api.example.org/devices');
        req.flush({ ok: true });

        expect(req.request.headers.has('Authorization')).toBeFalse();
        expect(body).toEqual({ ok: true });
        controller.verify();
    });
});
