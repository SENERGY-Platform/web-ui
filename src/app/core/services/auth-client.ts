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

import { HttpRequest } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { KeycloakLoginOptions, KeycloakProfile, KeycloakServerConfig, KeycloakTokenParsed } from 'keycloak-js';
import { environment } from '../../../environments/environment';

/** The Keycloak login as the app uses it; implemented by the public (keycloak-js) and the confidential client. */
export interface AuthClient {
    init(): Promise<boolean>;
    isTokenExpired(): boolean;
    updateToken(): Promise<boolean>;
    getToken(): Promise<string | undefined>;
    loadUserProfile(): Promise<KeycloakProfile>;
    getUsername(): string | undefined;
    getKeycloakInstance(): { subject?: string; tokenParsed?: KeycloakTokenParsed };
    isUserInRole(role: string): boolean;
    getUserRoles(): string[];
    login(options: KeycloakLoginOptions): Promise<void>;
    logout(): Promise<void>;
}

/** Lives in its own file so services injecting it do not import the providers that build it (import cycle in the test bundle). */
export const AUTH_CLIENT = new InjectionToken<AuthClient>('AuthClient');

export function keycloakConfig(): KeycloakServerConfig {
    return {
        url: environment.keycloakUrl + '/auth',
        realm: environment.keyCloakRealm,
        clientId: environment.keyCloakClientId,
    };
}

/** Read per request, so a Keycloak URL or realm changed by the loaded config applies from then on. */
export function shouldAddToken(request: HttpRequest<unknown>): boolean {
    return !request.url.startsWith(environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token');
}
