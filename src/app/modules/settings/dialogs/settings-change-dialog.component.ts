/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, OnInit} from '@angular/core';
import {MatDialogRef, MatSnackBar} from '@angular/material';
import {KeycloakService} from 'keycloak-angular';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {AuthorizationProfileModel} from '../../../core/components/authorization/authorization-profile.model';
import {AuthorizationSessionsModel} from '../../../core/components/authorization/authorization-sessions.model';
import {AbstractControl, FormControl, ValidatorFn, Validators} from '@angular/forms';

@Component({
    templateUrl: './settings-change-dialog.component.html',
    styleUrls: ['./settings-change-dialog.component.css']
})
export class SettingsChangeDialogComponent implements OnInit {

    profile: AuthorizationProfileModel = {email: '', firstName: '', lastName: '', username: ''};
    passwordNew = new FormControl('', [Validators.pattern('.*[?|!|#|%|$].*'), Validators.minLength(8), this.forbiddenNameValidator()]);
    passwordConfirm = new FormControl('', [this.equalValidator()]);
    hidePasswordNew = true;
    hidePasswordConfirm = true;


    constructor(private authorizationService: AuthorizationService,
                private dialogRef: MatDialogRef<SettingsChangeDialogComponent>,
                private snackBar: MatSnackBar) {
    }

    ngOnInit(): void {
        this.profile = this.authorizationService.getProfile();
        this.passwordNew.valueChanges.subscribe(() => {
            this.passwordConfirm.updateValueAndValidity();
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
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
}

