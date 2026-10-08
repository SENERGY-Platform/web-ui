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

import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import Keycloak, { KeycloakLoginOptions } from 'keycloak-js';
import { environment } from '../../../environments/environment';
import { AUTH_CLIENT, AuthClient, keycloakConfig } from './auth-client';
import { authInterceptor } from './auth.interceptor';
import { AuthorizationService } from './authorization.service';
import { ErrorHandlerService } from './error-handler.service';
import { KeycloakConfidentialService } from './keycloak-confidential.service';
import { KeycloakPublicClient } from './keycloak-public-client';
import { provideAuth } from './provide-auth';

const STORAGE_PREFIX = 'KeycloakConfidentialService_';

function clearAuthStorage(): void {
    localStorage.removeItem('sub');
    Object.keys(sessionStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
}

/** An unsigned JWT; the confidential client only base64-decodes the segments. */
function jwt(claims: object): string {
    return btoa(JSON.stringify({ alg: 'none' })) + '.' + btoa(JSON.stringify(claims)) + '.';
}

function buildService(client: AuthClient): AuthorizationService {
    TestBed.configureTestingModule({
        providers: [
            { provide: AUTH_CLIENT, useValue: client },
            { provide: ErrorHandlerService, useValue: {} },
            { provide: HttpClient, useValue: {} },
        ],
    });
    return TestBed.inject(AuthorizationService);
}

/** keycloak-js after a login with roles and a profile, without a server behind it. */
function loggedInKeycloak(): Keycloak {
    const keycloak = {
        authenticated: true,
        subject: 'user-1',
        token: 'tok',
        tokenParsed: { groups: ['/g1'] },
        resourceAccess: { frontend: { roles: ['developer'] }, other: { roles: ['viewer'] } },
        realmAccess: { roles: ['admin', 'user'] },
        loadUserProfile: () => Promise.resolve({ username: 'alice', email: 'a@example.org', firstName: 'A', lastName: 'L' }),
        login: jasmine.createSpy('login').and.resolveTo(),
        logout: jasmine.createSpy('logout').and.resolveTo(),
    } as unknown as Keycloak;
    // Same lookups as keycloak-js: the client's own resource roles unless another resource is named.
    keycloak.hasResourceRole = (role: string, resource?: string) => !!keycloak.resourceAccess?.[resource || 'frontend']?.roles.includes(role);
    keycloak.hasRealmRole = (role: string) => !!keycloak.realmAccess?.roles.includes(role);
    return keycloak;
}

describe('AuthorizationService', () => {
    afterEach(() => clearAuthStorage());

    // A hand-built auth link comes back with ?code=&iss=, which keycloak-js ignores and Keycloak then refuses as redirect_uri.
    it('should start the password change through keycloak-js with the given redirect', async () => {
        const logins: KeycloakLoginOptions[] = [];
        const client = {
            login: (options: KeycloakLoginOptions) => {
                logins.push(options);
                return Promise.resolve();
            },
        } as unknown as AuthClient;
        const service = buildService(client);

        await service.changePassword('https://ui.example.org/settings');

        expect(logins).toEqual([{ action: 'UPDATE_PASSWORD', redirectUri: 'https://ui.example.org/settings' }]);
    });

    it('loads the user profile after a successful login only', async () => {
        const client = jasmine.createSpyObj<AuthClient>('client', ['init', 'loadUserProfile']);
        client.loadUserProfile.and.resolveTo({});
        const service = buildService(client);

        client.init.and.resolveTo(false);
        expect(await service.init()).toBeFalse();
        expect(client.loadUserProfile).not.toHaveBeenCalled();

        client.init.and.resolveTo(true);
        expect(await service.init()).toBeTrue();
        expect(client.loadUserProfile).toHaveBeenCalledTimes(1);
    });

    describe('over the public client', () => {
        let keycloak: Keycloak;
        let service: AuthorizationService;

        beforeEach(() => {
            keycloak = loggedInKeycloak();
            TestBed.configureTestingModule({
                providers: [
                    { provide: Keycloak, useValue: keycloak },
                    { provide: AUTH_CLIENT, useExisting: KeycloakPublicClient },
                    { provide: ErrorHandlerService, useValue: {} },
                    { provide: HttpClient, useValue: {} },
                ],
            });
            service = TestBed.inject(AuthorizationService);
        });

        it('takes the user id from the stored sub first, then from the token', () => {
            expect(service.getUserId()).toBe('user-1');
            localStorage.setItem('sub', 'stored');
            expect(service.getUserId()).toBe('stored');
        });

        it('reports a missing subject as an Error value', () => {
            (keycloak as { subject?: string }).subject = undefined;
            expect(service.getUserId()).toEqual(Error('Could not load sub'));
        });

        it('knows the user name only once the profile is loaded', async () => {
            expect(() => service.getUserName()).toThrowError('User not logged in or user profile was not loaded.');
            await service.getProfile();
            expect(service.getUserName()).toBe('alice');
        });

        it('maps the profile with empty strings for missing fields', async () => {
            keycloak.loadUserProfile = () => Promise.resolve({ username: 'bob' });
            expect(await service.getProfile()).toEqual({ email: '', firstName: '', lastName: '', username: 'bob' });
        });

        it('reads groups from the token and falls back to none without a parsed token', () => {
            expect(service.getUsersGroups()).toEqual(['/g1']);
            (keycloak as { tokenParsed?: object }).tokenParsed = undefined;
            expect(service.getUsersGroups()).toEqual([]);
        });

        it('checks roles of the own client first, then of the realm', () => {
            expect(service.userIsDeveloper()).toBeTrue();
            expect(service.userIsAdmin()).toBeTrue();
            keycloak.realmAccess = { roles: [] };
            expect(service.userIsAdmin()).toBeFalse();
        });

        it('lists the roles of every client, then the realm roles', () => {
            expect(service.getUserRoles()).toEqual(['developer', 'viewer', 'admin', 'user']);
        });

        it('prefixes the token with Bearer', async () => {
            expect(await service.getToken()).toBe('Bearer tok');
        });

        it('clears both storages and logs out through keycloak-js', () => {
            localStorage.setItem('sub', 'stored');
            sessionStorage.setItem(STORAGE_PREFIX + 'probe', 'x');

            service.logout();

            expect(localStorage.getItem('sub')).toBeNull();
            expect(sessionStorage.getItem(STORAGE_PREFIX + 'probe')).toBeNull();
            expect(keycloak.logout).toHaveBeenCalledTimes(1);
        });
    });

    describe('over the confidential client', () => {
        let service: AuthorizationService;

        beforeEach(() => {
            const claims = {
                sub: 'user-2',
                preferred_username: 'carol',
                groups: ['/g2'],
                realm_access: { roles: ['developer'] },
            };
            sessionStorage.setItem(STORAGE_PREFIX + 'tokenResponse', JSON.stringify({ access_token: jwt(claims) }));
            sessionStorage.setItem(STORAGE_PREFIX + 'userinfo', JSON.stringify({ id: 'user-2', username: 'carol' }));
            localStorage.setItem('sub', 'user-2');
            TestBed.configureTestingModule({
                providers: [
                    { provide: AUTH_CLIENT, useExisting: KeycloakConfidentialService },
                    { provide: ErrorHandlerService, useValue: {} },
                    { provide: HttpClient, useValue: {} },
                ],
            });
            service = TestBed.inject(AuthorizationService);
        });

        it('reads user, groups and roles from the stored token', async () => {
            expect(service.getUserId()).toBe('user-2');
            expect(service.getUserName()).toBe('carol');
            expect(service.getUsersGroups()).toEqual(['/g2']);
            expect(service.userIsDeveloper()).toBeTrue();
            expect(service.userIsAdmin()).toBeFalse();
            expect(service.getUserRoles()).toEqual(['developer']);
            expect(await service.getToken()).toMatch(/^Bearer .+\..+\.$/);
            expect((await service.getProfile()).username).toBe('carol');
        });

        it('refuses the browser password form', async () => {
            await expectAsync(service.changePassword('https://ui.example.org/settings')).toBeRejected();
        });
    });

    describe('variant selection', () => {
        let confidential: string;

        beforeEach(() => (confidential = environment.keyCloakConfidential));
        afterEach(() => (environment.keyCloakConfidential = confidential));

        function clientFor(flag: string): AuthClient {
            environment.keyCloakConfidential = flag;
            TestBed.configureTestingModule({ providers: [provideAuth(), provideHttpClient(withXhr()), provideHttpClientTesting()] });
            return TestBed.inject(AUTH_CLIENT);
        }

        it('uses keycloak-js from provideKeycloak unless the confidential client is configured', () => {
            const client = clientFor('false');

            expect(client).toBeInstanceOf(KeycloakPublicClient);
            expect(TestBed.inject(Keycloak)).toBeInstanceOf(Keycloak);
            expect(client.getKeycloakInstance()).toBe(TestBed.inject(Keycloak));
        });

        it('uses the confidential client for keyCloakConfidential "true"', () => {
            expect(clientFor('true')).toBeInstanceOf(KeycloakConfidentialService);
        });

        it('builds the keycloak-js config from the environment', () => {
            expect(keycloakConfig()).toEqual({
                url: environment.keycloakUrl + '/auth',
                realm: environment.keyCloakRealm,
                clientId: environment.keyCloakClientId,
            });
        });
    });

    describe('confidential login through the interceptor', () => {
        let http: HttpTestingController;
        const tokenUrl = () => environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token';
        const settle = () => new Promise((resolve) => setTimeout(resolve));

        beforeEach(() => {
            TestBed.configureTestingModule({
                providers: [
                    { provide: AUTH_CLIENT, useExisting: KeycloakConfidentialService },
                    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
                    provideHttpClientTesting(),
                ],
            });
            http = TestBed.inject(HttpTestingController);
        });

        it('sends the token requests bare and the user lookup with the service account token', async () => {
            spyOn(window, 'prompt').and.returnValues('secret', 'alice');
            const done = TestBed.inject(KeycloakConfidentialService).init();

            const serviceAccount = http.expectOne(tokenUrl());
            expect(serviceAccount.request.headers.has('Authorization')).toBeFalse();
            expect(serviceAccount.request.body).toContain('grant_type=client_credentials');
            serviceAccount.flush({ access_token: 'sa-token', expires_in: 300 });
            await settle();

            const lookup = http.expectOne((r) => r.url.includes('/admin/realms/'));
            expect(lookup.request.url).toBe(
                environment.keycloakUrl + '/auth/admin/realms/' + environment.keyCloakRealm + '/users?exact=true&username=alice',
            );
            expect(lookup.request.headers.get('Authorization')).toBe('Bearer sa-token');
            lookup.flush([{ id: 'user-3', username: 'alice' }]);
            await settle();

            const exchange = http.expectOne(tokenUrl());
            expect(exchange.request.headers.has('Authorization')).toBeFalse();
            expect(exchange.request.body).toContain('requested_subject=user-3');
            exchange.flush({ access_token: 'user-token', refresh_token: 'r1', expires_in: 300, refresh_expires_in: 1800 });

            expect(await done).toBeTrue();
            expect(localStorage.getItem('sub')).toBe('user-3');
            http.verify();
        });

        it('refreshes an expired user token before the request and attaches the new one', async () => {
            sessionStorage.setItem(STORAGE_PREFIX + 'clientSecret', 'secret');
            sessionStorage.setItem(STORAGE_PREFIX + 'isUserToken', 'true');
            sessionStorage.setItem(STORAGE_PREFIX + 'tokenResponse', JSON.stringify({ access_token: 'old', refresh_token: 'r1' }));
            sessionStorage.setItem(STORAGE_PREFIX + 'tokenExpires', String(Date.now() + 60000));
            await TestBed.inject(KeycloakConfidentialService).init();
            sessionStorage.setItem(STORAGE_PREFIX + 'tokenExpires', String(Date.now() - 1));
            let body: unknown;

            TestBed.inject(HttpClient).get('https://api.example.org/devices').subscribe((b) => (body = b));
            await settle();
            const refresh = http.expectOne(tokenUrl());
            expect(refresh.request.body).toContain('grant_type=refresh_token');
            expect(refresh.request.body).toContain('refresh_token=r1');
            expect(refresh.request.headers.has('Authorization')).toBeFalse();
            http.expectNone('https://api.example.org/devices');
            refresh.flush({ access_token: 'new', refresh_token: 'r2', expires_in: 300, refresh_expires_in: 1800 });
            await settle();

            const api = http.expectOne('https://api.example.org/devices');
            expect(api.request.headers.get('Authorization')).toBe('Bearer new');
            api.flush({ ok: true });
            expect(body).toEqual({ ok: true });
            http.verify();
        });
    });
});
