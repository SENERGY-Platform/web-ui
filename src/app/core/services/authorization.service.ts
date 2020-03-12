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

import {Injectable} from '@angular/core';
import {KeycloakService} from 'keycloak-angular';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {catchError} from 'rxjs/operators';
import {ErrorHandlerService} from './error-handler.service';
import {HttpClient} from '@angular/common/http';
import {AuthorizationProfileModel} from '../components/authorization/authorization-profile.model';
import {AuthorizationUserProfileModel} from '../components/authorization/authorization-user-profile.model';


@Injectable({
    providedIn: 'root'
})

export class AuthorizationService {

    constructor(private keycloakService: KeycloakService,
                private errorHandlerService: ErrorHandlerService,
                private http: HttpClient) {
    }

    getUserId(): string | Error {
        const sub = localStorage.getItem('sub');
        if (sub !== null) {
            return sub;
        } else {
            return Error('Could not load sub');
        }
    }

    getUserName(): string {
        return this.keycloakService.getUsername();
    }

    getProfile(): AuthorizationProfileModel {
        const returnProfile: AuthorizationProfileModel = {email: '', firstName: '', lastName: '', username: ''};
        const profile = this.keycloakService.getKeycloakInstance().profile;
        if (profile) {
            returnProfile.email = profile.email || '';
            returnProfile.firstName = profile.firstName || '';
            returnProfile.lastName = profile.lastName || '';
            returnProfile.username = profile.username || '';
        }
        return returnProfile;
    }

    getToken(): Promise<string> {
        return this.keycloakService.getToken().then((resp) => {
            return 'bearer ' + resp;
        });
    }

    updateToken(): void {
        this.keycloakService.getKeycloakInstance().loadUserProfile();
    }

    logout() {
        this.keycloakService.logout();
    }

    changePasswort(password: string): Observable<null | { error: string }> {
        return this.http.put<null | { error: string }>(environment.usersServiceUrl + '/password',
            {'password': password}).pipe(
            catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'changePasswort', {error: 'error'}))
        );
    }

    changeUserProfile(userProfile: AuthorizationUserProfileModel): Observable<null | { error: string }> {
        return this.http.put<null>(environment.usersServiceUrl + '/info', userProfile).pipe(
            catchError(this.errorHandlerService.handleError(AuthorizationService.name, 'changeUserProfile', {error: 'error'}))
        );
    }
}
