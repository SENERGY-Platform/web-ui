/*
 * Copyright 2025 InfAI (CC SES)
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

import { Injectable } from '@angular/core';
import {Observable, of} from 'rxjs';
import { PermissionsV2ResourceModel, PermissionsV2RightsAndIdModel} from './permissions-resource.model';
import { PermissionsUserModel } from './permissions-user.model';

@Injectable({
    providedIn: 'root',
})
export class PermissionsMockService {
    constructor() {}
    getResourcePermissionsV2(_: string, __: string): Observable<PermissionsV2ResourceModel> {
        return of({} as PermissionsV2ResourceModel);
    }

    getComputedResourcePermissionsV2(_: string, ressourceIds: string[]): Observable<PermissionsV2RightsAndIdModel[]> {
        const permissions = [] as PermissionsV2RightsAndIdModel[];
        ressourceIds.forEach(id => {
           permissions.push({id: id, administrate: true, execute: true, read:true, write:true} as PermissionsV2RightsAndIdModel);
        });
        return new Observable<PermissionsV2RightsAndIdModel[]>(observer => {
            observer.next(permissions);
            observer.complete();
        });
    }

    getUserById(_: string): Observable<PermissionsUserModel> {
        return new Observable<PermissionsUserModel>(observer => {
            observer.next({} as PermissionsUserModel);
            observer.complete();
        });
    }
}
