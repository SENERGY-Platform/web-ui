import {AbstractControl, ValidatorFn} from '@angular/forms';


const STRING = 'https://schema.org/Text';
const INTEGER = 'https://schema.org/Integer';
const FLOAT = 'https://schema.org/Float';
const BOOLEAN = 'https://schema.org/Boolean';
const STRUCTURE = 'https://schema.org/StructuredValue';
const LIST = 'https://schema.org/ItemList';

export function convertPunctuation(str: string): string {
    return str.replace(',', '.');
}

export function TypeValueValidator(typeControlName: string, valueControlName: string, allowEmpty = true): ValidatorFn {
    return (control: AbstractControl) => {
        const err = {'configGroupValidator': {value: control.value}};
        const type = control.get(typeControlName);
        const defaultValue = control.get(valueControlName);
        if (type === null || defaultValue === null) {
            return err;
        }
        if (!type.value) {
            return err;
        }

        let defaultNotOk = false;

        if (!defaultValue) {
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
                    } catch (e) {
                        defaultNotOk = true;
                    }
                    break;
                case FLOAT:
                    const floatVal = convertPunctuation(defaultValue.value);
                    try {
                        if (typeof JSON.parse(floatVal) !== 'number') {
                            defaultNotOk = true;
                        }
                    } catch (e) {
                        defaultNotOk = true;
                    }
                    break;
                case INTEGER:
                    const intVal = convertPunctuation(defaultValue.value);
                    if (intVal.indexOf('.') !== -1) {
                        defaultNotOk = true;
                    }
                    try {
                        const val = JSON.parse(defaultValue.value);
                        if (typeof val !== 'number' || val % 1 !== 0) {
                            defaultNotOk = true;
                        }
                    } catch (e) {
                        defaultNotOk = true;
                    }
                    break;
                case STRUCTURE:
                    try {
                        const structVal = JSON.parse(defaultValue.value);
                        if (typeof structVal !== 'object' || Array.isArray(structVal)) {
                            defaultNotOk = true;
                        }
                    } catch (e) {
                        defaultNotOk = true;
                    }
                    break;
                case LIST:
                    try {
                        if (!Array.isArray(JSON.parse(defaultValue.value))) {
                            defaultNotOk = true;
                        }
                    } catch (e) {
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
    }
}
