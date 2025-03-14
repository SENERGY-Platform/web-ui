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
import {FormBuilder, FormGroup, UntypedFormControl, Validators} from '@angular/forms';
import {ConceptsService} from '../../concepts/shared/concepts.service';
import { DeviceTypeConceptModel } from '../../device-types-overview/shared/device-type.model';
import {v4 as uuid} from 'uuid';

@Component({
    templateUrl: './functions-create-dialog.component.html',
    styleUrls: ['./functions-create-dialog.component.css'],
})
export class FunctionsCreateDialogComponent implements OnInit {
    optionsFormControl = new UntypedFormControl('Controlling');
    functionFormGroup!: FormGroup;

    concepts: DeviceTypeConceptModel[] = [];

    constructor(
        private conceptsService: ConceptsService,
        private dialogRef: MatDialogRef<FunctionsCreateDialogComponent>,
        private _formBuilder: FormBuilder,
    ) {
        this.initFunctionFormGroup();
        this.optionListener();
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe(concepts => {
            this.concepts = concepts.result;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.functionFormGroup.getRawValue());
    }

    compare(a: any, b: any): boolean {
        return a.id === b.id;
    }

    private optionListener(): void {
        this.generateUuid(this.optionsFormControl.value);
        this.optionsFormControl.valueChanges.subscribe((option) => {
            this.generateUuid(option as string);
        });
    }

    private initFunctionFormGroup(): void {
        this.functionFormGroup = this._formBuilder.group({
            id: [{ value: '', disabled: true }],
            name: ['', Validators.required],
            display_name: '',
            description: '',
            concept_id: '',
        });
    }

    private generateUuid(option: string): void {
        if (option === 'Controlling') {
            this.functionFormGroup.patchValue({ id: 'urn:infai:ses:controlling-function:' + uuid() });
        }
        if (option === 'Measuring') {
            this.functionFormGroup.patchValue({ id: 'urn:infai:ses:measuring-function:' + uuid() });
        }
    }
}
