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

import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {catchError} from 'rxjs/operators';
import {ErrorHandlerService} from './error-handler.service';
import { HttpClient } from '@angular/common/http';
import {AuthorizationProfileModel} from '../model/authorization/authorization-profile.model';
import {AuthorizationUserProfileModel} from '../model/authorization/authorization-user-profile.model';
import {AUTH_CLIENT} from './auth-client';

@Injectable({
    providedIn: 'root',
})
export class AuthorizationService {
    private authClient = inject(AUTH_CLIENT);
    private errorHandlerService = inject(ErrorHandlerService);
    private http = inject(HttpClient);

    init(): Promise<boolean> {
        return this.authClient.init().then((initialized) => {
            if (initialized) {
                this.authClient.loadUserProfile();
            }
            return initialized;
        });
    }

    getUserId(): string | Error {
        const sub = localStorage.getItem('sub');
        if (sub !== null) {
            return sub;
        } else {
            return this.authClient.getKeycloakInstance().subject || Error('Could not load sub');
        }
    }

    getUserName(): string {
        return this.authClient.getUsername() as string;
    }

    getProfile(): Promise<AuthorizationProfileModel> {
        const returnProfile: AuthorizationProfileModel = {email: '', firstName: '', lastName: '', username: ''};
        return this.authClient.loadUserProfile().then(profile => {
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
        return (this.authClient.getKeycloakInstance().tokenParsed || {groups: []})['groups'];
    }

    getToken(): Promise<string> {
        return this.authClient.getToken().then((resp) => 'Bearer ' + resp);
    }

    logout() {
        localStorage.clear();
        sessionStorage.clear();
        this.authClient.logout();
    }

    /**
     * Keycloak's own password form. Started through keycloak-js so the app recognises the callback on
     * return; a hand-built link comes back with ?code=&iss=, which Keycloak refuses as the next redirect_uri.
     */
    changePassword(redirectUri: string): Promise<void> {
        return this.authClient.login({ action: 'UPDATE_PASSWORD', redirectUri });
    }

    changeUserProfile(userProfile: AuthorizationUserProfileModel): Observable<null | { error: string }> {
        return this.http
            .post<null>(environment.keycloakUrl + '/auth/realms/master/account/', userProfile)
            .pipe(catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'changeUserProfile', {error: 'error'})));
    }

    userIsAdmin(): boolean {
        return this.authClient.isUserInRole('admin');
    }

    userIsDeveloper(): boolean {
        return this.authClient.isUserInRole('developer');
    }

    getUserRoles(): string[] {
        return this.authClient.getUserRoles();
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
