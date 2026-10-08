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

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TitleCasePipe } from '@angular/common';

@Component({
    templateUrl: './input-dialog.component.html',
    styleUrls: ['./input-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, FormsModule, MatDialogActions, MatButton, TitleCasePipe]
})
export class InputDialogComponent {
    fields: {[key: string]: string};
    title: string;
    required: string[];

    Object = Object;

    constructor(private dialogRef: MatDialogRef<InputDialogComponent>, @Inject(MAT_DIALOG_DATA) data: { title: string; fields: {[key: string]: string}; required: string[] | undefined | null}) {
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
