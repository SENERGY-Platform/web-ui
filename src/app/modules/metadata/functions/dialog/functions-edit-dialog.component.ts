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
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { ConceptsPermSearchModel } from '../../concepts/shared/concepts-perm-search.model';
import { FunctionsPermSearchModel } from '../shared/functions-perm-search.model';

@Component({
    templateUrl: './functions-edit-dialog.component.html',
    styleUrls: ['./functions-edit-dialog.component.css'],
})
export class FunctionsEditDialogComponent implements OnInit {
    functionFormGroup!: FormGroup;

    concepts: ConceptsPermSearchModel[] = [];

    disabled: boolean;

    constructor(
        private conceptsService: ConceptsService,
        private dialogRef: MatDialogRef<FunctionsEditDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: { function: FunctionsPermSearchModel; disabled?: boolean },
    ) {
        this.disabled = !!data.disabled;
        this.initFunctionFormGroup(data.function);
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts: ConceptsPermSearchModel[]) => {
            this.concepts = concepts;
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

    private initFunctionFormGroup(func: FunctionsPermSearchModel): void {
        if(this.disabled) {
            this.functionFormGroup = this._formBuilder.group({
                id: [{ value: func.id, disabled: true }],
                name: [{disabled: true, value: func.name}],
                display_name: [{disabled: true, value: func.display_name }],
                concept_id: [{disabled: true, value: func.concept_id }],
                description: [{disabled: true, value: func.description }],
            });
        } else {
            this.functionFormGroup = this._formBuilder.group({
                id: [{ value: func.id, disabled: true }],
                name: [func.name, Validators.required],
                display_name: func.display_name,
                concept_id: func.concept_id,
                description: func.description,
            });
        }
    }
}
