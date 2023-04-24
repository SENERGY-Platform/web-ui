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
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ParentErrorStateMatcher} from '../../../../../core/classes/parent-error-state-matcher';

@Component({
    templateUrl: './email-config-dialog.component.html',
    styleUrls: ['./email-config-dialog.component.css'],
})
export class EmailConfigDialogComponent implements OnInit {
    toFormGroup: FormGroup;
    subjectFormGroup: FormGroup;
    contentFormGroup: FormGroup;
    parentErrorStateMatcher = new ParentErrorStateMatcher();

    constructor(
        private dialogRef: MatDialogRef<EmailConfigDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { to: string; subj: string; content: string },
    ) {
        this.toFormGroup = new FormGroup(
            {
                defaultValue: new FormControl(''),
                fixed: new FormControl(true),
                key: new FormControl(''),
            },
            [this.getValidator(), Validators.required],
        );
        this.toFormGroup.setValue(EmailConfigDialogComponent.interpretStringAsPlaceholder(this.dialogParams.to));

        this.subjectFormGroup = new FormGroup(
            {
                defaultValue: new FormControl(''),
                fixed: new FormControl(true),
                key: new FormControl(''),
            },
            this.getValidator(),
        );
        this.subjectFormGroup.setValue(EmailConfigDialogComponent.interpretStringAsPlaceholder(this.dialogParams.subj));

        this.contentFormGroup = new FormGroup(
            {
                defaultValue: new FormControl(''),
                fixed: new FormControl(true),
                key: new FormControl(''),
            },
            this.getValidator(),
        );
        this.contentFormGroup.setValue(EmailConfigDialogComponent.interpretStringAsPlaceholder(this.dialogParams.content));
    }

    ngOnInit() {
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.getResult());
    }

    isInvalid(): boolean {
        return this.toFormGroup.invalid || this.subjectFormGroup.invalid || this.contentFormGroup.invalid;
    }

    private getValidator(): ValidatorFn {
        return (control) => {
            const placeholder = control.value as { key: string; defaultValue: string; fixed: boolean };
            if (!placeholder) {
                return {
                    invalid: 'placeholder is null',
                };
            }
            if (placeholder.fixed && !placeholder.defaultValue) {
                return {
                    fixedNull: 'fixed placeholders can\'t have empty default values',
                };
            }
            return null;
        };
    }

    private getResult(): { to: string; subj: string; content: string } {
        const result = {to: '', subj: '', content: ''};

        const toPlaceholder = this.toFormGroup.value as { key: string; defaultValue: string; fixed: boolean };
        result.to = EmailConfigDialogComponent.placeholderToString(toPlaceholder.fixed, toPlaceholder.key || 'to', toPlaceholder.defaultValue);

        const subjPlaceholder = this.subjectFormGroup.value as { key: string; defaultValue: string; fixed: boolean };
        result.subj = EmailConfigDialogComponent.placeholderToString(subjPlaceholder.fixed, subjPlaceholder.key || 'subject', subjPlaceholder.defaultValue);

        const contentPlaceholder = this.contentFormGroup.value as { key: string; defaultValue: string; fixed: boolean };
        result.content = EmailConfigDialogComponent.placeholderToString(
            contentPlaceholder.fixed,
            contentPlaceholder.key || 'content',
            contentPlaceholder.defaultValue,
        );

        return result;
    }

    private static placeholderToString(fixed: boolean, placeholderName: string, defaultValue: string): string {
        if (fixed) {
            return defaultValue || '';
        } else if (defaultValue && defaultValue !== '') {
            return `{{${placeholderName}=${defaultValue}}}`;
        } else {
            return `{{${placeholderName}}}`;
        }
    }

    private static interpretStringAsPlaceholder(term: string): { key: string; defaultValue: string; fixed: boolean } {
        if (term.trim().startsWith('{{') && term.trim().endsWith('}}')) {
            const parts = term.replace(new RegExp('{{', 'g'), '').replace(new RegExp('}}', 'g'), '').split('=');
            if (parts.length < 2) {
                return {fixed: false, defaultValue: '', key: parts[0]};
            } else {
                return {fixed: false, defaultValue: parts.slice(1).join('='), key: parts[0]};
            }
        } else {
            return {fixed: true, defaultValue: term, key: ''};
        }
    }
}
