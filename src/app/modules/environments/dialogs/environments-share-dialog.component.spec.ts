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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

    let environmentsServiceShares: EnvironmentShares | null | undefined;

    beforeEach(() => {
        environmentsServiceShares = undefined;
    });

    /** Direct construction (no TestBed), same as environments-create-dialog.component.spec.ts. */
    const create = (): EnvironmentsShareDialogComponent => {
        environmentsService = new MockEnvironmentsService();
        if (environmentsServiceShares !== undefined) {
            environmentsService.shares = environmentsServiceShares;
        }
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

        expect(environmentsService.setCalls).toEqual([
            { id: 'e1', shares: { users: [], groups: ['/demo', '/other'], graph_writers: { users: [], groups: [] } } },
        ]);
    });

    // The PUT replaces graph_writers too, so a save that dropped them would take write away.
    it('should carry the loaded graph writers through a save it did not touch them in', () => {
        environmentsServiceShares = { users: ['u1', 'u2'], groups: ['/demo'], graph_writers: { users: ['u2'], groups: ['/demo'] }, devices: 3 };
        const component = create();
        component.groupFormControl.setValue('/other');
        component.addGroup();

        component.save();

        expect(environmentsService.setCalls[0].shares.graph_writers).toEqual({ users: ['u2'], groups: ['/demo'] });
        expect(component.isUserGraphWriter('u2')).toBe(true);
        expect(component.isUserGraphWriter('u1')).toBe(false);
    });

    it('should read a set without graph_writers as one without writers', () => {
        const component = create();
        expect(component.graphWriterUsers).toEqual([]);
        expect(component.graphWriterGroups).toEqual([]);
    });

    it('should make a shared user and group graph writers and take it back on uncheck', () => {
        const component = create();
        component.setUserGraphWriter('u1', true);
        component.setGroupGraphWriter('/demo', true);
        component.save();
        expect(environmentsService.setCalls[0].shares.graph_writers).toEqual({ users: ['u1'], groups: ['/demo'] });

        component.setUserGraphWriter('u1', false);
        component.setGroupGraphWriter('/demo', false);
        component.save();
        expect(environmentsService.setCalls[1].shares.graph_writers).toEqual({ users: [], groups: [] });
    });

    it('should not make an entry that is not shared a graph writer', () => {
        const component = create();
        component.setUserGraphWriter('u2', true);
        component.setGroupGraphWriter('/other', true);
        component.save();
        expect(environmentsService.setCalls[0].shares.graph_writers).toEqual({ users: [], groups: [] });
    });

    // The server refuses a graph writer that is not shared, so removing the entry removes the write.
    it('should drop the graph writer with the entry it belongs to', () => {
        environmentsServiceShares = { users: ['u1'], groups: ['/demo'], graph_writers: { users: ['u1'], groups: ['/demo'] } };
        const component = create();
        component.removeUser('u1');
        component.removeGroup('/demo');

        component.save();

        expect(environmentsService.setCalls[0].shares).toEqual({ users: [], groups: [], graph_writers: { users: [], groups: [] } });
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

// Renders the template, which the direct construction above never compiles.
describe('EnvironmentsShareDialogComponent graph writer checkbox', () => {
    let environmentsService: MockEnvironmentsService;

    const render = (shares: EnvironmentShares) => {
        environmentsService = new MockEnvironmentsService();
        environmentsService.shares = shares;
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsShareDialogComponent],
            imports: [MatCheckboxModule, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useClass: MockDialogRef },
                { provide: EnvironmentsService, useValue: environmentsService },
                { provide: PermissionsService, useClass: MockPermissionsService },
                { provide: AuthorizationService, useClass: MockAuthorizationService },
                { provide: MatSnackBar, useClass: MockSnackBar },
                { provide: MAT_DIALOG_DATA, useValue: { id: 'e1', name: 'Plant A' } },
            ],
        });
        const fixture = TestBed.createComponent(EnvironmentsShareDialogComponent);
        fixture.detectChanges();
        return fixture;
    };

    const checkboxes = (element: HTMLElement): HTMLInputElement[] =>
        Array.from(element.querySelectorAll<HTMLInputElement>('mat-checkbox.graph-writer input[type="checkbox"]'));

    it('should show one checkbox per shared entry, checked for the loaded graph writers', () => {
        const fixture = render({ users: ['u1', 'u2'], groups: ['/demo'], graph_writers: { users: ['u2'], groups: [] } });
        const boxes = checkboxes(fixture.nativeElement);
        expect(boxes.length).toBe(3);
        expect(boxes.map(box => box.checked)).toEqual([false, true, false]);
    });

    it('should turn a click on the checkbox into a graph writer and a second click back', () => {
        const fixture = render({ users: ['u1'], groups: ['/demo'] });
        const [user, group] = checkboxes(fixture.nativeElement);

        user.click();
        group.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.graphWriterUsers).toEqual(['u1']);
        expect(fixture.componentInstance.graphWriterGroups).toEqual(['/demo']);

        user.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.graphWriterUsers).toEqual([]);

        fixture.componentInstance.save();
        expect(environmentsService.setCalls[0].shares.graph_writers).toEqual({ users: [], groups: ['/demo'] });
    });
});
