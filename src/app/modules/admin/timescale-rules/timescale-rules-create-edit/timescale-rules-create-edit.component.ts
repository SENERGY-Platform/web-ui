/*
 * Copyright 2023 InfAI (CC SES)
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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { TimescaleRuleModel } from '../shared/timescale-rule.model';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TimescaleRulesService } from '../shared/timescale-rules.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect } from '@ng-matero/extensions/select';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'senergy-timescale-rules-create-edit',
    templateUrl: './timescale-rules-create-edit.component.html',
    styleUrls: ['./timescale-rules-create-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, CdkTextareaAutosize, MatDialogActions, MatButton]
})
export class TimescaleRulesCreateEditComponent {
    private dialogRef = inject<MatDialogRef<TimescaleRulesCreateEditComponent>>(MatDialogRef);
    private fb = inject(FormBuilder);
    private timescaleRuleService = inject(TimescaleRulesService);


    rule?: TimescaleRuleModel;
    editable = false;
    roles: string[] = [];
    users: any[] = [];
    form: FormGroup = this.fb.group({
        id: { value: '', disabled: true },
        description: ['', Validators.required],
        priority: [0, Validators.required],
        group: ['', Validators.required],
        table_reg_ex: ['', Validators.required],
        users: [],
        roles: [],
        command_template: ['', Validators.required],
        delete_template: '',
        errors:  { value: null, disabled: true },
    });
    create = false;

    constructor() {
        const data = inject<{
            rule?: TimescaleRuleModel;
            editable: boolean;
            roles: string[];
            users: any[];
        }>(MAT_DIALOG_DATA);

        this.rule = data.rule;
        this.roles = data.roles;
        this.users = data.users;
        this.editable = data.editable;
        if (this.rule !== undefined) {
            this.form.patchValue(this.rule);
        }
        if (!this.editable) {
            this.form.disable();
        }
        this.create = data.rule === undefined;
    }

    save() {
        this.rule = this.form.getRawValue() as TimescaleRuleModel;
        this.rule.errors = undefined;
        this.rule.completed_run = false;
        if (this.create) {
            this.timescaleRuleService.createRule(this.rule).subscribe(rule => {
                if (rule !== null) {
                    this.dialogRef.close(rule);
                }
            });
        } else {
            this.timescaleRuleService.updateRule(this.rule).subscribe(t => {
                if (t) {
                    this.dialogRef.close(this.rule);
                }
            });
        }
    }

    close() {
        this.dialogRef.close();
    }
}
