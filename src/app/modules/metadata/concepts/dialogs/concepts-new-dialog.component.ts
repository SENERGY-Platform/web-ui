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

import {Component} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {DeviceTypeConceptModel} from '../../device-types-overview/shared/device-type.model';
import {UntypedFormControl, Validators} from '@angular/forms';

@Component({
    templateUrl: './concepts-new-dialog.component.html',
    styleUrls: ['./concepts-new-dialog.component.css'],
})
export class ConceptsNewDialogComponent {
    nameControl = new UntypedFormControl('', [Validators.required]);

    constructor(private dialogRef: MatDialogRef<ConceptsNewDialogComponent>) {}

    close(): void {
        this.dialogRef.close();
    }

    create(): void {
        const concept: DeviceTypeConceptModel = {
            id: '',
            name: this.nameControl.value,
            base_characteristic_id: '',
            characteristic_ids: [],
        };
        this.dialogRef.close(concept);
    }
}
