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
import {PermissionsV2ResourceBaseModel, PermissionsV2ResourceModel} from './permissions-resource.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PermissionDialogComponent, PermissionDialogComponentData } from '../dialogs/permission/permission-dialog.component';
import { PermissionsService } from './permissions.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Observable, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class PermissionsDialogService {
    constructor(
        private dialog: MatDialog,
        private permissionsService: PermissionsService,
        public snackBar: MatSnackBar,
    ) {}

    openPermissionV2Dialog(topicID: string, ressourceID: string, name: string) {
        this.permissionsService.getResourcePermissionsV2(topicID, ressourceID).subscribe((permissionsModel: PermissionsV2ResourceModel) => {
            this.openPermV2Dialog(name, permissionsModel, topicID, ressourceID);
        });
    }

    // collects permissions once and adds them to every given resource. the dialog starts out empty,
    // because the resources may have differing permissions and only the additions are shared.
    // the caller has to subscribe for anything to happen.
    openPermissionV2BulkDialog(topicID: string, ressourceIDs: string[], name: string, hint?: string): Observable<boolean> {
        if (ressourceIDs.length === 0) {
            return of(false);
        }
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            name,
            permissions: {
                user_permissions: {},
                group_permissions: {},
                role_permissions: {},
            } as PermissionsV2ResourceBaseModel,
            hint: hint || 'The permissions are added to the permissions the selected resources already have.',
        } as PermissionDialogComponentData;
        const editDialogRef = this.dialog.open(PermissionDialogComponent, dialogConfig);

        return editDialogRef.afterClosed().pipe(
            concatMap((permissionsOut: PermissionsV2ResourceBaseModel | undefined) => {
                if (permissionsOut === undefined) {
                    return of(false);
                }
                return this.addPermV2DialogChanges(permissionsOut, topicID, ressourceIDs);
            }),
        );
    }

    private openPermV2Dialog(name: string, permissionsIn: PermissionsV2ResourceBaseModel, topicID: string, ressourceID: string) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            name,
            permissions: permissionsIn,
            topicID
        } as PermissionDialogComponentData;
        const editDialogRef = this.dialog.open(PermissionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((permissionsOut: PermissionsV2ResourceBaseModel) => {
            if (permissionsOut !== undefined) {
                this.savePermV2DialogChanges(permissionsOut, topicID, ressourceID);
            }
        });
    }

    private addPermV2DialogChanges(request: PermissionsV2ResourceBaseModel, topicID: string, ressourceIDs: string[]): Observable<boolean> {
        return forkJoin(ressourceIDs.map(id => this.permissionsService.addResourcePermissionsV2(topicID, id, request))).pipe(
            map((results: boolean[]) => {
                const failed = results.filter(ok => !ok).length;
                if (failed === 0) {
                    this.snackBar.open('Permissions saved successfully.', '', { duration: 2000 });
                } else {
                    this.snackBar.open(
                        'Error while saving permissions of ' + failed + ' of ' + results.length + '!',
                        'close',
                        { panelClass: 'snack-bar-error' },
                    );
                }
                return failed === 0;
            }),
        );
    }

    private savePermV2DialogChanges(request: PermissionsV2ResourceBaseModel, topicID: string, ressourceID: string): void {
        this.permissionsService.setResourcePermissionsV2(topicID, ressourceID, request).subscribe(value => {
            if(value) {
                this.snackBar.open('Permission saved successfully.', '', { duration: 2000 });
            } else {
                this.snackBar.open('Error while saving permission!', 'close', { panelClass: 'snack-bar-error' });
            }
        });
    }
}
