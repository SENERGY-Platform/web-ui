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

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {FormControl, Validators} from '@angular/forms';
import {DeviceTypeConceptModel} from '../../device-types-overview/shared/device-type.model';

@Component({
    templateUrl: './concepts-edit-dialog.component.html',
    styleUrls: ['./concepts-edit-dialog.component.css']
})
export class ConceptsEditDialogComponent {

    concept: DeviceTypeConceptModel;
    formControl = new FormControl('', [Validators.required]);

    constructor(private dialogRef: MatDialogRef<ConceptsEditDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: { concept: DeviceTypeConceptModel}) {
        this.concept = data.concept;
        this.formControl.setValue(this.concept.name);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.concept.name = this.formControl.value;
        this.dialogRef.close(this.concept);
    }

}
