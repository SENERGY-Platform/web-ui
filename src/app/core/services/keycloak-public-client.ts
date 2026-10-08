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

import { Injectable, inject } from '@angular/core';
import Keycloak, { KeycloakLoginOptions, KeycloakProfile } from 'keycloak-js';
import { AuthClient } from './auth-client';

/** Seconds a token must still be valid for, below which the interceptor's refresh renews it. */
const UPDATE_MIN_VALIDITY = 20;

/** The browser login through keycloak-js, with the profile cache and refresh semantics of the former keycloak-angular service. */
@Injectable({
    providedIn: 'root',
})
export class KeycloakPublicClient implements AuthClient {
    private keycloak = inject(Keycloak);
    private profile?: KeycloakProfile;

    init(): Promise<boolean> {
        return this.keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });
    }

    isTokenExpired(): boolean {
        return this.keycloak.isTokenExpired(0);
    }

    /** A failed refresh resolves to false, so the request still goes out with the token at hand. */
    async updateToken(): Promise<boolean> {
        try {
            return await this.keycloak.updateToken(UPDATE_MIN_VALIDITY);
        } catch {
            return false;
        }
    }

    async getToken(): Promise<string | undefined> {
        return this.keycloak.token;
    }

    async loadUserProfile(): Promise<KeycloakProfile> {
        if (this.profile) {
            return this.profile;
        }
        if (!this.keycloak.authenticated) {
            throw new Error('The user profile was not loaded as the user is not logged in.');
        }
        return (this.profile = await this.keycloak.loadUserProfile());
    }

    getUsername(): string | undefined {
        if (!this.profile) {
            throw new Error('User not logged in or user profile was not loaded.');
        }
        return this.profile.username;
    }

    getKeycloakInstance(): Keycloak {
        return this.keycloak;
    }

    isUserInRole(role: string): boolean {
        return this.keycloak.hasResourceRole(role) || this.keycloak.hasRealmRole(role);
    }

    /** Roles of every client in the token, then the realm roles. */
    getUserRoles(): string[] {
        const roles: string[] = [];
        const resourceAccess = this.keycloak.resourceAccess || {};
        Object.keys(resourceAccess).forEach((client) => roles.push(...(resourceAccess[client]['roles'] || [])));
        roles.push(...(this.keycloak.realmAccess?.['roles'] || []));
        return roles;
    }

    async login(options: KeycloakLoginOptions): Promise<void> {
        await this.keycloak.login(options);
    }

    async logout(): Promise<void> {
        await this.keycloak.logout();
        this.profile = undefined;
    }
}
