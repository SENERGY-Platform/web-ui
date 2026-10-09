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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EnvironmentsService } from '../shared/environments.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsUserModel } from '../../permissions/shared/permissions-user.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { EnvironmentShares, isApiError, isSharesFailure, SharesDeviceError } from '../shared/environments.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatDivider } from '@angular/material/divider';
import { snackSuccess } from 'src/app/core/services/snack-bar-messages';

export interface ShareDialogData {
    id: string;
    name?: string;
}

/**
 * Edits an environment's device-sharing set (read+execute on its managed devices; per entry
 * optionally write on the graph). Saving sends the whole edited set including graph_writers, since
 * the PUT replaces it; a set that failed to load therefore blocks saving, which would withdraw every
 * share. A failed save keeps the dialog open so the user can fix it or just retry, since a repeated
 * PUT is safe.
 */
@Component({
    selector: 'senergy-environments-share-dialog',
    templateUrl: './environments-share-dialog.component.html',
    styleUrls: ['./environments-share-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, SpinnerComponent, MatIcon, MatButton, MatCheckbox, MatIconButton, MatTooltip, FormsModule, MatFormField, MatLabel, MtxSelect, ReactiveFormsModule, MatDivider, MatDialogActions]
})
export class EnvironmentsShareDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<EnvironmentsShareDialogComponent>>(MatDialogRef);
    private environmentsService = inject(EnvironmentsService);
    private permissionsService = inject(PermissionsService);
    private authorizationService = inject(AuthorizationService);
    private snackBar = inject(MatSnackBar);
    data = inject<ShareDialogData>(MAT_DIALOG_DATA);

    userFormControl = new FormControl<string | null>('');
    groupFormControl = new FormControl<string | null>('');

    loading = true;
    loadFailed = false;
    saving = false;
    users: string[] = [];
    groups: string[] = [];
    /** The shared entries that also get write on the graph; always a subset of users/groups. */
    graphWriterUsers: string[] = [];
    graphWriterGroups: string[] = [];

    /** Every sharable user, for the picker and for resolving a shared id's display name. */
    allUsers: PermissionsUserModel[] = [];
    allGroupPaths: string[] = [];
    addableUsers: PermissionsUserModel[] = [];
    addableGroups: string[] = [];

    errorMessage = '';
    deviceErrors: SharesDeviceError[] = [];

    ngOnInit(): void {
        this.loadShares();
        this.permissionsService.getSharableUsers().subscribe(res => {
            this.allUsers = res || [];
            this.calcAddableUsers();
        });
        this.authorizationService.loadAllGroups().subscribe(groups => {
            this.allGroupPaths = Array.isArray(groups) ? groups.map((g: { path: any }) => g.path) : [];
            this.calcAddableGroups();
        });
    }

    /** A successful GET always carries a set, so null means the request failed. */
    loadShares(): void {
        this.loading = true;
        this.loadFailed = false;
        this.environmentsService.getShares(this.data.id).subscribe(shares => {
            this.loading = false;
            if (shares === null) {
                this.loadFailed = true;
                return;
            }
            this.users = shares.users ? [...shares.users] : [];
            this.groups = shares.groups ? [...shares.groups] : [];
            this.graphWriterUsers = shares.graph_writers?.users ? [...shares.graph_writers.users] : [];
            this.graphWriterGroups = shares.graph_writers?.groups ? [...shares.graph_writers.groups] : [];
            this.calcAddableUsers();
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
        this.graphWriterUsers = this.graphWriterUsers.filter(u => u !== id);
        this.calcAddableUsers();
    }

    isUserGraphWriter(id: string): boolean {
        return this.graphWriterUsers.includes(id);
    }

    setUserGraphWriter(id: string, writes: boolean): void {
        this.graphWriterUsers = this.graphWriterUsers.filter(u => u !== id);
        if (writes && this.users.includes(id)) {
            this.graphWriterUsers.push(id);
        }
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
        this.graphWriterGroups = this.graphWriterGroups.filter(g => g !== path);
        this.calcAddableGroups();
    }

    isGroupGraphWriter(path: string): boolean {
        return this.graphWriterGroups.includes(path);
    }

    setGroupGraphWriter(path: string, writes: boolean): void {
        this.graphWriterGroups = this.graphWriterGroups.filter(g => g !== path);
        if (writes && this.groups.includes(path)) {
            this.graphWriterGroups.push(path);
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.loadFailed) {
            return;
        }
        this.saving = true;
        this.errorMessage = '';
        this.deviceErrors = [];
        // the server refuses a graph writer that is not shared, so the subset is enforced here too
        const shares: EnvironmentShares = {
            users: this.users,
            groups: this.groups,
            graph_writers: {
                users: this.graphWriterUsers.filter(u => this.users.includes(u)),
                groups: this.graphWriterGroups.filter(g => this.groups.includes(g)),
            },
        };
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
            snackSuccess(this.snackBar, 'Applied to ' + count + ' device' + (count === 1 ? '' : 's') + '.');
            this.dialogRef.close(result);
        });
    }
}
