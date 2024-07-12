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

import { Injectable } from '@angular/core';
import { forkJoin, Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import {PermissionsResourceBaseModel, PermissionsResourceModel, PermissionsV2ResourceBaseModel, PermissionsV2ResourceModel} from './permissions-resource.model';
import { PermissionsUserModel } from './permissions-user.model';
import { PermissionsRightsModel } from './permissions-rights.model';
import { PermissionsEditModel } from './permissions-edit.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PermissionDialogComponent } from '../dialogs/permission/permission-dialog.component';
import { PermissionsService } from './permissions.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root',
})
export class PermissionsDialogService {
    constructor(
        private errorHandlerService: ErrorHandlerService,
        private dialog: MatDialog,
        private permissionsService: PermissionsService,
        public snackBar: MatSnackBar,
    ) {}

    //key is the kafka key this permission command will be published to. is optional
    openPermissionDialog(kind: string, id: string, name: string, key?: string): void {
        this.permissionsService.getResourcePermissions(kind, id).subscribe((permissionsModel: PermissionsResourceModel) => {
            const permissionsIn = this.foo(permissionsModel.user_rights, permissionsModel.group_rights);
            this.addUserNames(permissionsIn).subscribe({
                next: (permissionsWithNames) => {
                    this.openPermDialog(name, permissionsWithNames, kind, id, key);
                }
            });
        });
    }

    private addUserNames(permissionsIn: PermissionsEditModel[]) {
        const noUserPermissionsExists = permissionsIn.filter((x) => x.isRole !== true).length === 0;

        if(noUserPermissionsExists) {
            return of(permissionsIn);
        }
        return this.getUserNames(permissionsIn.filter((x) => x.isRole !== true)).pipe(
            map((users: PermissionsUserModel[]) => {
                users.forEach((user: PermissionsUserModel, index: number) => {
                    permissionsIn[index].userName = user.username;
                });
                return permissionsIn;
            })
        );
    }

    openPermissionV2Dialog(topicID: string, ressourceID: string, name: string) {
        this.permissionsService.getResourcePermissionsV2(topicID, ressourceID).subscribe((permissionsModel: PermissionsV2ResourceModel) => {
            const permissionsIn = this.foo(permissionsModel.user_permissions, permissionsModel.group_permissions);
            this.addUserNames(permissionsIn).subscribe({
                next: (permissionsWithNames) => {
                    this.openPermV2Dialog(name, permissionsWithNames, topicID, ressourceID);
                }
            });
        });
    }

    private foo(userPermissions: Record<string, PermissionsRightsModel>, groupPermissions: Record<string, PermissionsRightsModel>) {
        const permissionsIn: PermissionsEditModel[] = [];
        Object.entries(userPermissions).forEach((resp: (string | PermissionsRightsModel)[]) => {
            permissionsIn.push({
                userId: resp[0] as string,
                userName: '',
                userRights: resp[1] as PermissionsRightsModel,
            });
        });

        Object.entries(groupPermissions).forEach((resp: (string | PermissionsRightsModel)[]) => {
            const role = resp[0] as string;
            permissionsIn.push({
                userId: '',
                userName: role,
                userRights: resp[1] as PermissionsRightsModel,
                isRole: true,
            });
        });
        return permissionsIn;
    }

    private openPermDialog(name: string, permissionsIn: PermissionsEditModel[], kind: string, id: string, key?: string) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            name,
            permissions: permissionsIn,
            kind
        };
        const editDialogRef = this.dialog.open(PermissionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((permissionsOut: PermissionsEditModel[]) => {
            if (permissionsOut !== undefined) {
                this.savePermDialogChanges(permissionsOut, kind, id, key);
            }
        });
    }

    private openPermV2Dialog(name: string, permissionsIn: PermissionsEditModel[], topicID: string, ressourceID: string) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            name,
            permissions: permissionsIn,
            topicID
        };
        const editDialogRef = this.dialog.open(PermissionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((permissionsOut: PermissionsEditModel[]) => {
            if (permissionsOut !== undefined) {
                this.savePermV2DialogChanges(permissionsOut, topicID, ressourceID);
            }
        });
    }

    private getUserNames(permissions: PermissionsEditModel[]): Observable<PermissionsUserModel[]> {
        const array: Observable<PermissionsUserModel>[] = [];

        permissions.forEach((permission: PermissionsEditModel) => {
            array.push(this.permissionsService.getUserById(permission.userId));
        });

        return forkJoin(array).pipe(catchError(this.errorHandlerService.handleError(PermissionsDialogService.name, 'getUserNames', [])));
    }

    private savePermDialogChanges(permissions: PermissionsEditModel[], kind: string, id: string, key?: string): void {
        const request: PermissionsResourceBaseModel = {
            group_rights: {},
            user_rights: {}
        };
        permissions.forEach((permission: PermissionsEditModel) => {
            if (permission.isRole === true) {
                request.group_rights[permission.userName] = permission.userRights;
            } else {
                request.user_rights[permission.userId] = permission.userRights;
            }
        });

        this.permissionsService.setResourcePermissions(kind, id, request, key).subscribe(value => {
            if(value) {
                this.snackBar.open('Permission saved successfully.', '', { duration: 2000 });
            } else {
                this.snackBar.open('Error while saving permission!', 'close', { panelClass: 'snack-bar-error' });
            }
        });
    }

    private savePermV2DialogChanges(permissions: PermissionsEditModel[], topicID: string, ressourceID: string): void {
        const request: PermissionsV2ResourceBaseModel = {
            group_permissions: {},
            user_permissions: {}
        };
        permissions.forEach((permission: PermissionsEditModel) => {
            if (permission.isRole === true) {
                request.group_permissions[permission.userName] = permission.userRights;
            } else {
                request.user_permissions[permission.userId] = permission.userRights;
            }
        });

        this.permissionsService.setResourcePermissionsV2(topicID, ressourceID, request).subscribe(value => {
            if(value) {
                this.snackBar.open('Permission saved successfully.', '', { duration: 2000 });
            } else {
                this.snackBar.open('Error while saving permission!', 'close', { panelClass: 'snack-bar-error' });
            }
        });
    }
}
