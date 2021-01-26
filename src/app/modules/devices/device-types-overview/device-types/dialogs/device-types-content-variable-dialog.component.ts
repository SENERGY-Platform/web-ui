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
import {DeviceTypeCharacteristicsModel, DeviceTypeContentVariableModel} from '../../shared/device-type.model';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';
import {DeviceTypeHelperService} from '../shared/device-type-helper.service';
import {convertPunctuation, TypeValueValidator} from '../../../../imports/validators/type-value-validator';

@Component({
    templateUrl: './device-types-content-variable-dialog.component.html',
    styleUrls: ['./device-types-content-variable-dialog.component.css']
})
export class DeviceTypesContentVariableDialogComponent implements OnInit {

    disabled: boolean;
    contentVariable: DeviceTypeContentVariableModel;
    functionConceptIds: string[] = [];
    firstFormGroup!: FormGroup;
    typeOptionsControl: FormControl = new FormControl();
    primitiveTypes: { type: string, typeShort: string }[] = [];
    nonPrimitiveTypes: { type: string, typeShort: string }[] = [];
    conceptList: { conceptName: string, characteristicList:
            { id: string, name: string, type: string | undefined, class: string }[] }[] = [];
    options: Map<string, any[]> = new Map();
    concepts: ConceptsCharacteristicsModel[] = [];

    constructor(private dialogRef: MatDialogRef<DeviceTypesContentVariableDialogComponent>,
                private _formBuilder: FormBuilder,
                private deviceTypeHelperService: DeviceTypeHelperService,
                @Inject(MAT_DIALOG_DATA) data: { contentVariable: DeviceTypeContentVariableModel, functionConceptIds: string[],
                    disabled: boolean, concepts: ConceptsCharacteristicsModel[] }) {
        this.disabled = data.disabled;
        this.contentVariable = data.contentVariable;
        this.functionConceptIds = data.functionConceptIds;
        this.concepts = data.concepts;
    }

    ngOnInit(): void {
        this.initTypesList();
        this.initFormGroup();
        this.initConceptList();
        this.options = this.getOptions();
        this.initTypeOptionControl();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const type = this.firstFormGroup.get('type')?.value;
        if (type !== 'https://schema.org/Text') {
            let toParse = this.firstFormGroup.get('value')?.value;
            if (type === 'https://schema.org/Float') {
                toParse = convertPunctuation(toParse);
            }
            console.log(toParse); // TODO
            if (toParse.length > 0) {
                this.firstFormGroup.patchValue({value: JSON.parse(toParse)});
            } else {
                this.firstFormGroup.patchValue({value: null});
            }
        }
        this.dialogRef.close(this.firstFormGroup.getRawValue());
    }

    isPrimitiveType(): boolean {
        return this.typeOptionsControl.value === 'primitive';
    }

    getOptions(): Map<string, any[]> {
        const m = new Map();
        const filteredList = this.getFilteredConceptList();
        filteredList.forEach(c => m.set(c.conceptName, c.characteristicList));
        return m;
    }

    getType(): string {
        return this.firstFormGroup?.get('type')?.value;
    }

    getFilteredConceptList(): { conceptName: string, characteristicList:
            { id: string, name: string, type: string | undefined }[]}[] {

        if (this.getType() === null) {
            return this.conceptList;
        }
        const type = this.getType();
        const copy = JSON.parse(JSON.stringify(this.conceptList));
        copy.forEach((concept: any) => {
            concept.characteristicList = concept.characteristicList.filter((characteristic: any) =>
                characteristic.type === undefined || characteristic.type === type);
        });
        return copy.filter((concept: any) => concept.characteristicList.length > 0);
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

    private initFormGroup() {
        const disabled = this.disabled;
        if (disabled) {
            this.firstFormGroup = this._formBuilder.group({
                    indices: [this.contentVariable.indices],
                    id: [{value: this.contentVariable.id || null, disabled: true}],
                    name: [{disabled: true, value: this.contentVariable.name}],
                    type: [{disabled: true, value: this.contentVariable.type}],
                    characteristic_id: [{disabled: true, value: this.contentVariable.characteristic_id}],
                    serialization_options: [{disabled: true, value: this.contentVariable.serialization_options}],
                    unit_reference: [{disabled: true, value: this.contentVariable.unit_reference}],
                    sub_content_variables: [{disabled: true, value: this.contentVariable.sub_content_variables}],
                    value: [{disabled: true, value: this.contentVariable.value}],
                }
            );
        } else {
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
                }, {validators: TypeValueValidator('type', 'value')}
            );
        }

        this.firstFormGroup?.get('characteristic_id')?.valueChanges.subscribe(id => {
            if (id) {
                this.patchType(id);
            }
        });
        this.firstFormGroup?.get('type')?.valueChanges.subscribe(_ => {
            this.options = this.getOptions();
        });
        if (this.firstFormGroup.get('characteristic_id')?.value) {
            this.patchType(this.firstFormGroup.get('characteristic_id')?.value);
        }
    }

    private patchType(characteristicId: string) {
        this.conceptList.forEach(concept => {
            const selectedChar = concept.characteristicList.find(characteristic => characteristic.id === characteristicId);
            if (selectedChar !== undefined && selectedChar.type !== undefined) {
                this.firstFormGroup.patchValue({type: selectedChar.type});
            }
        });
    }

    private initTypesList(): void {
        this.primitiveTypes.push({type: 'https://schema.org/Text', typeShort: 'string'});
        this.primitiveTypes.push({type: 'https://schema.org/Integer', typeShort: 'int'});
        this.primitiveTypes.push({type: 'https://schema.org/Float', typeShort: 'float'});
        this.primitiveTypes.push({type: 'https://schema.org/Boolean', typeShort: 'bool'});

        this.nonPrimitiveTypes.push({type: 'https://schema.org/StructuredValue', typeShort: 'Structure'});
        this.nonPrimitiveTypes.push({type: 'https://schema.org/ItemList', typeShort: 'List'});
    }

    private initConceptList(): void {
        this.concepts.forEach(concept => {
            const characteristicsList: { id: string, name: string, type: string | undefined, class: string }[] = [];
            const ngclass =  this.functionConceptIds.includes(concept.id) ? 'color-accent' : '';
            if (concept.characteristics !== null) {
                concept.characteristics.forEach((characteristic: DeviceTypeCharacteristicsModel) => {
                    this.deviceTypeHelperService.characteristicsFlatten(characteristic).forEach(char => {
                        characteristicsList.push({id: char.id, name: char.name, type: char.type, class: ngclass});
                    });
                });
            }

            this.conceptList.push({
                conceptName: concept.name,
                characteristicList: characteristicsList
            });
        });
    }

}
