/*
 * Copyright 2019 InfAI (CC SES)
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
import {MatDialog, MatDialogConfig} from '@angular/material';
import {EditOutputDialogComponent} from '../dialogs/edit-output-dialog/edit-output-dialog.component';
import {BpmnElement, BpmnParameter} from '../designer.model';
import {EditInputDialogComponent} from '../dialogs/edit-input-dialog/edit-input-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DesignerDialogService {

    constructor(private dialog: MatDialog) {}

    openEditOutputDialog(outputs: BpmnParameter[], callback: () => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {outputs: outputs};
        const editDialogRef = this.dialog.open(EditOutputDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe(() => {
            callback();
        });
    }

    openEditInputDialog(inputElement: BpmnElement, callback: () => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = false;
        dialogConfig.data = {inputElement: inputElement};
        const editDialogRef = this.dialog.open(EditInputDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe(() => {
            callback();
        });
    }
}
