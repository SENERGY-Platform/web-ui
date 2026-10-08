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

import { EnvironmentProviders, Provider, inject } from '@angular/core';
import { provideKeycloak } from 'keycloak-angular';
import { AUTH_CLIENT, keycloakConfig } from './auth-client';
import { AuthorizationService } from './authorization.service';
import { KeycloakConfidentialService } from './keycloak-confidential.service';
import { KeycloakPublicClient } from './keycloak-public-client';

/**
 * keycloak-js gets no initOptions here: provideKeycloak would then start it in an initializer of its own, in parallel
 * with the app's and swallowing its errors. The app initializer starts it through AUTH_CLIENT instead.
 * The config is read when this is called; the environment changes only after login (loadEnv), so the values match.
 */
export function provideAuth(): (Provider | EnvironmentProviders)[] {
    return [
        provideKeycloak({ config: keycloakConfig() }),
        {
            provide: AUTH_CLIENT,
            useFactory: () => (AuthorizationService.usingConfidentialClient() ? inject(KeycloakConfidentialService) : inject(KeycloakPublicClient)),
        },
    ];
}
