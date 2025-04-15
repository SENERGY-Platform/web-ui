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
