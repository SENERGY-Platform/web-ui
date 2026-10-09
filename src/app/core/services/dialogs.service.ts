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

import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent, DeleteDialogOptions, DeleteDialogResponse } from '../dialogs/delete-dialog.component';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';
import {InputDialogComponent} from '../dialogs/input-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class DialogsService {
    private dialog = inject(MatDialog);


    // Without options the dialog closes with a boolean, with options with a DeleteDialogResponse; undefined on Esc/backdrop.
    openDeleteDialog(text: string): MatDialogRef<DeleteDialogComponent, boolean>;
    openDeleteDialog(text: string, options: DeleteDialogOptions): MatDialogRef<DeleteDialogComponent, DeleteDialogResponse>;
    openDeleteDialog(text: string, options: DeleteDialogOptions | undefined): MatDialogRef<DeleteDialogComponent, boolean | DeleteDialogResponse>;
    openDeleteDialog(text: string, options?: DeleteDialogOptions): MatDialogRef<DeleteDialogComponent, boolean | DeleteDialogResponse> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            text,
            options,
        };

        return this.dialog.open(DeleteDialogComponent, dialogConfig);
    }

    openConfirmDialog(title: string, text: string): MatDialogRef<ConfirmDialogComponent, boolean> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            text,
            title,
        };

        return this.dialog.open(ConfirmDialogComponent, dialogConfig);
    }

    openInputDialog(title: string, fields: {[key: string]: string}, required: string[]): MatDialogRef<InputDialogComponent, {[key: string]: string} | null> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            title,
            fields,
            required
        };

        return this.dialog.open(InputDialogComponent, dialogConfig);
    }
}
