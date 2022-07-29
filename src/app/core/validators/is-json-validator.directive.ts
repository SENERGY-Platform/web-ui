/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Directive, Input} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn} from '@angular/forms';
import {jsonValidator} from './json.validator';

@Directive({
    selector: '[isValidJson]',
    providers: [{provide: NG_VALIDATORS, useExisting: IsJsonValidatorDirective, multi: true}]
})
export class IsJsonValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        return jsonValidator()(control)
    }
}