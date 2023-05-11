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
import { Observable } from 'rxjs';
import {AuthorizationProfileModel} from '../model/authorization/authorization-profile.model';

@Injectable({
    providedIn: 'root',
})
export class AuthorizationServiceMock {
    getUserId(): string | Error {
        return 'test';
    }

    getUserName(): Promise<string> {
        return new Promise<string>((resolve) => resolve('test'));
    }

    getProfile(): AuthorizationProfileModel {
        return {
            email: 'test',
            firstName: 'test',
            lastName: 'test',
            username: 'test',
        } as AuthorizationProfileModel;
    }

    /*
     getToken(): Promise<string> {
    }*/

    updateToken(): void {
    }

    logout() {
    }

    /*
    changePasswort(password: string): Observable<null | { error: string }> {
    }*/

    /*
    changeUserProfile(userProfile: AuthorizationUserProfileModel): Observable<null | { error: string }> {

    }*/

    userIsAdmin(): boolean {
        return true;
    }

    userIsDeveloper(): boolean {
        return true;
    }

    loadAllUsers(): Observable<any> {
        return new Observable(observer => {
            observer.complete();
        });
    }

    loadAllRoles(): Observable<any> {
        return new Observable(observer => {
            observer.complete();
        });
    }

    loadAllClients(): Observable<any> {
        return new Observable(observer => {
            observer.complete();
        });
    }
}
