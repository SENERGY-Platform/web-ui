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

import {Component, OnInit} from '@angular/core';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {AuthorizationProfileModel} from '../../../core/components/authorization/authorization-profile.model';
import {AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    templateUrl: './settings-change-dialog.component.html',
    styleUrls: ['./settings-change-dialog.component.css']
})
export class SettingsChangeDialogComponent implements OnInit {

    profile: AuthorizationProfileModel = {email: '', firstName: '', lastName: '', username: ''};
    passwordNew = new FormControl('', [Validators.pattern('.*[?|!|#|%|$].*'), Validators.minLength(8), this.forbiddenNameValidator()]);
    passwordConfirm = new FormControl('', [this.equalValidator()]);
    firstFormGroup!: FormGroup;
    hidePasswordNew = true;
    hidePasswordConfirm = true;


    constructor(private authorizationService: AuthorizationService,
                private dialogRef: MatDialogRef<SettingsChangeDialogComponent>,
                private snackBar: MatSnackBar,
                private _formBuilder: FormBuilder) {
    }

    ngOnInit(): void {
        this.profile = this.authorizationService.getProfile();
        this.passwordNew.valueChanges.subscribe(() => {
            this.passwordConfirm.updateValueAndValidity();
        });
        this.firstFormGroup = this._formBuilder.group({
            lastName: [this.profile.lastName],
            firstName: [this.profile.firstName],
            email: [this.profile.email, [Validators.email]],
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {

        this.authorizationService.changeUserProfile(
            {first_name: this.firstFormGroup.value.firstName, last_name:  this.firstFormGroup.value.lastName, email:  this.firstFormGroup.value.email}).subscribe(
            (resp: null | { error: string }) => {
                if (resp === null) {
                    this.authorizationService.updateToken();
                    if (this.passwordConfirm.value !== '') {
                        this.updatePassword();
                    } else {
                        this.snackBar.open('Settings saved successfully.', undefined, {duration: 2000});
                    }
                } else {
                    this.snackBar.open('Error while saving the settings!', undefined, {duration: 2000});
                }
            }
        );
    }

    getErrorMessageNew(): string {
        return this.passwordNew.hasError('forbiddenName') ? 'You can\'t use the username!' :
            this.passwordNew.hasError('minlength') ? 'You must enter at least 8 characters!' :
                this.passwordNew.hasError('pattern') ? 'You must enter at least 1 special character (?|!|#|%|$)!' :
                    '';
    }

    forbiddenNameValidator(): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            if (this.profile.username === control.value) {
                return {'forbiddenName': true};
            } else {
                return null;
            }
        };
    }

    equalValidator(): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            if (this.passwordNew.value === control.value) {
                return null;
            } else {
                return {'notEqual': true};
            }
        };
    }

    private updatePassword() {
        this.authorizationService.changePasswort(this.passwordConfirm.value).subscribe((resp: (null | { error: string })) => {
            if (resp === null) {
                this.snackBar.open('Settings saved successfully.', undefined, {duration: 2000});
                this.passwordNew.setValue('');
                this.passwordConfirm.setValue('');
            } else {
                this.snackBar.open('Error while saving the settings!', undefined, {duration: 2000});
            }
        });
    }
}

