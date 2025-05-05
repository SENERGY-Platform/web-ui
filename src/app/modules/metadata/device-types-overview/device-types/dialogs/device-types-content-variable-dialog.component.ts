/*
 * Copyright 2021 InfAI (CC SES)
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
import {
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel, DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel
} from '../../shared/device-type.model';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup, ValidatorFn
} from '@angular/forms';
import { ConceptsCharacteristicsModel } from '../../../concepts/shared/concepts-characteristics.model';
import { DeviceTypeHelperService } from '../shared/device-type-helper.service';
import { convertPunctuation, typeValueValidator } from '../../../../imports/validators/type-value-validator';

interface DeviceTypeCharacteristicsClassModel extends DeviceTypeCharacteristicsModel {
    class: string;
}

interface DeviceTypeFunctionClassModel extends DeviceTypeFunctionModel {
    class: string;
}


interface DeviceTypeAspectModelWithRootName extends DeviceTypeAspectModel {
    root_name?: string;
}

@Component({
    templateUrl: './device-types-content-variable-dialog.component.html',
    styleUrls: ['./device-types-content-variable-dialog.component.css'],
})
export class DeviceTypesContentVariableDialogComponent implements OnInit {
    disabled: boolean;
    contentVariable: DeviceTypeContentVariableModel;
    functions: DeviceTypeFunctionClassModel[] = [];
    firstFormGroup!: FormGroup;
    typeOptionsControl: FormControl = new FormControl();
    primitiveTypes: { type: string; typeShort: string }[] = [];
    nonPrimitiveTypes: { type: string; typeShort: string }[] = [];
    characteristics: DeviceTypeCharacteristicsClassModel[] = [];
    concepts: ConceptsCharacteristicsModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    aspectOptions: DeviceTypeAspectModelWithRootName[] = [];
    allowVoid = false;
    prohibitedNames: string[] = [];

    constructor(
        private dialogRef: MatDialogRef<DeviceTypesContentVariableDialogComponent>,
        private _formBuilder: FormBuilder,
        private deviceTypeHelperService: DeviceTypeHelperService,
        @Inject(MAT_DIALOG_DATA)
        data: {
            contentVariable: DeviceTypeContentVariableModel;
            disabled: boolean;
            functions: DeviceTypeFunctionModel[];
            concepts: ConceptsCharacteristicsModel[];
            aspects: DeviceTypeAspectModel[];
            allowVoid: boolean;
            prohibitedNames: string[];
        },
    ) {
        this.disabled = data.disabled;
        this.contentVariable = data.contentVariable;
        this.functions = data.functions.map(f => {
            const x = f as DeviceTypeFunctionClassModel;
            x.class = '';
            return x;
        });
        this.concepts = data.concepts;
        this.aspects = data.aspects;
        this.allowVoid = data.allowVoid;
        this.prohibitedNames = data.prohibitedNames;
    }

    ngOnInit(): void {
        this.initTypesList();
        this.initFormGroup();
        for (const concept of this.concepts) {
            const toAdd = concept.characteristics.filter(c => !this.characteristics.some(cc => cc.id === c.id))
                .map(x => {
                    const c = x as DeviceTypeCharacteristicsClassModel;
                    c.class = '';
                    const resp = [c];
                    resp.push(...this.getSubCharacteristicsClass(c));
                    return resp;
                });
            this.characteristics.push(...([] as DeviceTypeCharacteristicsClassModel[]).concat(...toAdd));
        }
        this.initTypeOptionControl();
        this.aspects.forEach(a => {
            this.aspectOptions.push(...this.getAllAspectsOnTree(a, '', a.name));
        });
        this.aspectOptions = this.aspectOptions.filter(a => !this.aspectDisabled(a));
        this.highlightCharacteristics();
        this.highlightFunctions();
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

            if (toParse !== null && toParse !== undefined && toParse.length > 0) {
                this.firstFormGroup.patchValue({value: JSON.parse(toParse)});
            } else {
                this.firstFormGroup.patchValue({value: null});
            }
        }
        if (this.firstFormGroup.get('omit_empty')?.value) {
            this.firstFormGroup.patchValue({value: null});
        }
        this.dialogRef.close(this.firstFormGroup.getRawValue());
    }

    isPrimitiveType(): boolean {
        return this.typeOptionsControl.value === 'primitive';
    }

    isVoidType(): boolean {
        return this.typeOptionsControl.value === 'void';
    }

    isOmitEmpty(): boolean {
        return !!this.firstFormGroup.get('omit_empty')?.value;
    }

    highlightCharacteristics() {
        let conceptCharacteristicIds: string[] | undefined;
        if (this.firstFormGroup.get('function_id')?.value != null) {
            const conceptId = this.functions.find(f => f.id === this.firstFormGroup.get('function_id')?.value)?.concept_id;
            conceptCharacteristicIds = this.concepts.find(c => c.id === conceptId)?.characteristics.map(c => c.id || '');
        }
        const type = this.getType();
        this.characteristics.forEach(c => {
            if ((conceptCharacteristicIds !== undefined && conceptCharacteristicIds.indexOf(c.id || '') !== -1 && c.type === type) || (conceptCharacteristicIds === undefined && c.type === type)) {
                c.class = 'color-accent';
            } else {
                c.class = '';
            }
        });
        this.characteristics.sort((a, b) => {
            if (a.class === b.class) {
                return (a === b ? 0 : (a.name < b.name ? -1 : 1));
            } else {
                return a.class === '' ? 1 : -1;
            }
        });
    }

    highlightFunctions() {
        const characteristicId = this.firstFormGroup.get('characteristic_id')?.value;
        const concepts = this.concepts.filter(c => c.characteristics.some(cc => cc.id === characteristicId));
        this.functions.forEach(f => {
            if (concepts.some(c => c.id === f.concept_id)) {
                f.class = 'color-accent';
            } else {
                f.class = '';
            }
        });
        this.functions.sort((a, b) => {
            if (a.class === b.class) {
                return (a === b ? 0 : (a.name < b.name ? -1 : 1));
            } else {
                return a.class === '' ? 1 : -1;
            }
        });
    }

    getType(): string {
        return this.firstFormGroup?.get('type')?.value;
    }

    private initTypeOptionControl() {
        if (this.contentVariable.type) {
            this.typeOptionsControl.disable();
        }

        if (this.nonPrimitiveTypes.find((x) => x.type === this.contentVariable.type)) {
            this.typeOptionsControl.setValue('non-primitive');
        } else {
            this.typeOptionsControl.setValue('primitive');
        }

        if (this.contentVariable.is_void && this.allowVoid) {
            this.typeOptionsControl.setValue('void');
        }

        this.typeOptionsControl.valueChanges.subscribe(() => {
            this.firstFormGroup.patchValue({
                sub_content_variables: this.isPrimitiveType() || this.isVoidType() ? null : [],
                serialization_options: null,
                unit_reference: null,
                value: null,
                type: null,
                omit_empty: false,
            });
            if (this.isVoidType()) {
                this.firstFormGroup.patchValue({
                    is_void: true,
                    name: 'void',
                    type: 'https://schema.org/Boolean',
                    characteristic_id: '',
                    aspect_id: undefined,
                });
            } else {
                this.firstFormGroup.patchValue({
                    is_void: false,
                });
            }
        });
    }

    private initFormGroup() {
        const disabled = this.disabled;
        if (disabled) {
            this.firstFormGroup = this._formBuilder.group({
                indices: [this.contentVariable.indices],
                id: [{value: this.contentVariable.id || null, disabled: true}],
                name: [{
                    disabled: true,
                    value: this.contentVariable.name
                }, (c: AbstractControl) => this.prohibitedNames.some(p => p === c.value) ? {nameValidator: {value: c.value}} : null],
                type: [{disabled: true, value: this.contentVariable.type}],
                characteristic_id: [{
                    disabled: true,
                    value: this.contentVariable.characteristic_id
                }, this.characteristicValidator()],
                serialization_options: [{disabled: true, value: this.contentVariable.serialization_options}],
                unit_reference: [{disabled: true, value: this.contentVariable.unit_reference}],
                sub_content_variables: [{disabled: true, value: this.contentVariable.sub_content_variables}],
                value: [{disabled: true, value: this.contentVariable.value}],
                aspect_id: [{disabled: true, value: this.contentVariable.aspect_id}],
                function_id: [{disabled: true, value: this.contentVariable.function_id}],
                is_void: [{disabled: true, value: this.contentVariable.is_void}],
                omit_empty: [!!this.contentVariable.omit_empty],
            });
            this.firstFormGroup.get('omit_empty')?.disable(); // [{disabled: true, value: !!this.contentVariable.omit_empty}], doesn't work
        } else {
            this.firstFormGroup = this._formBuilder.group(
                {
                    indices: [this.contentVariable.indices],
                    id: [{value: this.contentVariable.id || null, disabled: true}],
                    name: [this.contentVariable.name, (c: AbstractControl) => this.prohibitedNames.some(p => p === c.value) ? {nameValidator: {value: c.value}} : null],
                    type: [this.contentVariable.type],
                    characteristic_id: [this.contentVariable.characteristic_id, this.characteristicValidator()],
                    serialization_options: [this.contentVariable.serialization_options],
                    unit_reference: [this.contentVariable.unit_reference],
                    sub_content_variables: [this.contentVariable.sub_content_variables],
                    value: [this.contentVariable.value],
                    aspect_id: [this.contentVariable.aspect_id],
                    function_id: [this.contentVariable.function_id],
                    is_void: [this.contentVariable.is_void],
                    omit_empty: [!!this.contentVariable.omit_empty],
                },
                {validators: typeValueValidator('type', 'value')},
            );
        }

        this.firstFormGroup?.get('characteristic_id')?.valueChanges.subscribe((id) => {
            if (id) {
                this.patchType(id);
            }
            this.highlightFunctions();
        });
        this.firstFormGroup?.get('type')?.valueChanges.subscribe((_) => {
            this.highlightCharacteristics();
            this.firstFormGroup.get('characteristic_id')?.updateValueAndValidity({onlySelf: true, emitEvent: false});
        });
        if (this.firstFormGroup.get('characteristic_id')?.value) {
            this.patchType(this.firstFormGroup.get('characteristic_id')?.value);
        }
        this.firstFormGroup?.get('function_id')?.valueChanges.subscribe((_) => {
            this.highlightCharacteristics();
            this.firstFormGroup.get('characteristic_id')?.updateValueAndValidity({onlySelf: true, emitEvent: false});
        });
    }

    private characteristicValidator(): ValidatorFn {
        return (control) => {
            const err = this.getCharacteristicError(control);
            if (err !== undefined) {
                const res = {err: true};
                control.setErrors(res);
                return res;
            }
            control.setErrors(null);
            return null;
        };
    }

    private patchType(characteristicId: string) {
        const char = this.characteristics.find(c => c.id === characteristicId);
        if (char !== undefined) {
            this.firstFormGroup.patchValue({type: char.type});
        }
    }

    private initTypesList(): void {
        this.primitiveTypes.push({type: 'https://schema.org/Text', typeShort: 'string'});
        this.primitiveTypes.push({type: 'https://schema.org/Integer', typeShort: 'int'});
        this.primitiveTypes.push({type: 'https://schema.org/Float', typeShort: 'float'});
        this.primitiveTypes.push({type: 'https://schema.org/Boolean', typeShort: 'bool'});

        this.nonPrimitiveTypes.push({type: 'https://schema.org/StructuredValue', typeShort: 'Structure'});
        this.nonPrimitiveTypes.push({type: 'https://schema.org/ItemList', typeShort: 'List'});
    }

    aspectDisabled(aspect: DeviceTypeAspectModel): boolean {
        return !(aspect.sub_aspects === null || aspect.sub_aspects === undefined || aspect.sub_aspects.length == 0);
    }

    copyAspect(aspect: DeviceTypeAspectModel): DeviceTypeAspectModelWithRootName {
        const result: DeviceTypeAspectModelWithRootName = {
            id: aspect.id,
            name: aspect.name,
            sub_aspects: [],
        };
        aspect.sub_aspects?.forEach((a:DeviceTypeAspectModel) => result.sub_aspects?.push(this.copyAspect(a)));
        return result;
    }

    private getAllAspectsOnTree(a: DeviceTypeAspectModelWithRootName, prefix: string='', rootName: string=''): DeviceTypeAspectModelWithRootName[] {
        const res: DeviceTypeAspectModelWithRootName[] = [];
        const element = this.copyAspect(a);
        element.name = prefix+element.name;
        element.root_name = rootName;
        res.push(element);
        element.sub_aspects?.forEach(sub => res.push(...this.getAllAspectsOnTree(sub, element.name+'.', rootName)));
        return res;
    }

    getCharacteristicError(control: AbstractControl | null): string | undefined {
        if (control === null) {
            return undefined;
        }
        if (control.value === null || control.value === undefined || control.value.length === 0) {
            return undefined;
        }
        if (this.firstFormGroup?.get('function_id')?.value != null) {
            const func = this.functions.find(f => f.id === this.firstFormGroup?.get('function_id')?.value);
            const concept = this.concepts.find(c => c.id === func?.concept_id);
            if (!concept?.characteristics.some(char => char.id === control.value)) {
                return 'Characteristic doesn\'t match function';
            }
        }
        const type = this.getType();
        if (type !== null && this.characteristics.find(c => c.id === control.value)?.type !== type) {
            return 'Characteristic doesn\'t match type';
        }
        return undefined;
    }

    private getSubCharacteristicsClass(c: DeviceTypeCharacteristicsModel, existing?: DeviceTypeCharacteristicsClassModel[]): DeviceTypeCharacteristicsClassModel[] {
        if (existing === undefined) {
            existing = [];
        } else {
            const sClass = JSON.parse(JSON.stringify(c)) as DeviceTypeCharacteristicsClassModel;
            sClass.class = '';
            existing?.push(sClass);
        }
        (c.sub_characteristics || []).forEach(s => {
            const sClass = JSON.parse(JSON.stringify(s)) as DeviceTypeCharacteristicsClassModel;
            sClass.name = c.name + '.' + sClass.name;
            sClass.class = '';
            existing?.push(sClass);
            sClass.sub_characteristics?.forEach(sub => {
                sub.name = sClass.name + '.' + sub.name;
                existing = this.getSubCharacteristicsClass(sub, existing);
            });
        });
        return existing;
    }
}
