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

import { TestBed } from '@angular/core/testing';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PermissionsService } from './permissions.service';
import { PermissionsV2ResourceBaseModel, PermissionsV2ResourceModel } from './permissions-resource.model';
import { environment } from '../../../../environments/environment';

const rights = (r: string) => ({
    read: r.includes('r'),
    write: r.includes('w'),
    execute: r.includes('x'),
    administrate: r.includes('a'),
});

describe('PermissionsService', () => {
    let service: PermissionsService;
    let http: HttpTestingController;
    const manageUrl = environment.permissionV2Url + '/manage/devices/device-1';

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatSnackBarModule],
            providers: [PermissionsService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(PermissionsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
    });

    it('keeps existing permissions the addition does not mention', () => {
        const merged = PermissionsService.mergeResourcePermissionsV2(
            {
                user_permissions: { owner: rights('rwxa') },
                group_permissions: { '/admins': rights('r') },
                role_permissions: {},
            },
            {
                user_permissions: { colleague: rights('rx') },
                group_permissions: {},
                role_permissions: {},
            },
        );

        expect(merged).toEqual({
            user_permissions: { owner: rights('rwxa'), colleague: rights('rx') },
            group_permissions: { '/admins': rights('r') },
            role_permissions: {},
        });
    });

    it('replaces the rights of a user that is already listed', () => {
        const merged = PermissionsService.mergeResourcePermissionsV2(
            {
                user_permissions: { colleague: rights('r') },
                group_permissions: {},
                role_permissions: {},
            },
            {
                user_permissions: { colleague: rights('rwx') },
                group_permissions: {},
                role_permissions: {},
            },
        );

        expect(merged.user_permissions).toEqual({ colleague: rights('rwx') });
    });

    it('writes the merged permissions of a resource', () => {
        const added: PermissionsV2ResourceBaseModel = {
            user_permissions: { colleague: rights('rx') },
            group_permissions: {},
            role_permissions: {},
        };
        let result: boolean | undefined;

        service.addResourcePermissionsV2('devices', 'device-1', added).subscribe((ok) => (result = ok));

        http.expectOne({ method: 'GET', url: manageUrl }).flush({
            topic_id: 'devices',
            id: 'device-1',
            user_permissions: { owner: rights('rwxa') },
            group_permissions: {},
            role_permissions: {},
        } as PermissionsV2ResourceModel);
        const put = http.expectOne({ method: 'PUT', url: manageUrl });
        expect(put.request.body).toEqual({
            user_permissions: { owner: rights('rwxa'), colleague: rights('rx') },
            group_permissions: {},
            role_permissions: {},
        });
        put.flush({});

        expect(result).toBe(true);
    });

    it('does not write anything when the current permissions cannot be read', () => {
        let result: boolean | undefined;

        service
            .addResourcePermissionsV2('devices', 'device-1', {
                user_permissions: { colleague: rights('rx') },
                group_permissions: {},
                role_permissions: {},
            })
            .subscribe((ok) => (result = ok));

        http.expectOne({ method: 'GET', url: manageUrl }).flush('nope', { status: 500, statusText: 'Internal Server Error' });

        http.expectNone({ method: 'PUT', url: manageUrl });
        expect(result).toBe(false);
    });
});
