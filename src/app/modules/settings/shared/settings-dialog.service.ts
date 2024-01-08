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
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { SettingsChangeDialogComponent } from '../dialogs/settings-change-dialog.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AllowedMethods, PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import { Observable } from 'rxjs';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import {environment} from '../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SettingsDialogService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private dialog: MatDialog,
        public snackBar: MatSnackBar,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.usersServiceUrl);
    }

    openSettingsDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        // dialogConfig.data = {
        //     name: name,
        //     permissions: permissionsIn,
        // };
        const editDialogRef = this.dialog.open(SettingsChangeDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe(() => {});
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }
}
