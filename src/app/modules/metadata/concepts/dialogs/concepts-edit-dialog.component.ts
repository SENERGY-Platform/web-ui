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

import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {FormArray, FormControl, Validators} from '@angular/forms';
import {
    ConverterExtensionTryRequest,
    DeviceTypeCharacteristicsModel,
    DeviceTypeConceptModel
} from '../../device-types-overview/shared/device-type.model';
import { ConceptsService } from '../shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../shared/concepts-characteristics.model';
import {CharacteristicsService} from "../../characteristics/shared/characteristics.service";
import {CharacteristicsPermSearchModel} from "../../characteristics/shared/characteristics-perm-search.model";
import {forkJoin, Observable} from "rxjs";
import {map} from "rxjs/internal/operators";

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
    concept: DeviceTypeConceptModel|undefined;
    ready = false;

    testinput: string = "0"
    testformula: string = "x"
    testerr: string | null | undefined
    testoutput: string = ""

    constructor(
        private dialogRef: MatDialogRef<ConceptsEditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { conceptId: string },
        private conceptsService: ConceptsService,
        private characteristicsService: CharacteristicsService,
        private cd: ChangeDetectorRef,
    ) {
        this.conceptId = data.conceptId;
    }

    ngOnInit(): void {
        const obs: Observable<any>[] = [];
        obs.push(this.conceptsService.getConceptWithoutCharacteristics(this.conceptId).pipe(map((concept: DeviceTypeConceptModel | null) => {
            if (concept !== null) {
                this.concept = concept;
            }
        })));
        obs.push(this.characteristicsService.getCharacteristics('', 9999, 0, 'name', 'asc').pipe(map(characteristics => {
            this.characteristics = characteristics;
        })));
        forkJoin(obs).subscribe(() => {
            this.baseCharacteristicControl.setValue(this.concept?.base_characteristic_id);
            this.nameFormControl.setValue(this.concept?.name);
            this.idFormControl.setValue(this.concept?.id);
            this.characteristicsControl.setValue(this.characteristics.filter(c => this.concept?.characteristic_ids.some(id => id === c.id)));
            this.baseCharacteristicControl.setValue(this.concept?.base_characteristic_id);
            this.ready = true;
            this.cd.detectChanges();
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    removeConversion(i: number) {
        if (this.concept) {
            if (!this.concept?.conversions) {
                this.concept.conversions = [];
            }
            this.concept.conversions.splice(i, 1);
        }
    }

    addConversion() {
        if (this.concept) {
            if (!this.concept?.conversions) {
                this.concept.conversions = [];
            }
            this.concept.conversions.push({from: "", to: "", distance: 1, formula: "", placeholder_name: "x"});
        }
    }

    tryFormula() {
        try{
            let input = JSON.parse(this.testinput);
            this.conceptsService.tryConverterExtension({
                input: input,
                extension: {
                    from: "",
                    to: "",
                    formula: this.testformula,
                    distance: 0,
                    placeholder_name: "x"
                }
            }).subscribe(value => {
                if(!value) {
                    this.testerr = "error on try call";
                } else {
                    this.testerr = value?.error;
                    this.testoutput = JSON.stringify(value?.output);
                }
            })
        } catch (e) {
            this.testerr = e.toString();
        }
    }

    save(): void {
        const returnConcept: DeviceTypeConceptModel = {
            id: this.idFormControl.value,
            name: this.nameFormControl.value,
            base_characteristic_id: this.baseCharacteristicControl.value,
            characteristic_ids: (this.characteristicsControl.value as CharacteristicsPermSearchModel[]).map(c => c.id),
            conversions: this.concept?.conversions
        };
        this.dialogRef.close(returnConcept);
    }

    compareIds(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.id === b.id;
    }
}
