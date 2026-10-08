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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { FunctionsPermSearchModel } from '../shared/functions-perm-search.model';
import { DeviceTypeConceptModel } from '../../device-types-overview/shared/device-type.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './functions-edit-dialog.component.html',
    styleUrls: ['./functions-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatDialogActions, MatButton]
})
export class FunctionsEditDialogComponent implements OnInit {
    private conceptsService = inject(ConceptsService);
    private dialogRef = inject<MatDialogRef<FunctionsEditDialogComponent>>(MatDialogRef);
    private _formBuilder = inject(FormBuilder);

    functionFormGroup!: FormGroup;

    concepts: DeviceTypeConceptModel[] = [];

    disabled: boolean;

    constructor() {
        const data = inject<{
            function: FunctionsPermSearchModel;
            disabled?: boolean;
        }>(MAT_DIALOG_DATA);

        this.disabled = !!data.disabled;
        this.initFunctionFormGroup(data.function);
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
