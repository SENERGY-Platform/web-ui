/*
 * Copyright 2023 InfAI (CC SES)
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

import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import {lastValueFrom, mergeMap, Observable} from 'rxjs';
import {KeycloakConfig, KeycloakProfile} from 'keycloak-js';
import {environment} from '../../../environments/environment';
import {Injectable, OnDestroy} from '@angular/core';
import {catchError, map} from 'rxjs/operators';
import { KeycloakOptions } from 'keycloak-angular';


export interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token?: string;
    token_type: string;
    'not-before-policy': number;
    session_state: string;
    scope: string;
}

export interface DecodedToken {
    alg: string;
    typ: string;
    kid: string;
    exp: number;
    iat: number;
    jti: string;
    iss: string;
    aud: string;
    sub: string;
    azp: string;
    session_state: string;
    acr: string;
    'allowed-origins': string[];
    realm_access: RealmAccess;
    resource_access: Map<string, RealmAccess>;
    scope: string;
    sid: string;
    email_verified: boolean;
    preferred_username: string;
    given_name: string;
    family_name: string;
}

export interface RealmAccess {
    roles: string[];
}

@Injectable({
    providedIn: 'root',
})
export class KeycloakConfidentialService implements OnDestroy {
    private timeout?: any;
    private options?: KeycloakOptions;
    private decodedToken?: DecodedToken;
    private refreshing?: Observable<boolean>;

    private clientSecret: string | null = sessionStorage.getItem('KeycloakConfidentialService_clientSecret');

    private get tokenExpires(): number {
        return Number(sessionStorage.getItem('KeycloakConfidentialService_tokenExpires'));
    };

    private set tokenExpires(n: number) {
        sessionStorage.setItem('KeycloakConfidentialService_tokenExpires', n.toString());
    }

    private get refreshTokenExpires(): number {
        return Number(sessionStorage.getItem('KeycloakConfidentialService_refreshTokenExpires'));
    };

    private set refreshTokenExpires(n: number) {
        sessionStorage.setItem('KeycloakConfidentialService_refreshTokenExpires', n.toString());
    };

    private get tokenResponse(): TokenResponse | null {
        return JSON.parse(sessionStorage.getItem('KeycloakConfidentialService_tokenResponse') as string); // JSON.parse(null) === null
    }

    private set tokenResponse(r: TokenResponse | null) {
        sessionStorage.setItem('KeycloakConfidentialService_tokenResponse', JSON.stringify(r));
    }

    private get isUserToken(): boolean {
        return sessionStorage.getItem('KeycloakConfidentialService_isUserToken') === 'true';
    }

    private set isUserToken(r: boolean) {
        sessionStorage.setItem('KeycloakConfidentialService_isUserToken', r ? 'true' : 'false');
    }

    private get userInfo(): KeycloakProfile | null {
        return JSON.parse(sessionStorage.getItem('KeycloakConfidentialService_userinfo') as string); // JSON.parse(null) === null
    }

    private set userInfo(r: KeycloakProfile | null) {
        sessionStorage.setItem('KeycloakConfidentialService_userinfo', JSON.stringify(r));
    }

    private get tokenUrl(): string {
        return ((this.options?.config as KeycloakConfig).url || '') + '/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token';
    }

    shouldAddToken: (request: HttpRequest<unknown>) => boolean = (request) => !request.url.startsWith(environment.keycloakUrl + '/auth/realms/' + environment.keyCloakRealm + '/protocol/openid-connect/token');

    constructor(private httpClient: HttpClient) {

    }

    ngOnDestroy(): void {
        clearTimeout(this.timeout);
    }

    init(options?: KeycloakOptions): Promise<boolean> {
        this.options = options;
        if (this.options !== undefined && this.options.shouldAddToken !== undefined) {
            this.shouldAddToken = this.options.shouldAddToken;
        }
        const now = new Date().valueOf();

        if (this.isUserToken && this.tokenResponse?.access_token !== undefined && this.tokenResponse.access_token.length > 0 && this.tokenExpires > now - 10000) {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => this.refreshToken().subscribe(), this.tokenExpires - now - 10000);
            const p = Promise<boolean>;
            return p.resolve(true);
        }
        if (this.isUserToken && this.tokenResponse?.refresh_token !== undefined && this.tokenResponse.refresh_token.length > 0 && this.refreshTokenExpires > now) {
            return lastValueFrom(this.refreshToken());
        }

        if (this.clientSecret === null || this.clientSecret.length === 0) {
            this.clientSecret = window.prompt('Client Secret');
            sessionStorage.setItem('KeycloakConfidentialService_clientSecret', this.clientSecret || '');
        }

        return lastValueFrom(this.getFreshTokenServiceAccount().pipe(
            catchError((err) => {
                sessionStorage.clear();
                window.alert('Failed to get service account token, client secret correct?');
                location.reload();
                throw err;
            }),
            mergeMap((_) => {
                const username = window.prompt('Username') || '';
                return this.getUserInfo(username);
            }), catchError((err) => {
                window.alert('Failed to get user info, username correct?');
                location.reload();
                throw err;
            }), mergeMap((userInfo, __) => {
                this.userInfo = userInfo;
                if (userInfo.id === undefined) {
                    window.alert('Failed to login!');
                    location.reload();
                    throw Error('UserId undefined');
                }
                return this.getFreshTokenExchanged(userInfo.id);
            }), catchError((err) => {
                window.alert('Failed to exchange token, client correctly configured?');
                location.reload();
                throw err;
            })));


    }

    logout(_?: string): Promise<void> {
        sessionStorage.clear();
        location.reload();
        const p = Promise<void>;
        return p.resolve();
    }

    isUserInRole(role: string, __?: string): boolean {
        const decodedToken = this.decodeToken();
        if (decodedToken === undefined) {
            return false;
        }
        return decodedToken.realm_access.roles.indexOf(role) !== -1;
    }

    getUserRoles(_?: boolean): string[] {
        return this.decodeToken()?.realm_access.roles || [];
    }

    getToken(): Promise<string> {
        const p = Promise<string>;
        return p.resolve(this.tokenResponse?.access_token || '');
    }

    getUsername(): string {
        return this.decodeToken()?.preferred_username || '';
    }

    loadUserProfile(): Promise<KeycloakProfile> {
        const p = Promise<KeycloakProfile>;
        return p.resolve(this.userInfo || {});
    }

    getKeycloakInstance(): ({subject?: string}) { // this is a stub, implementing only what is required by AuthorizationService
        return {subject: this.userInfo?.id};
    }

    isTokenExpired(minValidity?: number): boolean {
        return this.isUserToken && this.tokenExpires - new Date().valueOf() < (minValidity ?? 0) * 1000;
    }

    updateToken(_?: number): Promise<boolean> {
        return lastValueFrom(this.refreshToken());
    }

    private requestToken(body: any, options?: {
        headers?: HttpHeaders | { [p: string]: string | string[] } | undefined;
    }, isUserToken?: boolean): Observable<boolean> {
        clearTimeout(this.timeout);
        this.decodedToken = undefined;
        return (this.httpClient.post<TokenResponse>(this.tokenUrl, body, options)).pipe(map(resp => {
            this.tokenResponse = resp;
            const now = new Date().valueOf();
            this.tokenExpires = now + (resp.expires_in * 1000);
            const userId = this.userInfo?.id;
            if (isUserToken === true) {
                if (resp.refresh_token !== undefined) {
                    this.refreshTokenExpires = now + (resp.refresh_expires_in * 1000);
                    this.timeout = setTimeout(() => this.refreshToken().subscribe(), (resp.expires_in - 10) * 1000);
                } else if (userId !== undefined) {
                    this.timeout = setTimeout(() => this.getFreshTokenExchanged(userId).subscribe(), (resp.expires_in - 10) * 1000);
                }
                this.isUserToken = true;
            } else {
                this.isUserToken = false;
            }
            return true;
        }));
    }

    private getUserInfo(username: string): Promise<KeycloakProfile> {
        const url = ((this.options?.config as KeycloakConfig).url || '') + '/admin/realms/' + environment.keyCloakRealm + '/users?exact=true&username=' + username;
        return lastValueFrom(this.httpClient.get<KeycloakProfile[]>(url).pipe(map(arr => arr[0])));
    }

    private getFreshTokenExchanged(userId: string): Observable<boolean> {
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/x-www-form-urlencoded;'
        );

        const body = 'grant_type=urn:ietf:params:oauth:grant-type:token-exchange&requested_subject=' + userId +
            '&client_id=' + environment.keyCloakClientId + '&client_secret=' + this.clientSecret;

        return this.requestToken(body, {headers}, true);
    }

    private getFreshTokenServiceAccount(): Observable<boolean> {
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/x-www-form-urlencoded;'
        );

        const body = 'grant_type=client_credentials' +
            '&client_id=' + environment.keyCloakClientId + '&client_secret=' + this.clientSecret;

        return this.requestToken(body, {headers});
    }

    private refreshToken(): Observable<boolean> {
        if (this.refreshing !== undefined) {
            return this.refreshing;
        }
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/x-www-form-urlencoded;'
        );

        const body = 'grant_type=refresh_token&client_id=' + environment.keyCloakClientId + '&client_secret=' + this.clientSecret + '&refresh_token=' + this.tokenResponse?.refresh_token;

        this.refreshing = this.requestToken(body, {headers}, true).pipe(map((v) => {
            this.refreshing = undefined;
            return v;
        }));
        return this.refreshing;
    }

    private decodeToken(): DecodedToken | undefined {
        if (this.decodedToken !== undefined) {
            return this.decodedToken;
        }
        const _decodeToken = (token: string) => {
            try {
                return JSON.parse(atob(token));
            } catch {
                return;
            }
        };
        this.decodedToken = this.tokenResponse?.access_token
            .split('.')
            .map(token => _decodeToken(token))
            .reduce((acc, curr) => {
                if (!!curr) {
                    acc = {...acc, ...curr};
                }
                return acc;
            }, Object.create(null));
        return this.decodedToken;
    }
}
