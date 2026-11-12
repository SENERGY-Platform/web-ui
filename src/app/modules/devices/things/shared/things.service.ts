/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { DeviceTypeContentVariableModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { ThingDeviceLinkCreateModel, ThingModel, ThingTotalModel } from './things.model';

@Injectable({
    providedIn: 'root',
})
export class ThingsService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private ladonService = inject(LadonService);

    authorizations: PermissionTestResponse;
    authorizationsDeviceLinks: PermissionTestResponse;
    authorizationsShare: PermissionTestResponse;

    constructor() {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/things');
        this.authorizationsDeviceLinks = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/things/id/device-links');
        this.authorizationsShare = this.ladonService.getUserAuthorizationsForURI(environment.permissionV2Url + '/manage/things');
    }

    /** Lists the things the user may read; sortBy is `name` or `id`. */
    getThings(options: { limit?: number; offset?: number; search?: string; sortBy?: string; sortDirection?: string }): Observable<ThingTotalModel> {
        let params = new HttpParams();
        if (options.limit !== undefined) {
            params = params.set('limit', options.limit.toString());
        }
        if (options.offset !== undefined) {
            params = params.set('offset', options.offset.toString());
        }
        if (options.search) {
            params = params.set('search', options.search);
        }
        if (options.sortBy) {
            params = params.set('sort', options.sortBy + '.' + (options.sortDirection || 'asc'));
        }
        return this.http.get<ThingModel[]>(environment.deviceRepoUrl + '/things', { observe: 'response', params }).pipe(
            map((resp) => ({
                result: resp.body || [],
                total: parseInt(resp.headers.get('X-Total-Count') || '0', 10),
            })),
            catchError(this.errorHandlerService.handleError(ThingsService.name, 'getThings', { result: [], total: 0 })),
        );
    }

    getThing(id: string): Observable<ThingModel | null> {
        return this.http
            .get<ThingModel>(environment.deviceRepoUrl + '/things/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(ThingsService.name, 'getThing', null)));
    }

    /** The server assigns the id and the owner; device links are added afterwards with addDeviceLink. */
    createThing(thing: ThingModel): Observable<ThingModel | null> {
        const { id: _id, ...body } = ThingsService.toBody(thing);
        return this.http
            .post<ThingModel>(environment.deviceRepoUrl + '/things', body)
            .pipe(catchError(this.errorHandlerService.handleError(ThingsService.name, 'createThing', null)));
    }

    updateThing(thing: ThingModel): Observable<ThingModel | null> {
        return this.http
            .put<ThingModel>(environment.deviceRepoUrl + '/things/' + encodeURIComponent(thing.id), ThingsService.toBody(thing))
            .pipe(catchError(this.errorHandlerService.handleError(ThingsService.name, 'updateThing', null)));
    }

    /** True once the device-repository accepted the delete; only the status decides, the body may be empty. */
    deleteThing(id: string): Observable<boolean> {
        return this.http.delete(environment.deviceRepoUrl + '/things/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(ThingsService.name, 'deleteThing', false)),
        );
    }

    /** Answers the thing with all its links; the link periods of one device may not overlap, not even across things. */
    addDeviceLink(thingId: string, link: ThingDeviceLinkCreateModel): Observable<ThingModel | null> {
        return this.http
            .post<ThingModel>(environment.deviceRepoUrl + '/things/' + encodeURIComponent(thingId) + '/device-links', link)
            .pipe(catchError(this.errorHandlerService.handleError(ThingsService.name, 'addDeviceLink', null)));
    }

    /** Ends an open link now; links are ended, never deleted. */
    endDeviceLink(thingId: string, linkId: string): Observable<ThingModel | null> {
        return this.http
            .post<ThingModel>(
                environment.deviceRepoUrl + '/things/' + encodeURIComponent(thingId) + '/device-links/' + encodeURIComponent(linkId) + '/end',
                {},
            )
            .pipe(catchError(this.errorHandlerService.handleError(ThingsService.name, 'endDeviceLink', null)));
    }

    /**
     * The thing as stored, without the links the server ignores and without the tree positions (`indices`) the
     * content-variable editor adds. Every other field is passed on, so a field this app does not know survives a save.
     */
    private static toBody(thing: ThingModel): Omit<ThingModel, 'device_links'> {
        const { device_links: _links, ...body } = thing;
        return { ...body, content_variables: (body.content_variables || []).map(ThingsService.withoutIndices) };
    }

    private static withoutIndices(contentVariable: DeviceTypeContentVariableModel): DeviceTypeContentVariableModel {
        const { indices: _indices, ...rest } = contentVariable;
        return rest.sub_content_variables
            ? { ...rest, sub_content_variables: rest.sub_content_variables.map(ThingsService.withoutIndices) }
            : rest;
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    /** Linking and ending a link are both POST below /things/{id}/device-links. */
    userHasDeviceLinkAuthorization(): boolean {
        return this.authorizationsDeviceLinks['POST'];
    }

    userHasShareAuthorization(): boolean {
        return this.authorizationsShare['GET'] && this.authorizationsShare['PUT'];
    }
}
