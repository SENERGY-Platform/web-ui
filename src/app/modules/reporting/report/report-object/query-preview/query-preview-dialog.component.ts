/*
 * Copyright 2024 InfAI (CC SES)
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

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
    selector: 'senergy-reporting-query-preview-dialog',
    templateUrl: './query-preview-dialog.component.html',
    styleUrls: ['./query-preview-dialog.component.css'],
})
export class QueryPreviewDialogComponent  {

    constructor(@Inject(MAT_DIALOG_DATA) public queryPreview: {dataString: string; dataCount: number},
                private dialogRef: MatDialogRef<QueryPreviewDialogComponent>) {
    }

    onCloseClick(): void {
        this.dialogRef.close();
    }
}