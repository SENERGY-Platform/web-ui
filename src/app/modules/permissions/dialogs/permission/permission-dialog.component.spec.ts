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

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { PermissionDialogComponent } from './permission-dialog.component';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { PermissionsService } from '../../shared/permissions.service';
import { PermissionsV2ResourceBaseModel } from '../../shared/permissions-resource.model';

describe('PermissionDialogComponent', () => {
    function create() {
        const permissions = { user_permissions: {}, group_permissions: {}, role_permissions: {} } as unknown as PermissionsV2ResourceBaseModel;
        TestBed.configureTestingModule({
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { name: 'resource', permissions } },
                { provide: MatDialogRef, useValue: createSpyFromClass(MatDialogRef) },
                { provide: AuthorizationService, useValue: createSpyFromClass(AuthorizationService) },
                { provide: PermissionsService, useValue: createSpyFromClass(PermissionsService) },
            ],
        });
        return { component: TestBed.runInInjectionContext(() => new PermissionDialogComponent()), permissions };
    }

    const cases: { kind: 'user' | 'group' | 'role'; add: (c: PermissionDialogComponent) => void }[] = [
        { kind: 'user', add: (c) => c.addUser() },
        { kind: 'group', add: (c) => c.addGroup() },
        { kind: 'role', add: (c) => c.addRole() },
    ];

    for (const { kind, add } of cases) {
        for (const empty of [null, undefined, '']) {
            it('adds no ' + kind + ' entry for the cleared value ' + String(empty), () => {
                const { component, permissions } = create();
                const control = component[(kind + 'FormControl') as 'userFormControl'];
                control.setValue(empty as string | null);

                add(component);

                expect(Object.keys(permissions[(kind + '_permissions') as 'user_permissions'])).toEqual([]);
            });
        }

        it('adds the selected ' + kind, () => {
            const { component, permissions } = create();
            component[(kind + 'FormControl') as 'userFormControl'].setValue('x1');

            add(component);

            expect(Object.keys(permissions[(kind + '_permissions') as 'user_permissions'])).toEqual(['x1']);
        });
    }
});
