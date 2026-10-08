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

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {
    DeviceTypeContentVariableModel,
} from '../../shared/device-type.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { IsNotProhibitedNameValidatorDirective } from '../shared/is-not-prohibited-name.directive';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { IsJsonValidatorDirective } from '../../../../../core/validators/is-json-validator.directive';
import { MatButton } from '@angular/material/button';



@Component({
    templateUrl: './device-types-content-variable-json-dialog.component.html',
    styleUrls: ['./device-types-content-variable-json-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, FormsModule, IsNotProhibitedNameValidatorDirective, MatError, MatErrorMessagesDirective, IsJsonValidatorDirective, MatDialogActions, MatButton]
})
export class DeviceTypesContentVariableJsonDialogComponent {
    name = '';
    jsonStr = '';
    prohibitedNames: string[] = [];

    constructor(
        private dialogRef: MatDialogRef<DeviceTypesContentVariableJsonDialogComponent>,
        @Inject(MAT_DIALOG_DATA)
        data: {
            contentVariable: DeviceTypeContentVariableModel;
            name: string;
            prohibitedNames: string[];
        },
    ) {
        this.name = data.name;
        this.prohibitedNames = data.prohibitedNames;
    }

    private valueToContentVariable(name: string, value: any): DeviceTypeContentVariableModel {
        const result: DeviceTypeContentVariableModel = {
            name,
            is_void: false,
            serialization_options: [],
            omit_empty: false
        };
        if(value === undefined || value === null) {

        } else if (typeof value == 'boolean') {
            result.type = 'https://schema.org/Boolean';
        } else if(typeof value === 'string' || value instanceof String){
            result.type = 'https://schema.org/Text';
        }else if(Array.isArray(value)){
            result.type = 'https://schema.org/ItemList';
            result.sub_content_variables = [];
            value.forEach((sub, index)=>{
                result.sub_content_variables?.push(this.valueToContentVariable(index.toString(), sub));
            });
        }else if(typeof value === 'object'){
            result.type = 'https://schema.org/StructuredValue';
            result.sub_content_variables = [];
            for (const [k, v] of Object.entries(value)) {
                result.sub_content_variables?.push(this.valueToContentVariable(k, v));
            }
        }else if(Number.isInteger(value)){
            result.type = 'https://schema.org/Integer';
        } else if (typeof value === 'number') {
            result.type = 'https://schema.org/Float';
        } else  {
            console.error('unknown value type in valueToContentVariable()', value);
        }
        return result;
    }

    usesProhibitedName(): boolean{
        return this.prohibitedNames.some(p => p === this.name);
    }

    isValid(): boolean {
        if(this.name.trim() === ''){
            return false;
        }
        if (this.usesProhibitedName()){
            return false;
        }
        try{
            JSON.parse(this.jsonStr);
        } catch (_) {
            return false;
        }
        return true;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.valueToContentVariable(this.name, JSON.parse(this.jsonStr)));
    }
}
