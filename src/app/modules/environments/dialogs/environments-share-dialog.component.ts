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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UntypedFormControl } from '@angular/forms';
import { EnvironmentsService } from '../shared/environments.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsUserModel } from '../../permissions/shared/permissions-user.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { EnvironmentShares, isApiError, isSharesFailure, SharesDeviceError } from '../shared/environments.model';

export interface ShareDialogData {
    id: string;
    name?: string;
}

/**
 * Edits an environment's device-sharing set (read+execute on its managed devices, fixed --
 * not selectable here). Saving sends the whole edited set, not a diff; a 502 (some devices
 * failed) or 400 (rejected set) keeps the dialog open so the user can fix it or just retry,
 * since a repeated PUT is safe.
 */
@Component({
    selector: 'senergy-environments-share-dialog',
    templateUrl: './environments-share-dialog.component.html',
    styleUrls: ['./environments-share-dialog.component.css'],
})
export class EnvironmentsShareDialogComponent implements OnInit {
    userFormControl = new UntypedFormControl('');
    groupFormControl = new UntypedFormControl('');

    loading = true;
    saving = false;
    users: string[] = [];
    groups: string[] = [];

    /** Every sharable user, for the picker and for resolving a shared id's display name. */
    allUsers: PermissionsUserModel[] = [];
    allGroupPaths: string[] = [];
    addableUsers: PermissionsUserModel[] = [];
    addableGroups: string[] = [];

    errorMessage = '';
    deviceErrors: SharesDeviceError[] = [];

    constructor(
        private dialogRef: MatDialogRef<EnvironmentsShareDialogComponent>,
        private environmentsService: EnvironmentsService,
        private permissionsService: PermissionsService,
        private authorizationService: AuthorizationService,
        private snackBar: MatSnackBar,
        @Inject(MAT_DIALOG_DATA) public data: ShareDialogData,
    ) {}

    ngOnInit(): void {
        this.environmentsService.getShares(this.data.id).subscribe(shares => {
            this.users = shares?.users ? [...shares.users] : [];
            this.groups = shares?.groups ? [...shares.groups] : [];
            this.loading = false;
            this.calcAddableUsers();
            this.calcAddableGroups();
        });
        this.permissionsService.getSharableUsers().subscribe(res => {
            this.allUsers = res || [];
            this.calcAddableUsers();
        });
        this.authorizationService.loadAllGroups().subscribe(groups => {
            this.allGroupPaths = Array.isArray(groups) ? groups.map((g: { path: any }) => g.path) : [];
            this.calcAddableGroups();
        });
    }

    /** Display name for an already-shared user id; falls back to the id itself if it fell out of the sharable list. */
    userName(id: string): string {
        return this.allUsers.find(u => u.id === id)?.username || id;
    }

    calcAddableUsers(): void {
        this.addableUsers = this.allUsers.filter(u => !this.users.includes(u.id));
        if (this.addableUsers.length === 0) {
            this.userFormControl.disable();
        } else {
            this.userFormControl.enable();
        }
    }

    calcAddableGroups(): void {
        this.addableGroups = this.allGroupPaths.filter(p => !this.groups.includes(p));
        if (this.addableGroups.length === 0) {
            this.groupFormControl.disable();
        } else {
            this.groupFormControl.enable();
        }
    }

    addUser(): void {
        if (!this.userFormControl.value) {
            return;
        }
        this.users.push(this.userFormControl.value);
        this.userFormControl.setValue('');
        this.calcAddableUsers();
    }

    removeUser(id: string): void {
        this.users = this.users.filter(u => u !== id);
        this.calcAddableUsers();
    }

    addGroup(): void {
        if (!this.groupFormControl.value) {
            return;
        }
        this.groups.push(this.groupFormControl.value);
        this.groupFormControl.setValue('');
        this.calcAddableGroups();
    }

    removeGroup(path: string): void {
        this.groups = this.groups.filter(g => g !== path);
        this.calcAddableGroups();
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.saving = true;
        this.errorMessage = '';
        this.deviceErrors = [];
        const shares: EnvironmentShares = { users: this.users, groups: this.groups };
        this.environmentsService.setShares(this.data.id, shares).subscribe(result => {
            this.saving = false;
            if (isSharesFailure(result)) {
                this.deviceErrors = result.devices;
                return;
            }
            if (isApiError(result)) {
                this.errorMessage = result.message;
                return;
            }
            const count = result.devices ?? 0;
            this.snackBar.open('Applied to ' + count + ' device' + (count === 1 ? '' : 's') + '.', undefined, { duration: 2000 });
            this.dialogRef.close(result);
        });
    }
}
