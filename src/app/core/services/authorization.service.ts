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

import {Inject, Injectable} from '@angular/core';
import {KeycloakService} from 'keycloak-angular';
import {from, mergeMap, Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {ErrorHandlerService} from './error-handler.service';
import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import {AuthorizationProfileModel} from '../model/authorization/authorization-profile.model';
import {AuthorizationUserProfileModel} from '../model/authorization/authorization-user-profile.model';
import {keycloakServiceToken} from '../core.module';
import {KeycloakConfidentialService} from './keycloak-confidential.service';
import {KeycloakOptions} from 'keycloak-angular';

@Injectable({
    providedIn: 'root',
})
export class AuthorizationService implements HttpInterceptor {
    private keycloakService: KeycloakService;
    private options?: KeycloakOptions;

    constructor(@Inject(keycloakServiceToken) private keycloakServices: KeycloakService[], private errorHandlerService: ErrorHandlerService, private http: HttpClient) {
        if (AuthorizationService.usingConfidentialClient()) {
            this.keycloakService = this.keycloakServices.find(s => s instanceof KeycloakConfidentialService) as KeycloakService;
        } else {
            this.keycloakService = this.keycloakServices.find(s => s instanceof KeycloakService) as KeycloakService;
        }
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this.keycloakService.shouldAddToken(req)) {
            return next.handle(req);
        }
        let p: Promise<boolean>;
        if (this.keycloakService.isTokenExpired()) {
            p = this.keycloakService.updateToken();
        } else {
            const pConst = Promise<boolean>;
            p = pConst.resolve(true);
        }
        return from(p).pipe(
            mergeMap(() => from(this.keycloakService.getToken())),
            map(token => req.clone({
                headers: req.headers.set('Authorization', 'Bearer ' + token),
            })),
            mergeMap(r => next.handle(r)));
    }

    init(options?: KeycloakOptions): Promise<boolean> {
        this.options = options;
        return this.keycloakService.init(options).then((initialized) => {
            if (initialized) {
                this.keycloakService.loadUserProfile();
            }
            return initialized;
        });
    }

    getUserId(): string | Error {
        const sub = localStorage.getItem('sub');
        if (sub !== null) {
            return sub;
        } else {
            return this.keycloakService.getKeycloakInstance().subject || Error('Could not load sub');
        }
    }

    getUserName(): string {
        return this.keycloakService.getUsername();
    }

    getProfile(): Promise<AuthorizationProfileModel> {
        const returnProfile: AuthorizationProfileModel = {email: '', firstName: '', lastName: '', username: ''};
        return this.keycloakService.loadUserProfile().then(profile => {
            if (profile) {
                returnProfile.email = profile.email || '';
                returnProfile.firstName = profile.firstName || '';
                returnProfile.lastName = profile.lastName || '';
                returnProfile.username = profile.username || '';
            }
            return returnProfile;
        });
    }

    getUsersGroups(): string[] {
        return (this.keycloakService.getKeycloakInstance().tokenParsed || {groups: []})['groups'];
    }

    getToken(): Promise<string> {
        return this.keycloakService.getToken().then((resp) => 'Bearer ' + resp);
    }

    logout() {
        localStorage.clear();
        sessionStorage.clear();
        this.keycloakService.logout();
    }

    changeUserProfile(userProfile: AuthorizationUserProfileModel): Observable<null | { error: string }> {
        return this.http
            .post<null>(environment.keycloakUrl + '/auth/realms/master/account/', userProfile)
            .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'changeUserProfile', {error: 'error'})));
    }

    userIsAdmin(): boolean {
        return this.keycloakService.isUserInRole('admin');
    }

    userIsDeveloper(): boolean {
        return this.keycloakService.isUserInRole('developer');
    }

    getUserRoles(): string[] {
        return this.keycloakService.getUserRoles(true);
    }

    loadAllUsers() {
        return this.http
            .get<any | { error: string }>(environment.keycloakUrl + '/auth/admin/realms/master/users')
            .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'loadAllUsers', {error: 'error'})));
    }

    loadAllRoles() {
        return this.http
            .get<any | { error: string }>(environment.keycloakUrl + '/auth/admin/realms/master/roles')
            .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'loadAllRoles', {error: 'error'})));
    }

    loadAllClients() {
        return this.http
            .get<any | { error: string }>(environment.keycloakUrl + '/auth/admin/realms/master/clients')
            .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'loadAllClients', {error: 'error'})));
    }

    loadAllGroups() {
        return this.http
        .get<any | { error: string }>(environment.keycloakUrl + '/auth/admin/realms/master/groups')
        .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'loadAllGroups', {error: 'error'})));
    }

    static usingConfidentialClient(): boolean {
        return environment.keyCloakConfidential === 'true';
    }
}
