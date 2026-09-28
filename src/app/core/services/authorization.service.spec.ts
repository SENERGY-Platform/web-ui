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

import { HttpClient } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakLoginOptions } from 'keycloak-js';
import { AuthorizationService } from './authorization.service';
import { ErrorHandlerService } from './error-handler.service';

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
});
