import {AbstractControl, ValidatorFn} from '@angular/forms';

export function rangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const num = control.value;
        if ((min <= num) && (num <= max)) {
            return null;
        } else {
            return {
                numberOutOfRange: {
                    actual: control.value,
                    min,
                    max
                },
            };
        }
    };
}
