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

import {AbstractControl, ValidatorFn} from '@angular/forms';

/**
 * Validates the object in a FormControl and checks for the empty object {}.
 *
 * By setting errorOnEmpty to false, validation will return an error if the object is not empty (inverse behaviour).
 * @param errorOnEmpty true by default
 */
export function emptyObjectValidator(errorOnEmpty: boolean = true): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
        if (errorOnEmpty) {
            if (Object.entries(control.value).length === 0 && control.value.constructor === Object) {
                return {'emptyModelValidator': true};
            }
            return null;
        } else {
            if (Object.entries(control.value).length === 0 && control.value.constructor === Object) {
               return null;
            }
            return {'emptyModelValidator': true};
        }
    };
}
