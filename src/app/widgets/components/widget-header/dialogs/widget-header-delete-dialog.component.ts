/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';


@Component({
    templateUrl: './widget-header-delete-dialog.component.html',
    styleUrls: ['./widget-header-delete-dialog.component.css']
})
export class WidgetHeaderDeleteDialogComponent {

    constructor(private dialogRef: MatDialogRef<WidgetHeaderDeleteDialogComponent>) {

    }

    cancel(): void {
        this.dialogRef.close();
    }

    delete(): void {
        this.dialogRef.close(true);
    }
}
