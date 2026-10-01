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
import { HttpRequest } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import Keycloak, { KeycloakProfile } from 'keycloak-js';

/** A logged-in admin without a Keycloak server; extends KeycloakService because AuthorizationService selects by instanceof. */
export class PreviewKeycloakService extends KeycloakService {
    override getKeycloakInstance(): Keycloak {
        return { subject: 'preview-user', tokenParsed: { groups: [] } } as unknown as Keycloak;
    }

    override getUsername(): string {
        return 'preview';
    }

    override getToken(): Promise<string> {
        return Promise.resolve('preview-token');
    }

    override loadUserProfile(): Promise<KeycloakProfile> {
        return Promise.resolve({ username: 'preview', firstName: 'Preview', lastName: 'User', email: 'preview@example.org' });
    }

    override isUserInRole(_role: string): boolean {
        return true;
    }

    override getUserRoles(): string[] {
        return ['admin', 'developer', 'user'];
    }

    override isTokenExpired(): boolean {
        return false;
    }

    override shouldAddToken = (_request: HttpRequest<unknown>): boolean => false;

    override logout(): Promise<void> {
        return Promise.resolve();
    }
}
