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

import {Component, AfterViewInit, Injector, Input, OnDestroy} from '@angular/core';
import { MatFormFieldControl, MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import {FormControl} from '@angular/forms';

interface errorMsg {errorCode: string; errorInfo: any}

// Interfaces for pushFunctions
interface LengthError {requiredLength: number; actualLength: number}
interface minError {min: number; actual: number}
interface maxError {max: number; actual: number}
interface rangeError {actual: string; min: number; max: number}

interface patternError {requiredPattern: string; actual: string}
// interface newErrorInterface {}                1. add your new error interface here


@Component({
    selector: '[senergyError]',
    template: '{{ error }}'
})
export class MatErrorMessagesDirective implements AfterViewInit, OnDestroy {
    @Input() label = '';                // Mat-form-field label, suggested to use to improve readability of "required" error
    @Input() codeToOverwrite = '';      // optional, in combination with customMessage to make single time adjustments
    @Input() customMessage = '';        // optional, in combination with codeToOverwrite - changes error message if custom code is thrown

    error = '';
    formControl: FormControl <any> | any = null;
    inputRef: MatFormFieldControl<MatInput> | any;

    handledErrorCodes = new Set([
        'required',
        'email',
        'minlength',
        'maxlength',
        'min',
        'max',
        'numberOutOfRange',
        'forbiddenName',
        'pattern'
        // 'newErrorCode'                                   2. add new error code here
    ]);

    constructor(private _inj: Injector) {
        if (this.codeToOverwrite) {
            this.handledErrorCodes.add(this.codeToOverwrite);
        }
    }

    ngAfterViewInit() {
        const container = this._inj.get(MatFormField);
        this.inputRef = container._control;
        if (this.formControl == null) {
            try {
                this.formControl = this.inputRef.ngControl.control;
            } catch (_) {
                throw new Error('FormControl must be provided to mat-error with label: ' + this.label + '\n This ' +
                    'can be done by using formControlName, formControl, or ngModel in the relevant mat-form-field. ' +
                    'If there is no FormControl needed for the mat-form-field, then the mat-error is redundant, too.');
            }
        }

        // console.log(this.label, ' inputRef: ', this.inputRef);
        // console.log(this.label, ' formControl: ', this.formControl);

        this.formControl.statusChanges.subscribe(this.updateErrors);
        this.subscribeToTouched();
    }

    ngOnDestroy() {
        if (this.formControl !== null) {
            this.formControl.markAsTouched = this.formControl['_markAsTouched'];
        }
    }

    private subscribeToTouched(){
        // console.log('subscribing to touched', this.formControl);
        this.formControl['_markAsTouched'] = this.formControl.markAsTouched;
        this.formControl.markAsTouched = () => {
            const wasUntouched = this.formControl.untouched;
            this.formControl['_markAsTouched']();
            if (wasUntouched) {
                this.updateErrors(this.formControl.status);
            }
        };
    }

    private getRelevantError() {
        const controlErrors = this.formControl.errors;
        const err = {
            errorCode: '',
            errorInfo: '',
        } as errorMsg;

        for (const prop in controlErrors) {
            if (Object.prototype.hasOwnProperty.call(controlErrors, prop)) {
                if (this.handledErrorCodes.has(prop)) {
                    err.errorCode = prop;
                    err.errorInfo = controlErrors[prop];
                    break;
                }
            }
        }
        // console.log(Object.keys(controlErrors).length)
        // console.log(this.label, 'ErrorCode: ', err.errorCode);
        // console.log(this.label, 'ErrorInf: ', err.errorInfo);
        return err;
    }

    private updateErrors = (state: 'VALID' | 'INVALID') => {
        // console.log(this.label, state);
        if (state === 'INVALID') {
            const err= this.getRelevantError();

            if ((err.errorCode === this.codeToOverwrite) && this.customMessage) {
                this.error = this.customMessage;

            } else {
                switch (err.errorCode) {
                case 'required':
                    this.pushRequiredError();
                    break;
                case 'email':
                    this.pushEmailError();
                    break;
                case 'minlength':
                    this.pushMinlengthError(err.errorInfo);
                    break;
                case 'maxlength':
                    this.pushMaxlengthError(err.errorInfo);
                    break;
                case 'min':
                    this.pushMinError(err.errorInfo);
                    break;
                case 'max':
                    this.pushMaxError(err.errorInfo);
                    break;
                case 'numberOutOfRange':
                    this.pushRangeError(err.errorInfo);
                    break;
                case 'forbiddenName':
                    this.pushForbiddenNameError();
                    break;
                case 'pattern':
                    this.pushPatternError(err.errorInfo);
                    break;
                    // case: 'newErrorCode': ... // 3. add new error reference here
                }
            }
        }
    };

    private pushRequiredError() {
        if (this.label.length > 0) {
            this.error = this.label + ' is required!';
        } else {
            this.error = 'This field is required!';
        }
    }

    private pushEmailError() {
        this.error = 'Please enter a valid email!';
    }

    private pushMinlengthError(errorInfo: LengthError) {
        this.error = 'Please write a minimum of ' + errorInfo.requiredLength + ' characters!';
    }

    private pushMaxlengthError(errInfo: LengthError){
        this.error = 'Please limit to ' + errInfo.requiredLength + ' characters!';
    }

    private pushMinError(errorInfo: minError) {
        this.error = 'Please choose a value of ' + errorInfo.min + ' or higher!';
    }

    private pushMaxError(errorInfo: maxError) {
        this.error = 'Please choose a value up to ' + errorInfo.max + '!';
    }

    private pushRangeError(errorInfo: rangeError) {
        this.error = 'Please choose a number between ' + errorInfo.min + ' and ' + errorInfo.max + '!';
    }

    private pushForbiddenNameError() {
        this.error = 'You can\'t use this as a password!';
    }

    private pushPatternError(errInfo: patternError) {
        if (errInfo.requiredPattern === '^.*[?|!|#|%|$].*$') {
            this.error = 'You must enter at least one special character: ?, !, #, %, $';
        }
        // else if (other pattern) {}
    }

    // private pushNewError(errorInf: newErrorInterface) {}   // 4. add new error message generation here

}
