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

import {Component, Inject, OnInit} from '@angular/core';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {AuthorizationProfileModel} from '../../../core/model/authorization/authorization-profile.model';
import {
    FormGroup,
    UntypedFormBuilder,
    Validators
} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {environment} from '../../../../environments/environment';
import {DOCUMENT} from '@angular/common';

@Component({
    templateUrl: './settings-change-dialog.component.html',
    styleUrls: ['./settings-change-dialog.component.css'],
})
export class SettingsChangeDialogComponent implements OnInit {
    profile: AuthorizationProfileModel = { email: '', firstName: '', lastName: '', username: '' };
    firstFormGroup: FormGroup = this._formBuilder.group({
        lastName: [''],
        firstName: [''],
        email: ['', [Validators.email]]
    });
    public href: string = '';
    protected readonly environment = environment;

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private authorizationService: AuthorizationService,
        private dialogRef: MatDialogRef<SettingsChangeDialogComponent>,
        private snackBar: MatSnackBar,
        private _formBuilder: UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        const port = this.document.location.port !== '443' && this.document.location.port !== '80' ? ':'+this.document.location.port : '';
        this.href = this.document.location.protocol+'//'+this.document.location.hostname+port+this.document.location.pathname;
        this.authorizationService.getProfile().then((profile) => {
            this.profile = profile;
            this.firstFormGroup.patchValue({
                lastName: this.profile.lastName,
                firstName: this.profile.firstName,
                email: this.profile.email
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.authorizationService
            .changeUserProfile({
                firstName: this.firstFormGroup.value.firstName,
                lastName: this.firstFormGroup.value.lastName,
                email: this.firstFormGroup.value.email,
            })
            .subscribe((resp: null | { error: string }) => {
                if (resp === null) {
                    this.snackBar.open('Settings saved successfully.', undefined, { duration: 2000 });
                } else {
                    this.snackBar.open('Error while saving the settings!', 'close', { panelClass: 'snack-bar-error' });
                }
            });
    }
}
