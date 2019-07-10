/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, OnInit} from '@angular/core';
import {MatDialogRef, MatSnackBar} from '@angular/material';
import {FormControl, Validators} from '@angular/forms';
import {jsonValidator} from '../../../../../core/validators/json.validator';

@Component({
    templateUrl: './device-types-new-function-dialog.component.html',
    styleUrls: ['./device-types-new-function-dialog.component.css']
})
export class DeviceTypesNewFunctionDialogComponent {

    nameControl = new FormControl('', [Validators.required]);
    variableRawControl = new FormControl('', [Validators.required, jsonValidator()]);

    constructor(private snackBar: MatSnackBar,
                private dialogRef: MatDialogRef<DeviceTypesNewFunctionDialogComponent>) {
    }

    close(): void {
        this.dialogRef.close();
    }

    save(label: string): void {
        this.dialogRef.close(label);
    }

}