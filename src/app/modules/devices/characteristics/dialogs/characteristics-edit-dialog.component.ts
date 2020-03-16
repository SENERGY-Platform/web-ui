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
import {ConceptsService} from '../../concepts/shared/concepts.service';
import {jsonValidator} from '../../../../core/validators/json.validator';
import {CharacteristicsPermSearchModel} from '../shared/characteristics-perm-search.model';
import {CharacteristicsService} from '../shared/characteristics.service';
import {ConceptsPermSearchModel} from '../../concepts/shared/concepts-perm-search.model';

@Component({
    templateUrl: './characteristics-edit-dialog.component.html',
    styleUrls: ['./characteristics-edit-dialog.component.css']
})
export class CharacteristicsEditDialogComponent implements OnInit {

    conceptControl = new FormControl({value: '', disabled: true}, [Validators.required]);
    characteristicControl = new FormControl('', [Validators.required, jsonValidator(false)]);
    characteristics!: CharacteristicsPermSearchModel;
    concepts: ConceptsPermSearchModel[] = [];

    constructor(private conceptsService: ConceptsService,
                private characteristicsService: CharacteristicsService,
                private dialogRef: MatDialogRef<CharacteristicsEditDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: { characteristic: CharacteristicsPermSearchModel }) {
        this.characteristics = data.characteristic;
        this.conceptControl.setValue({id: this.characteristics.concept_id});
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts: ConceptsPermSearchModel[]) => {
            this.concepts = concepts;
        });
        this.characteristicsService.getCharacteristic(this.characteristics.id).subscribe((resp) => {
            this.characteristicControl.setValue(JSON.stringify(resp, null, 5));
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(JSON.parse(this.characteristicControl.value));
    }

    compare(a: any, b: any): boolean {
        return a.id === b.id;
    }

}
