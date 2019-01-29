import {ErrorStateMatcher} from '@angular/material/typings/core';
import {FormControl, FormGroupDirective, NgForm} from '@angular/forms';

export class ParentErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        const isSubmitted = form && form.submitted;
        if (control && control.parent && control.parent.invalid && (control.parent.dirty || control.parent.touched || isSubmitted)) {
            return true;
        }
        return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
    }
}
