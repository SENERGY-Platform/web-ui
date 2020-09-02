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
import {
    DeviceTypeCharacteristicsModel,
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel
} from '../../shared/device-type.model';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {ConceptsService} from '../../../concepts/shared/concepts.service';
import {DeviceTypeHelperService} from '../shared/device-type-helper.service';
import {ConceptsPermSearchModel} from '../../../concepts/shared/concepts-perm-search.model';
import {forkJoin, Observable} from 'rxjs';
import {DeviceTypeService} from '../../shared/device-type.service';
import {FunctionsService} from '../../../functions/shared/functions.service';

@Component({
    templateUrl: './device-types-content-variable-dialog.component.html',
    styleUrls: ['./device-types-content-variable-dialog.component.css']
})
export class DeviceTypesContentVariableDialogComponent implements OnInit {

    contentVariable: DeviceTypeContentVariableModel;
    functionConceptIds: string[] = [];
    firstFormGroup!: FormGroup;
    typeOptionsControl: FormControl = new FormControl();
    primitiveTypes: { type: string, typeShort: string }[] = [];
    nonPrimitiveTypes: { type: string, typeShort: string }[] = [];
    conceptList: { conceptName: string, colored: boolean, characteristicList: { id: string, name: string }[] }[] = [];

    constructor(private dialogRef: MatDialogRef<DeviceTypesContentVariableDialogComponent>,
                private _formBuilder: FormBuilder,
                private conceptsService: ConceptsService,
                private deviceTypeHelperService: DeviceTypeHelperService,
                private functionsService: FunctionsService,
                @Inject(MAT_DIALOG_DATA) data: { contentVariable: DeviceTypeContentVariableModel, functionIds: string[] }) {
        this.contentVariable = data.contentVariable;
        this.getConceptIds(data.functionIds);
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
        return this.typeOptionsControl.value === 'primitive';
    }

    private initTypeOptionControl() {
        if (this.contentVariable.type) {
            this.typeOptionsControl.disable();
        }

        if (this.nonPrimitiveTypes.find(x => x.type === this.contentVariable.type)) {
            this.typeOptionsControl.setValue('non-primitive');
        } else {
            this.typeOptionsControl.setValue('primitive');
        }

        this.typeOptionsControl.valueChanges.subscribe(() => {
            this.firstFormGroup.reset();
            this.firstFormGroup.patchValue({
                sub_content_variables: this.isPrimitiveType() ? null : [],
            });
        });
    }

    private loadConcepts() {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((conceptsPermSearch: ConceptsPermSearchModel[]) => {
            const observables: Observable<ConceptsCharacteristicsModel | null>[] = [];
            conceptsPermSearch.forEach((concept: ConceptsPermSearchModel) => {
                observables.push(this.conceptsService.getConceptWithCharacteristics(concept.id));
            });
            forkJoin(observables).subscribe((concepts: (ConceptsCharacteristicsModel | null)[]) => {
                concepts.forEach((concept: (ConceptsCharacteristicsModel | null)) => {
                    if (concept) {
                        this.initConceptList(concept);
                    }
                });
            });
        });
    }

    private initFormGroup() {
        this.firstFormGroup = this._formBuilder.group({
                indices: [this.contentVariable.indices],
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

    private initConceptList(concepts: ConceptsCharacteristicsModel): void {
        const characteristicsList: { id: string, name: string }[] = [];
        concepts.characteristics.forEach((characteristic: DeviceTypeCharacteristicsModel) => {
            characteristicsList.push(...this.deviceTypeHelperService.characteristicsFlatten(characteristic));
        });
        this.conceptList.push({
            conceptName: concepts.name,
            colored: this.functionConceptIds.includes(concepts.id),
            characteristicList: characteristicsList
        });
    }

    private getConceptIds(functionIds: string[] | undefined): void {
        if (functionIds) {
            functionIds.forEach((functionId: string) => {
                this.functionsService.getFunction(functionId).subscribe((resp: (DeviceTypeFunctionModel | null)) => {
                    if (resp) {
                        if (resp.concept_id) {
                            this.functionConceptIds.push(resp.concept_id);
                        }
                    }
                });
            });
        }
    }
}
