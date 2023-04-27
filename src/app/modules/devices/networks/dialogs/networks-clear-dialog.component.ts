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

import { Component } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
    templateUrl: './networks-clear-dialog.component.html',
    styleUrls: ['./networks-clear-dialog.component.css'],
})
export class NetworksClearDialogComponent {
    constructor(private dialogRef: MatDialogRef<NetworksClearDialogComponent>) {}

    close(): void {
        this.dialogRef.close(false);
    }

    clear(): void {
        this.dialogRef.close(true);
    }
}
