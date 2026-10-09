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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { PermissionsUserModel } from '../../shared/permissions-user.model';
import { PermissionsService } from '../../shared/permissions.service';
import { PermissionsV2ResourceBaseModel } from '../../shared/permissions-resource.model';
import { PermissionTypes, TableComponent } from './table/table.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export interface PermissionDialogComponentData {
    name: string;
    permissions: PermissionsV2ResourceBaseModel;
    kind?: string;
    hint?: string;
}


@Component({
    templateUrl: './permission-dialog.component.html',
    styleUrls: ['./permission-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, TableComponent, MatDivider, FormsModule, MatFormField, MatLabel, MtxSelect, ReactiveFormsModule, MatError, MatErrorMessagesDirective, MatIconButton, MatIcon, MatDialogActions, MatButton]
})
export class PermissionDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<PermissionDialogComponent>>(MatDialogRef);
    private authorizationService = inject(AuthorizationService);
    private permissionsService = inject(PermissionsService);

    @ViewChild('userTable', { static: false }) userTable?: TableComponent;
    @ViewChild('groupTable', { static: false }) groupTable?: TableComponent;
    @ViewChild('roleTable', { static: false }) roleTable?: TableComponent;


    userFormControl = new FormControl<string | null>('');
    groupFormControl = new FormControl<string | null>('');
    roleFormControl = new FormControl<string | null>('');
    name: string;
    hint?: string;
    userId: null | string = null;
    permissions: PermissionsV2ResourceBaseModel;
    users: PermissionsUserModel[] = [];
    groups: string[] = [];
    roles: string[] = [];
    isAdmin: boolean = false;
    permissionTypes = PermissionTypes;

    adddableUsers: PermissionsUserModel[] = [];
    adddableGroups: string[] = [];
    adddableRoles: string[] = [];

    descriptions = {
        read: 'read resource information',
        write: 'write resource information',
        execute: 'use resource information',
        administrate: 'delete resource, change permissions'
    };

    constructor() {
        const data = inject<PermissionDialogComponentData>(MAT_DIALOG_DATA);

        this.name = data.name;
        this.hint = data.hint;
        this.permissions = data.permissions;
        switch (data.kind) {
            case 'devices':
                this.descriptions = {
                    read: 'read device metadata',
                    write: 'write device metadata',
                    execute: 'use device, read sensor-data',
                    administrate: 'delete device, change permissions'
                };
                break;
            case 'processmodel':
                break;
            case 'hubs':
                break;
            case 'locations':
                break;
            case 'smart_service_releases':
                break;
        }
    }

    ngOnInit() {
        this.getUserId();
        this.isAdmin = this.authorizationService.userIsAdmin();
        if (this.isAdmin) {
            this.authorizationService.loadAllGroups().subscribe(groups => {
                this.groups = groups.map((g: { path: any; }) => g.path);
                this.calcAdddableGroups();
                setTimeout(() => this.groupTable?.render(), 0);
            });
            this.authorizationService.loadAllUsers().subscribe(users => {
                this.users = users;
                this.calcCdddableUsers();
                setTimeout(() => this.userTable?.render(), 0);
            });
            this.authorizationService.loadAllRoles().subscribe(roles => {
                this.roles = roles.map((r: any) => r.name);
                this.calcAdddableRoles();
                setTimeout(() => this.roleTable?.render(), 0);
            });
        } else {
            this.groups = this.authorizationService.getUsersGroups();
            this.calcAdddableGroups();
            setTimeout(() => this.groupTable?.render(), 0);

            this.permissionsService.getSharableUsers().subscribe(res => {
                this.users = res || [];
                this.users.push({
                    id: this.userId || '',
                    username: this.authorizationService.getUserName(),
                });
                this.calcCdddableUsers();
                setTimeout(() => this.userTable?.render(), 0);
            });
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.permissions);
    }

    private getUserId(): void {
        this.userId = this.authorizationService.getUserId() as string;
    }

    calcCdddableUsers() {
        const keys = Object.keys(this.permissions.user_permissions);
        const u = this.users.filter(u2 => keys.findIndex(k => k === u2.id) === -1);
        if (u.length === 0) {
            this.userFormControl.disable();
        } else {
            this.userFormControl.enable();
        }
        this.adddableUsers = u;
    }

    calcAdddableGroups() {
        const keys = Object.keys(this.permissions.group_permissions);
        const u = this.groups.filter(u2 => keys.findIndex(k => k === u2) === -1);
        if (u.length === 0) {
            this.groupFormControl.disable();
        } else {
            this.groupFormControl.enable();
        }
        this.adddableGroups = u;
    }

    calcAdddableRoles() {
        const keys = Object.keys(this.permissions.role_permissions);
        const u = this.roles.filter(u2 => keys.findIndex(k => k === u2) === -1);
        if (u.length === 0) {
            this.roleFormControl.disable();
        } else {
            this.roleFormControl.enable();
        }
        this.adddableRoles = u;
    }

    addUser() {
        if (this.userFormControl.value === '') {
            return;
        }

        this.permissions.user_permissions[this.userFormControl.value as string] = {
            administrate: false,
            execute: false,
            write: false,
            read: false,
        };
        this.userFormControl.setValue('');
        this.userFormControl.updateValueAndValidity();
        this.calcCdddableUsers();
        this.userTable?.render();
    }

    addGroup() {
        if (this.groupFormControl.value === '') {
            return;
        }
        this.permissions.group_permissions[this.groupFormControl.value as string] = {
            administrate: false,
            execute: false,
            write: false,
            read: false,
        };
        this.groupFormControl.setValue('');
        this.groupFormControl.updateValueAndValidity();
        this.calcAdddableGroups();
        this.groupTable?.render();
    }

    addRole() {
        if (this.roleFormControl.value === '') {
            return;
        }
        this.permissions.role_permissions[this.roleFormControl.value as string] = {
            administrate: false,
            execute: false,
            write: false,
            read: false,
        };
        this.roleFormControl.setValue('');
        this.roleFormControl.updateValueAndValidity();
        this.calcAdddableRoles();
        this.roleTable?.render();
    }

    showDividerBeforeGroupTable(): boolean {
        return Object.keys(this.permissions.user_permissions).length > 0;
    }

    showDividerBeforeRoleTable(): boolean {
        return this.isAdmin && Object.keys(this.permissions.group_permissions).length > 0;
    }
}
