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
import {PermissionsResourceBaseModel, PermissionsResourceModel, PermissionsV2ResourceBaseModel, PermissionsV2ResourceModel} from './permissions-resource.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PermissionDialogComponent, PermissionDialogComponentData } from '../dialogs/permission/permission-dialog.component';
import { PermissionsService } from './permissions.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';

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
            this.openPermDialog(name, permissionsModel, kind, id, key);
        });
    }

    openPermissionV2Dialog(topicID: string, ressourceID: string, name: string) {
        this.permissionsService.getResourcePermissionsV2(topicID, ressourceID).subscribe((permissionsModel: PermissionsV2ResourceModel) => {
            this.openPermV2Dialog(name, permissionsModel, topicID, ressourceID);
        });
    }

    private openPermDialog(_: string, __: PermissionsResourceBaseModel, ___: string, ____: string, _____?: string) {
        this.errorHandlerService.showErrorInSnackBar("Currently not supported");
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
