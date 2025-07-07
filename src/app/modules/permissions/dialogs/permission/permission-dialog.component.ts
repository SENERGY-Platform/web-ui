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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import { UntypedFormControl } from '@angular/forms';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { PermissionsUserModel } from '../../shared/permissions-user.model';
import { PermissionsService } from '../../shared/permissions.service';
import { PermissionsV2ResourceBaseModel } from '../../shared/permissions-resource.model';
import { PermissionTypes, TableComponent } from './table/table.component';

export interface PermissionDialogComponentData {
    name: string;
    permissions: PermissionsV2ResourceBaseModel;
    kind?: string;
}


@Component({
    templateUrl: './permission-dialog.component.html',
    styleUrls: ['./permission-dialog.component.css'],
})
export class PermissionDialogComponent implements OnInit {
    @ViewChild('userTable', { static: false }) userTable?: TableComponent;
    @ViewChild('groupTable', { static: false }) groupTable?: TableComponent;
    @ViewChild('roleTable', { static: false }) roleTable?: TableComponent;


    userFormControl = new UntypedFormControl('');
    groupFormControl = new UntypedFormControl('');
    roleFormControl = new UntypedFormControl('');
    name: string;
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

    constructor(
        private dialogRef: MatDialogRef<PermissionDialogComponent>,
        private authorizationService: AuthorizationService,
        private permissionsService: PermissionsService,
        @Inject(MAT_DIALOG_DATA)
        data: PermissionDialogComponentData,
    ) {
        this.name = data.name;
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
                this.authorizationService.getUserName().then(username => {
                    this.users.push({
                        id: this.userId || '',
                        username: username,

                    });
                    this.calcCdddableUsers();
                    setTimeout(() => this.userTable?.render(), 0);
                });
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

        this.permissions.user_permissions[this.userFormControl.value] = {
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
        this.permissions.group_permissions[this.groupFormControl.value] = {
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
        this.permissions.role_permissions[this.roleFormControl.value] = {
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
