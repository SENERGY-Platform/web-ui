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

import { environment } from '../../../environments/environment';
import {AuthorizationService} from './authorization.service';

export function initializerService(authorizationService: AuthorizationService): () => Promise<any> {
    return (): Promise<any> =>
        authorizationService
            .init({
                config: {
                    url: environment.keycloakUrl + '/auth',
                    realm: environment.keyCloakRealm,
                    clientId: environment.keyCloakClientId,
                },
                initOptions: {
                    onLoad: 'login-required',
                    checkLoginIframe: false,
                    // token: token,
                },
                bearerPrefix: 'Bearer',
                shouldAddToken: request => !request.url.startsWith(environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token')
            })
            .then(() =>
                loadEnv(authorizationService, environment.configUrl).then(() => {
                    if (!environment.production) {
                        return loadEnv(authorizationService, '/assets/env.json');
                    } else {
                        return null;
                    }
                }),
            );
}

export function loadEnv(authorizationService: AuthorizationService, url: string): Promise<unknown> {
    return authorizationService.getToken().then((token) => {
        const headers = new Headers();
        headers.set('Authorization', token);
        const request = new Request(url, {
            headers,
        });

        return fetch(request)
            .then((resp) => resp.json())
            .then((resp: string[]) => {
                resp.forEach((r) => {
                    const s = r.split('=');
                    if (s.length !== 2 || !s[1]) {
                        return; // Skips invalid or unset
                    }
                    (environment as any)[s[0]] = s[1];
                });
            });
    });
}
