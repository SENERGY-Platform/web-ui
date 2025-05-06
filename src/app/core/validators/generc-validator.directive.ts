/*
 * Copyright 2025 InfAI (CC SES)
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

import { Directive, Input } from '@angular/core';
import { AbstractControl, ValidationErrors, NG_VALIDATORS, Validator } from '@angular/forms';

@Directive({
     
    selector: '[generic_validator]',
    providers: [{ provide: NG_VALIDATORS, useExisting: GenericValidator, multi: true }],
})
export class GenericValidator implements Validator {

    @Input() generic_validator?: (control: AbstractControl) => ValidationErrors | null;

    validate(control: AbstractControl): ValidationErrors | null {
        if(this.generic_validator) {
            return this.generic_validator(control);
        }
        return null;
    }

}
