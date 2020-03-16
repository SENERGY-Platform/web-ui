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

import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';
import {ConceptsService} from '../../concepts/shared/concepts.service';
import {jsonValidator} from '../../../../core/validators/json.validator';
import {ConceptsPermSearchModel} from '../../concepts/shared/concepts-perm-search.model';

@Component({
    templateUrl: './characteristics-new-dialog.component.html',
    styleUrls: ['./characteristics-new-dialog.component.css']
})
export class CharacteristicsNewDialogComponent implements OnInit {

    conceptControl = new FormControl('', [Validators.required]);
    characteristicControl = new FormControl('', [Validators.required, jsonValidator(false)]);
    concepts: ConceptsPermSearchModel[] = [];

    constructor(private conceptsService: ConceptsService,
        private dialogRef: MatDialogRef<CharacteristicsNewDialogComponent>) {
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts: ConceptsPermSearchModel[]) => {
            this.concepts = concepts;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    create(): void {
        this.dialogRef.close({
            conceptId: this.conceptControl.value.id,
            characteristic: JSON.parse(this.characteristicControl.value)});
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

}
