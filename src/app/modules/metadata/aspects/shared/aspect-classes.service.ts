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

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { DeviceTypeAspectClassModel } from '../../device-types-overview/shared/device-type.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

// The device-repository serves aspect-classes without the /v2 prefix its siblings carry: that prefix
// marks a paginated list which replaced an unpaginated one, and this resource has no predecessor.
const aspectClassesUrl = () => environment.deviceRepoUrl + '/aspect-classes';

/**
 * Aspect-classes have no page of their own: they are picked and created in the aspect tree's class
 * field, and renamed and deleted on the group row that stands for the class. That row is the only
 * place they are managed, which is why the tree shows a row even for a class no aspect carries.
 */
@Injectable({
    providedIn: 'root',
})
export class AspectClassesService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(aspectClassesUrl());
    }

    getAspectClasses(limit: number, offset: number): Observable<DeviceTypeAspectClassModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset, 'sort=name.asc'];
        return this.http
            .get<DeviceTypeAspectClassModel[] | null>(aspectClassesUrl() + '?' + params.join('&'))
            .pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(AspectClassesService.name, 'getAspectClasses', [])),
            );
    }

    /** Renaming is admin-only, and the id in the body has to equal the one in the path. */
    updateAspectClass(aspectClass: DeviceTypeAspectClassModel): Observable<DeviceTypeAspectClassModel | null> {
        return this.http
            .put<DeviceTypeAspectClassModel>(aspectClassesUrl() + '/' + aspectClass.id, aspectClass)
            .pipe(catchError(this.errorHandlerService.handleError(AspectClassesService.name, 'updateAspectClass', null)));
    }

    /** Creating is admin-only; the device-repository generates the id when the request carries none. */
    createAspectClass(name: string): Observable<DeviceTypeAspectClassModel | null> {
        return this.http
            .post<DeviceTypeAspectClassModel>(aspectClassesUrl(), { id: '', name })
            .pipe(catchError(this.errorHandlerService.handleError(AspectClassesService.name, 'createAspectClass', null)));
    }

    /**
     * Deletes an aspect class. One that aspects still carry is refused with 400 and a body naming
     * them; that list is passed on as the error, because the caller cannot derive it.
     */
    deleteAspectClass(aspectClassId: string): Observable<{ deleted: boolean; error?: string }> {
        return this.http
            .delete(aspectClassesUrl() + '/' + aspectClassId, { responseType: 'text' })
            .pipe(
                map(() => ({ deleted: true })),
                catchError((err: HttpErrorResponse) => {
                    this.errorHandlerService.logError(AspectClassesService.name, 'deleteAspectClass', err);
                    const message = typeof err.error === 'string' && err.error.trim().length > 0
                        ? err.error.trim()
                        : undefined;
                    return of({ deleted: false, error: message });
                }),
            );
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}
