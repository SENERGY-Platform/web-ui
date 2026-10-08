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
import Keycloak from 'keycloak-js';
import { AUTH_CLIENT } from './auth-client';
import { authInterceptor } from './auth.interceptor';
import { KeycloakPublicClient } from './keycloak-public-client';

describe('KeycloakPublicClient', () => {
    let keycloak: jasmine.SpyObj<Keycloak>;
    let client: KeycloakPublicClient;

    beforeEach(() => {
        keycloak = jasmine.createSpyObj<Keycloak>('Keycloak', ['init', 'isTokenExpired', 'updateToken', 'loadUserProfile', 'logout', 'login']);
        TestBed.configureTestingModule({ providers: [{ provide: Keycloak, useValue: keycloak }] });
        client = TestBed.inject(KeycloakPublicClient);
    });

    it('starts keycloak-js with a forced login, without the session iframe and with its own PKCE default', async () => {
        keycloak.init.and.resolveTo(true);

        expect(await client.init()).toBeTrue();
        expect(keycloak.init).toHaveBeenCalledOnceWith({ onLoad: 'login-required', checkLoginIframe: false });
    });

    it('passes a failed start on', async () => {
        keycloak.init.and.rejectWith(new Error('down'));

        await expectAsync(client.init()).toBeRejectedWithError('down');
    });

    it('treats the token as expired only once it is', () => {
        keycloak.isTokenExpired.and.returnValue(false);

        expect(client.isTokenExpired()).toBeFalse();
        expect(keycloak.isTokenExpired).toHaveBeenCalledOnceWith(0);
    });

    it('renews a token that is valid for less than 20 seconds', async () => {
        keycloak.updateToken.and.resolveTo(true);

        expect(await client.updateToken()).toBeTrue();
        expect(keycloak.updateToken).toHaveBeenCalledOnceWith(20);
    });

    it('reports a failed renewal as false instead of failing', async () => {
        keycloak.updateToken.and.rejectWith(new Error('refresh failed'));

        expect(await client.updateToken()).toBeFalse();
    });

    it('hands out the raw token', async () => {
        (keycloak as { token?: string }).token = 'tok';

        expect(await client.getToken()).toBe('tok');
    });

    it('loads the profile once and keeps it', async () => {
        (keycloak as { authenticated: boolean }).authenticated = true;
        keycloak.loadUserProfile.and.resolveTo({ username: 'alice' });

        expect(await client.loadUserProfile()).toEqual({ username: 'alice' });
        expect(await client.loadUserProfile()).toEqual({ username: 'alice' });
        expect(keycloak.loadUserProfile).toHaveBeenCalledTimes(1);
        expect(client.getUsername()).toBe('alice');
    });

    it('refuses the profile without a login', async () => {
        (keycloak as { authenticated: boolean }).authenticated = false;

        await expectAsync(client.loadUserProfile()).toBeRejectedWithError('The user profile was not loaded as the user is not logged in.');
        expect(keycloak.loadUserProfile).not.toHaveBeenCalled();
    });

    it('forgets the profile on logout', async () => {
        (keycloak as { authenticated: boolean }).authenticated = true;
        keycloak.loadUserProfile.and.resolveTo({ username: 'alice' });
        keycloak.logout.and.resolveTo();
        await client.loadUserProfile();

        await client.logout();

        expect(keycloak.logout).toHaveBeenCalledTimes(1);
        expect(() => client.getUsername()).toThrowError('User not logged in or user profile was not loaded.');
    });

    it('starts a login with the given options', async () => {
        keycloak.login.and.resolveTo();

        await client.login({ action: 'UPDATE_PASSWORD', redirectUri: 'https://ui.example.org/' });

        expect(keycloak.login).toHaveBeenCalledOnceWith({ action: 'UPDATE_PASSWORD', redirectUri: 'https://ui.example.org/' });
    });

    it('lists no roles without a token', () => {
        expect(client.getUserRoles()).toEqual([]);
    });

    it('sends the request with the token at hand when the renewal fails', async () => {
        TestBed.resetTestingModule();
        keycloak.isTokenExpired.and.returnValue(true);
        keycloak.updateToken.and.rejectWith(new Error('refresh failed'));
        (keycloak as { token?: string }).token = 'old';
        TestBed.configureTestingModule({
            providers: [
                { provide: Keycloak, useValue: keycloak },
                { provide: AUTH_CLIENT, useExisting: KeycloakPublicClient },
                provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
            ],
        });
        const controller = TestBed.inject(HttpTestingController);

        TestBed.inject(HttpClient).get('https://api.example.org/devices').subscribe();
        await new Promise((resolve) => setTimeout(resolve));

        const req = controller.expectOne('https://api.example.org/devices');
        expect(req.request.headers.get('Authorization')).toBe('Bearer old');
        req.flush('');
        controller.verify();
    });
});
