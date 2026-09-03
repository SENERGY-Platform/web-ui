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

import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { EnvironmentsShareDialogComponent } from './environments-share-dialog.component';
import { EnvironmentsService } from '../shared/environments.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsUserModel } from '../../permissions/shared/permissions-user.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { ApiError, EnvironmentShares, SharesFailure } from '../shared/environments.model';

class MockEnvironmentsService {
    shares: EnvironmentShares | null = { users: ['u1'], groups: ['/demo'], devices: 3 };
    setResult: EnvironmentShares | SharesFailure | ApiError = { users: ['u1', 'u2'], groups: ['/demo'], devices: 5 };
    setCalls: { id: string; shares: EnvironmentShares }[] = [];

    getShares(_id: string): Observable<EnvironmentShares | null> {
        return of(this.shares);
    }

    setShares(id: string, shares: EnvironmentShares): Observable<EnvironmentShares | SharesFailure | ApiError> {
        this.setCalls.push({ id, shares });
        return of(this.setResult);
    }
}

class MockPermissionsService {
    users: PermissionsUserModel[] = [
        { id: 'u1', username: 'Alice' },
        { id: 'u2', username: 'Bob' },
    ];

    getSharableUsers(): Observable<PermissionsUserModel[] | null> {
        return of(this.users);
    }
}

class MockAuthorizationService {
    groups: { path: string }[] = [{ path: '/demo' }, { path: '/other' }];

    loadAllGroups(): Observable<{ path: string }[]> {
        return of(this.groups);
    }
}

class MockDialogRef {
    closeCalled = false;
    closedWith: unknown;

    close(value?: unknown): void {
        this.closeCalled = true;
        this.closedWith = value;
    }
}

class MockSnackBar {
    lastMessage: string | undefined;

    open(message: string): void {
        this.lastMessage = message;
    }
}

describe('EnvironmentsShareDialogComponent', () => {
    let environmentsService: MockEnvironmentsService;
    let permissionsService: MockPermissionsService;
    let authorizationService: MockAuthorizationService;
    let dialogRef: MockDialogRef;
    let snackBar: MockSnackBar;

    /** Direct construction (no TestBed), same as environments-create-dialog.component.spec.ts. */
    const create = (): EnvironmentsShareDialogComponent => {
        environmentsService = new MockEnvironmentsService();
        permissionsService = new MockPermissionsService();
        authorizationService = new MockAuthorizationService();
        dialogRef = new MockDialogRef();
        snackBar = new MockSnackBar();
        const component = new EnvironmentsShareDialogComponent(
            dialogRef as unknown as MatDialogRef<EnvironmentsShareDialogComponent>,
            environmentsService as unknown as EnvironmentsService,
            permissionsService as unknown as PermissionsService,
            authorizationService as unknown as AuthorizationService,
            snackBar as unknown as MatSnackBar,
            { id: 'e1', name: 'Plant A' },
        );
        component.ngOnInit();
        return component;
    };

    it('should create', () => {
        expect(create()).toBeTruthy();
    });

    it('should load the current share set on open', () => {
        const component = create();
        expect(component.loading).toBe(false);
        expect(component.users).toEqual(['u1']);
        expect(component.groups).toEqual(['/demo']);
    });

    it('should resolve a shared user id to its username', () => {
        const component = create();
        expect(component.userName('u1')).toBe('Alice');
    });

    it('should offer only users and groups not already shared', () => {
        const component = create();
        expect(component.addableUsers.map(u => u.id)).toEqual(['u2']);
        expect(component.addableGroups).toEqual(['/other']);
    });

    it('should add and remove a user from the edited set', () => {
        const component = create();
        component.userFormControl.setValue('u2');
        component.addUser();
        expect(component.users).toEqual(['u1', 'u2']);

        component.removeUser('u1');
        expect(component.users).toEqual(['u2']);
    });

    it('should add and remove a group from the edited set', () => {
        const component = create();
        component.groupFormControl.setValue('/other');
        component.addGroup();
        expect(component.groups).toEqual(['/demo', '/other']);

        component.removeGroup('/demo');
        expect(component.groups).toEqual(['/other']);
    });

    it('should save the whole edited set, not a diff of the loaded one', () => {
        const component = create();
        component.removeUser('u1');
        component.groupFormControl.setValue('/other');
        component.addGroup();

        component.save();

        expect(environmentsService.setCalls).toEqual([{ id: 'e1', shares: { users: [], groups: ['/demo', '/other'] } }]);
    });

    it('should show a confirmation with the device count and close the dialog on success', () => {
        const component = create();

        component.save();

        expect(snackBar.lastMessage).toBe('Applied to 5 devices.');
        expect(dialogRef.closeCalled).toBe(true);
        expect(dialogRef.closedWith).toEqual(environmentsService.setResult);
    });

    // A retry is always safe here (PUT is idempotent), so the dialog stays open instead of
    // discarding the edited set the user would otherwise have to re-enter.
    it('should list the per-device errors on a 502 and keep the dialog open', () => {
        const component = create();
        environmentsService.setResult = {
            devices: [
                { id: 'd1', error: 'permission denied' },
                { id: 'd2', error: 'timeout' },
            ],
        };

        component.save();

        expect(component.deviceErrors).toEqual([
            { id: 'd1', error: 'permission denied' },
            { id: 'd2', error: 'timeout' },
        ]);
        expect(dialogRef.closeCalled).toBe(false);
    });

    it('should show the error text on a 400 and keep the dialog open', () => {
        const component = create();
        environmentsService.setResult = { message: 'group path must start with /' };

        component.save();

        expect(component.errorMessage).toBe('group path must start with /');
        expect(dialogRef.closeCalled).toBe(false);
    });

    it('should close without a value on cancel', () => {
        const component = create();
        component.cancel();
        expect(dialogRef.closeCalled).toBe(true);
        expect(dialogRef.closedWith).toBeUndefined();
    });
});
