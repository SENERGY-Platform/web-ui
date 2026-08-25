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
 * limitations under the License.
 */

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ENVIRONMENT_TYPES, Environment, EnvironmentType, defaultZoneTypeFor, environmentTypeLabel } from '../shared/environments.model';

@Component({
    selector: 'senergy-environments-create-dialog',
    templateUrl: './environments-create-dialog.component.html',
    styleUrls: ['./environments-create-dialog.component.css'],
})
export class EnvironmentsCreateDialogComponent {
    name = '';
    type: EnvironmentType | null = null;
    types = ENVIRONMENT_TYPES;
    environmentTypeLabel = environmentTypeLabel;

    constructor(private dialogRef: MatDialogRef<EnvironmentsCreateDialogComponent>) {}

    cancel(): void {
        this.dialogRef.close();
    }

    create(): void {
        if (!this.name || !this.type) {
            return;
        }
        // The api refuses an environment without a zone, and a create dialog
        // that cannot create is worse than one that asks for more. The starter
        // zone is what the user renames first, so it carries a plain name.
        const env: Environment = {
            name: this.name,
            type: this.type,
            zones: [{ name: 'New zone', type: defaultZoneTypeFor(this.type) }],
        };
        this.dialogRef.close(env);
    }
}
