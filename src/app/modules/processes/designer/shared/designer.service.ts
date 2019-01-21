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
import {BpmnParameter} from '../designer.model';

@Injectable({
    providedIn: 'root'
})
export class DesignerService {

    constructor(private dialog: MatDialog) {}

    openEdoitOutputDialog(outputs: BpmnParameter[], callback: () => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {outputs: outputs};
        const editDialogRef = this.dialog.open(EditOutputDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe(() => {
            callback();
        });
    }
}
