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

/* Preview harness - local only. */
import { KeycloakProfile, KeycloakTokenParsed } from 'keycloak-js';
import { AuthClient } from '../app/core/services/auth-client';

/** A logged-in admin without a Keycloak server. */
export class PreviewAuthClient implements AuthClient {
    init(): Promise<boolean> {
        return Promise.resolve(true);
    }

    getKeycloakInstance(): { subject?: string; tokenParsed?: KeycloakTokenParsed } {
        return { subject: 'preview-user', tokenParsed: { groups: [] } };
    }

    getUsername(): string {
        return 'preview';
    }

    getToken(): Promise<string> {
        return Promise.resolve('preview-token');
    }

    loadUserProfile(): Promise<KeycloakProfile> {
        return Promise.resolve({ username: 'preview', firstName: 'Preview', lastName: 'User', email: 'preview@example.org' });
    }

    isUserInRole(_role: string): boolean {
        return true;
    }

    getUserRoles(): string[] {
        return ['admin', 'developer', 'user'];
    }

    isTokenExpired(): boolean {
        return false;
    }

    updateToken(): Promise<boolean> {
        return Promise.resolve(true);
    }

    login(): Promise<void> {
        return Promise.resolve();
    }

    logout(): Promise<void> {
        return Promise.resolve();
    }
}
