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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    templateUrl: './input-dialog.component.html',
    styleUrls: ['./input-dialog.component.css'],
})
export class InputDialogComponent {
    fields: {[key: string]: string}
    title: string;
    required: string[];

    Object = Object;

    constructor(private dialogRef: MatDialogRef<InputDialogComponent>, @Inject(MAT_DIALOG_DATA) data: { title: string, fields: {[key: string]: string}, required: string[] | undefined | null}) {
        this.fields = data.fields;
        this.title = data.title;
        this.required = data.required || [];
    }

    isRequired(key: string): boolean {
        return this.required.includes(key);
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    ok(): void {
        this.dialogRef.close(this.fields);
    }
}
