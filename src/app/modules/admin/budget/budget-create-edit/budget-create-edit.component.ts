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


import {Component, Inject} from '@angular/core';
import {BudgetModel} from '../shared/budget.model';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {BudgetService} from '../shared/budget.service';

@Component({
    selector: 'senergy-budget-create-edit',
    templateUrl: './budget-create-edit.component.html',
    styleUrls: ['./budget-create-edit.component.css']
})
export class BudgetCreateEditComponent {
    budget?: BudgetModel;
    editable = false;
    roles: string[] = [];
    users: any[] = [];
    form: FormGroup = this.fb.group({
        budget_identifier: ['', Validators.required],
        user_id: [''],
        role: [''],
        value: [0, Validators.min(0)],
    });

    constructor(
        private dialogRef: MatDialogRef<BudgetCreateEditComponent>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: {
            budget?: BudgetModel;
            editable: boolean;
            roles: string[];
            users: any[];
        },
        private budgetService: BudgetService,
    ) {
        this.budget = data.budget;
        this.roles = data.roles;
        this.users = data.users;
        this.editable = data.editable;
        this.form.get('role')?.valueChanges.subscribe(v => {
            const userIdForm = this.form.get('user_id');
            if (v !== null && v !== undefined && v !== '') {
                this.form.patchValue({user_id: undefined});
                if (userIdForm?.enabled) {
                    userIdForm.disable();
                }
            } else if (userIdForm?.disabled && this.editable) {
                userIdForm.enable();
            }
        });
        this.form.get('user_id')?.valueChanges.subscribe(v => {
            const roleForm = this.form.get('role');
            if (v !== null && v !== undefined && v !== '') {
                this.form.patchValue({role: undefined});
                if (roleForm?.enabled) {
                    roleForm.disable();
                }
            } else if (roleForm?.disabled && this.editable) {
                roleForm.enable();
            }
        });
        if (this.budget !== undefined) {
            this.form.patchValue(this.budget);
        }
        if (!this.editable) {
            this.form.disable();
        }
    }

    save() {
        this.budget = this.form.getRawValue() as BudgetModel;
        this.budgetService.setBudget(this.budget).subscribe(t => {
            if (t) {
                this.dialogRef.close(this.budget);
            }
        });
    }

    close() {
        this.dialogRef.close();
    }
}
