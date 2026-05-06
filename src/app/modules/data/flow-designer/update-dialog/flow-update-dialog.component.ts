/*
 * Copyright 2026 InfAI (CC SES)
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
 *  limitations under the License.
 */

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CellModel} from '../../diagram-editor/shared/diagram.model';

export interface DialogData {
    oldOperator: CellModel;
    newOperator: CellModel;
}

@Component({
    selector: 'flow-update-dialog',
    templateUrl: './flow-update-dialog.component.html',
    styleUrls: ['./flow-update-dialog.component.css'],
})
export class FlowUpdateDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<FlowUpdateDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

    areEqual(key: keyof CellModel): boolean {
        const oldValue = this.data.oldOperator[key];
        const newValue = this.data.newOperator[key];

        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            return JSON.stringify(oldValue) === JSON.stringify(newValue);
        }
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            return JSON.stringify(oldValue) === JSON.stringify(newValue);
        }
        return oldValue === newValue;
    }

    onClick(): void {
        this.dialogRef.close();
    }

}