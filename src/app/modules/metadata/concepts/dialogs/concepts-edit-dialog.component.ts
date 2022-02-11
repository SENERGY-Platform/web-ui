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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { DeviceTypeCharacteristicsModel, DeviceTypeConceptModel } from '../../device-types-overview/shared/device-type.model';
import { ConceptsService } from '../shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../shared/concepts-characteristics.model';
import {CharacteristicsService} from "../../characteristics/shared/characteristics.service";
import {CharacteristicsPermSearchModel} from "../../characteristics/shared/characteristics-perm-search.model";

@Component({
    templateUrl: './concepts-edit-dialog.component.html',
    styleUrls: ['./concepts-edit-dialog.component.css'],
})
export class ConceptsEditDialogComponent implements OnInit {
    conceptId: string;
    nameFormControl = new FormControl('', [Validators.required]);
    idFormControl = new FormControl({ value: '', disabled: true });
    characteristicsControl = new FormControl('', [Validators.required]);
    baseCharacteristicControl = new FormControl('', [Validators.required]);
    characteristics: CharacteristicsPermSearchModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<ConceptsEditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { conceptId: string },
        private conceptsService: ConceptsService,
        private characteristicsService: CharacteristicsService,
    ) {
        this.conceptId = data.conceptId;
    }

    ngOnInit(): void {
        this.conceptsService.getConceptWithoutCharacteristics(this.conceptId).subscribe((concept: DeviceTypeConceptModel | null) => {
            if (concept !== null) {
                this.baseCharacteristicControl.setValue(concept.base_characteristic_id);
                this.nameFormControl.setValue(concept.name);
                this.idFormControl.setValue(concept.id);
            }
        });
        this.characteristicsService.getCharacteristics('', 9999, 0, 'name', 'asc').subscribe(characteristics => {
            this.characteristics = characteristics;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const returnConcept: DeviceTypeConceptModel = {
            id: this.idFormControl.value,
            name: this.nameFormControl.value,
            base_characteristic_id: this.baseCharacteristicControl.value,
            characteristic_ids: (this.characteristicsControl.value as CharacteristicsPermSearchModel[]).map(c => c.id),
        };
        this.dialogRef.close(returnConcept);
    }
}
