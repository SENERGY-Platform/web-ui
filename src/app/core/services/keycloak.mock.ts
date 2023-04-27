/*
 * Copyright 2020 InfAI (CC SES)
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

import { Keycloak } from 'keycloak-angular/lib/core/services/keycloak.service';

export class MockKeycloakService {
    getKeycloakInstance(): Keycloak.KeycloakInstance {
        return { subject: 'test' } as Keycloak.KeycloakInstance;
    }

    getUsername() {
        return 'test';
    }

    getToken(): Promise<string> {
        return new Promise<string>(
            () =>
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkw' +
                'IiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        ); // John Doe
    }

    loadUserProfile(): Promise<Keycloak.KeycloakProfile> {
        return new Promise<Keycloak.KeycloakProfile>((resolve) => resolve({} as Keycloak.KeycloakProfile));
    }

    isUserInRole(_: string): boolean {
        return true;
    }
}
