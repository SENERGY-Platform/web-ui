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
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../dialogs/delete-dialog.component';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class DialogsService {
    constructor(private dialog: MatDialog) {}

    openDeleteDialog(text: string): MatDialogRef<DeleteDialogComponent> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            text,
        };

        return this.dialog.open(DeleteDialogComponent, dialogConfig);
    }

    openConfirmDialog(title: string, text: string): MatDialogRef<ConfirmDialogComponent> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            text,
            title,
        };

        return this.dialog.open(ConfirmDialogComponent, dialogConfig);
    }
}
