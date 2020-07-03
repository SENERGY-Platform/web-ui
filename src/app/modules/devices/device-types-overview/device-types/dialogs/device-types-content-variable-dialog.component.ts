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
import {DeviceTypeContentVariableModel, DeviceTypeFunctionModel} from '../../shared/device-type.model';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {ConceptsService} from '../../../concepts/shared/concepts.service';
import {environment} from '../../../../../../environments/environment';

@Component({
    templateUrl: './device-types-content-variable-dialog.component.html',
    styleUrls: ['./device-types-content-variable-dialog.component.css']
})
export class DeviceTypesContentVariableDialogComponent implements OnInit {

    contentVariable: DeviceTypeContentVariableModel;
    functions: DeviceTypeFunctionModel[];
    firstFormGroup!: FormGroup;
    typeOptionsControl: FormControl = new FormControl('primitive');
    primitiveTypes: { type: string, typeShort: string }[] = [];
    nonPrimitiveTypes: { type: string, typeShort: string }[] = [];
    concepts: ConceptsCharacteristicsModel[] = [];
    timeStampCharacteristicId: string = environment.timeStampCharacteristicId;

    constructor(private dialogRef: MatDialogRef<DeviceTypesContentVariableDialogComponent>,
                private _formBuilder: FormBuilder,
                private conceptsService: ConceptsService,
                @Inject(MAT_DIALOG_DATA) data: { contentVariable: DeviceTypeContentVariableModel, functions: DeviceTypeFunctionModel[] }) {
        this.contentVariable = data.contentVariable;
        this.functions = data.functions;
    }

    ngOnInit(): void {
        this.initTypesList();
        this.initFormGroup();
        this.loadConcepts();
        this.initTypeOptionControl();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.firstFormGroup.getRawValue());
    }

    isPrimitiveType(): boolean {
        return this.typeOption === 'primitive';
    }

    private initTypeOptionControl() {
        if (this.contentVariable.type) {
            this.typeOptionsControl.disable();
        }
        if (this.isPrimitiveType()) {
            this.typeOptionsControl.setValue('primitive');
        } else {
            this.typeOptionsControl.setValue('non-primitive');
        }

        this.typeOptionsControl.valueChanges.subscribe(() => {
            this.firstFormGroup.reset();
            this.firstFormGroup.patchValue({
                sub_content_variables: this.isPrimitiveType() ? null : [],
            });
        });
    }

    private loadConcepts() {
        if (this.functions) {
            this.functions.forEach(
                (func: DeviceTypeFunctionModel) => {
                    if (func.concept_id !== '') {
                        this.conceptsService.getConceptWithCharacteristics(func.concept_id).subscribe((concept: ConceptsCharacteristicsModel | null) => {
                            if (concept) {
                                this.concepts.push(concept);
                            }
                        });
                    }
                });
        }
    }

    private initFormGroup() {
        this.firstFormGroup = this._formBuilder.group({
                id: [{value: this.contentVariable.id || null, disabled: true}],
                name: [this.contentVariable.name],
                type: [this.contentVariable.type],
                characteristic_id: [this.contentVariable.characteristic_id],
                serialization_options: [this.contentVariable.serialization_options],
                unit_reference: [this.contentVariable.unit_reference],
                sub_content_variables: [this.contentVariable.sub_content_variables],
                value: [this.contentVariable.value],
            }
        );
    }

    private initTypesList(): void {
        this.primitiveTypes.push({type: 'https://schema.org/Text', typeShort: 'string'});
        this.primitiveTypes.push({type: 'https://schema.org/Integer', typeShort: 'int'});
        this.primitiveTypes.push({type: 'https://schema.org/Float', typeShort: 'float'});
        this.primitiveTypes.push({type: 'https://schema.org/Boolean', typeShort: 'bool'});

        this.nonPrimitiveTypes.push({type: 'https://schema.org/StructuredValue', typeShort: 'Structure'});
        this.nonPrimitiveTypes.push({type: 'https://schema.org/ItemList', typeShort: 'List'});
    }

    get typeOption(): string {
        return this.typeOptionsControl.value;
    }
}
