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


import {Directive, Input, Optional, Self} from '@angular/core';
import {ControlValueAccessor, NgControl} from '@angular/forms';
import { MatLegacyCheckbox as MatCheckbox } from '@angular/material/legacy-checkbox';

@Directive({
    selector: 'mat-checkbox[appStringCheckboxValue]'
})
export class CheckboxValueDirective implements ControlValueAccessor {
    @Input() trueValue: any = true;
    @Input() falseValue: any = false;

    constructor(@Optional() @Self() private ngControl: NgControl, private checkbox: MatCheckbox) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    writeValue(value: any): void {
        this.checkbox.writeValue(value === this.trueValue);
    }

    registerOnChange(fn: any): void {
        this.checkbox.registerOnChange((checked: boolean) => {
            fn(checked ? this.trueValue : this.falseValue);
        });
    }

    registerOnTouched(fn: any): void {
        this.checkbox.registerOnTouched(fn);
    }

    setDisabledState?(isDisabled: boolean): void {
        this.checkbox.setDisabledState(isDisabled);
    }
}
