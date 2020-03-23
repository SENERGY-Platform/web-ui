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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';
import {DeviceTypeCharacteristicsModel, DeviceTypeConceptModel} from '../../device-types-overview/shared/device-type.model';
import {ConceptsService} from '../shared/concepts.service';
import {ConceptsCharacteristicsModel} from '../shared/concepts-characteristics.model';

@Component({
    templateUrl: './concepts-edit-dialog.component.html',
    styleUrls: ['./concepts-edit-dialog.component.css']
})
export class ConceptsEditDialogComponent implements OnInit {

    conceptId: string;
    nameFormControl = new FormControl('', [Validators.required]);
    idFormControl = new FormControl({value: '', disabled: true});
    baseCharacteristicControl = new FormControl('', [Validators.required]);
    concept!: ConceptsCharacteristicsModel;
    characteristics: DeviceTypeCharacteristicsModel[] = [];

    constructor(private dialogRef: MatDialogRef<ConceptsEditDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: { conceptId: string },
                private conceptsService: ConceptsService) {
        this.conceptId = data.conceptId;
    }

    ngOnInit(): void {
        this.conceptsService.getConceptWithCharacteristics(this.conceptId).subscribe((concept: ConceptsCharacteristicsModel | null) => {
            if (concept !== null) {
                this.concept = concept;
                this.characteristics = concept.characteristics;
                this.baseCharacteristicControl.setValue(this.concept.base_characteristic_id);
                this.nameFormControl.setValue(this.concept.name);
                this.idFormControl.setValue(this.concept.id);
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const returnConcept: DeviceTypeConceptModel = {
            id: this.concept.id,
            name: this.nameFormControl.value,
            base_characteristic_id: this.baseCharacteristicControl.value,
            characteristic_ids: this.fromObjectToIds(this.concept.characteristics)
        };
        this.dialogRef.close(returnConcept);
    }

    fromObjectToIds(characteristics: DeviceTypeCharacteristicsModel[]): string[] {
        const array: string[] = [];
        characteristics.forEach((characteristic: DeviceTypeCharacteristicsModel) => {
            array.push(characteristic.id);
        });
        return array;
    }

}
