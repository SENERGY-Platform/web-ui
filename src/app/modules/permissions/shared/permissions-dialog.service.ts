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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {catchError} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {PermissionsResourceModel} from './permissions-resource.model';
import {PermissionsUserModel} from './permissions-user.model';
import {PermissionsRightsModel} from './permissions-rights.model';
import {PermissionsEditModel} from './permissions-edit.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {PermissionDialogComponent} from '../dialogs/permission/permission-dialog.component';
import {PermissionsService} from './permissions.service';
import {PermissionsResponseModel} from './permissions-response.model';
import {MatSnackBar} from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root'
})
export class PermissionsDialogService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog,
                private permissionsService: PermissionsService,
                public snackBar: MatSnackBar) {
    }

    openPermissionDialog(kind: string, id: string, name: string): void {

        const permissionsIn: PermissionsEditModel[] = [];

        this.permissionsService.getResourcePermissions(kind, id).subscribe((permissionsModel: PermissionsResourceModel) => {
            Object.entries(permissionsModel.user_rights).forEach((resp: (string | PermissionsRightsModel)[]) => {
                permissionsIn.push({userId: <string>resp[0], userName: '', userRights: <PermissionsRightsModel>resp[1]});
            });

            this.getUserNames(permissionsIn).subscribe((users: PermissionsUserModel[]) => {
                users.forEach((user: PermissionsUserModel, index: number) => {
                    permissionsIn[index].userName = user.username;
                });
                this.openPermDialog(name, permissionsIn, kind, id);
            });
        });
    }

    private openPermDialog(name: string, permissionsIn: PermissionsEditModel[], kind: string, id: string) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            name: name,
            permissions: permissionsIn,
        };
        const editDialogRef = this.dialog.open(PermissionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((permissionsOut: PermissionsEditModel[]) => {
            if (permissionsOut !== undefined) {
                this.savePermDialogChanges(permissionsOut, kind, id);
            }
        });
    }

    private getUserNames(permissions: PermissionsEditModel[]): Observable<PermissionsUserModel[]> {

        const array: Observable<PermissionsUserModel>[] = [];

        permissions.forEach((permission: PermissionsEditModel) => {
            array.push(this.permissionsService.getUserById(permission.userId));
        });

        return forkJoin(array).pipe(
            catchError(this.errorHandlerService.handleError(PermissionsDialogService.name, 'getUserNames', []))
        );
    }

    private savePermDialogChanges(permissions: PermissionsEditModel[], kind: string, id: string): void {
        const array: Observable<any>[] = [];
        permissions.forEach((permission: PermissionsEditModel) => {
            if (permission.deleted) {
                array.push(this.permissionsService.removeUserRight(permission.userId, kind, id));
            } else {
                array.push(this.permissionsService.setUserRight(permission.userId, kind, id, permission.userRights));
            }
        });

        forkJoin(array).subscribe((responses: PermissionsResponseModel[]) => {
            const countOk = responses.filter((response: PermissionsResponseModel) => {
                return response.status === 'ok';
            }).length;

            if (countOk === responses.length) {
                this.snackBar.open('Permission saved successfully.', '', {duration: 2000});
            } else {
                this.snackBar.open('Error while saving permission!', '', {duration: 2000});
            }
        });
    }
}
