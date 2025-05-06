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

import { AbstractControl, ValidatorFn } from '@angular/forms';

const STRING = 'https://schema.org/Text';
const INTEGER = 'https://schema.org/Integer';
const FLOAT = 'https://schema.org/Float';
const BOOLEAN = 'https://schema.org/Boolean';
const STRUCTURE = 'https://schema.org/StructuredValue';
const LIST = 'https://schema.org/ItemList';

export function convertPunctuation(str: string | undefined | null): string | null {
    if (str === null || str === undefined) {
        return null;
    }
    if (str.replace === undefined) {
        // not a string
        return str;
    }
    return str.replace(',', '.');
}

export function typeValueValidator(typeControlName: string, valueControlName: string, allowEmpty = true): ValidatorFn {
    return (control: AbstractControl) => {
        const err = { configGroupValidator: { value: control.value } };
        const type = control.get(typeControlName);
        const defaultValue = control.get(valueControlName);
        if (type === null || defaultValue === null) {
            return err;
        }
        if (!type.value) {
            return err;
        }

        let defaultNotOk = false;

        if (!defaultValue.value) {
            if (allowEmpty) {
                return null;
            } else {
                defaultNotOk = true;
            }
        } else {
            switch (type.value) {
            case STRING:
                // nop
                break;
            case BOOLEAN:
                try {
                    if (typeof JSON.parse(defaultValue.value) !== 'boolean') {
                        defaultNotOk = true;
                    }
                } catch (_) {
                    defaultNotOk = true;
                }
                break;
            case FLOAT:
                const floatVal = convertPunctuation(defaultValue.value);
                try {
                    if (typeof JSON.parse(floatVal || '') !== 'number') {
                        defaultNotOk = true;
                    }
                } catch (_) {
                    defaultNotOk = true;
                }
                break;
            case INTEGER:
                const intVal = convertPunctuation(defaultValue.value) || '';
                if (intVal.indexOf !== undefined && intVal.indexOf('.') !== -1) {
                    defaultNotOk = true;
                }
                try {
                    const val = JSON.parse(defaultValue.value);
                    if (typeof val !== 'number' || val % 1 !== 0) {
                        defaultNotOk = true;
                    }
                } catch (_) {
                    defaultNotOk = true;
                }
                break;
            case STRUCTURE:
                try {
                    const structVal = JSON.parse(defaultValue.value);
                    if (typeof structVal !== 'object' || Array.isArray(structVal)) {
                        defaultNotOk = true;
                    }
                } catch (_) {
                    defaultNotOk = true;
                }
                break;
            case LIST:
                try {
                    if (!Array.isArray(JSON.parse(defaultValue.value))) {
                        defaultNotOk = true;
                    }
                } catch (_) {
                    defaultNotOk = true;
                }
                break;
            default:
                return err; // unknown type
            }
        }
        if (defaultNotOk) {
            defaultValue.setErrors(err);
            return err;
        }
        defaultValue.setErrors(null);
        return null;
    };
}
