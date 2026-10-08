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

import {Component, Inject, ChangeDetectionStrategy} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {TimescaleRuleModel, TimescaleRuleTemplateModel} from '../shared/timescale-rule.model';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {TimescaleRulesService} from '../shared/timescale-rules.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelContent } from '@angular/material/expansion';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'senergy-timescale-rules-create-edit-template',
    templateUrl: './timescale-rules-create-edit-template.component.html',
    styleUrls: ['./timescale-rules-create-edit-template.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, CdkTextareaAutosize, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelContent, MatDialogActions, MatButton]
})
export class TimescaleRulesCreateEditTemplateComponent {

    rule?: TimescaleRuleModel;
    editable = false;
    roles: string[] = [];
    users: any[] = [];
    form: FormGroup = this.fb.group({
        id: {value: '', disabled: true},
        description: [{value: '', disabled: true}, Validators.required],
        priority: [{value: 0, disabled: true}, Validators.required],
        group: [{value: '', disabled: true}, Validators.required],
        target: ['', Validators.required],
        users: [],
        roles: [],
        command_template: [{value: '', disabled: true}, Validators.required],
        delete_template: {value: '', disabled: true},
        errors: {value: null, disabled: true},
        template: ['', Validators.required],
    });
    create = false;
    templates: TimescaleRuleTemplateModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<TimescaleRulesCreateEditTemplateComponent>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: {
            rule?: TimescaleRuleModel;
            editable: boolean;
            roles: string[];
            users: any[];
            templates: TimescaleRuleTemplateModel[];
        },
        private timescaleRuleService: TimescaleRulesService,
    ) {
        this.rule = data.rule;
        this.roles = data.roles;
        this.users = data.users;
        this.editable = data.editable;
        this.templates = data.templates;
        if (this.rule !== undefined) {
            this.form.patchValue(this.rule);
        }
        if (!this.editable) {
            this.form.disable();
        }
        this.create = data.rule === undefined;
        this.form.get('template')?.valueChanges.subscribe(name => {
            const template = this.templates.find(t => t.name === name);
            if (template === undefined) {
                return;
            }
            this.form.patchValue({
                description: template.description,
                priority: template.priority,
                group: template.group,
                command_template: template.command_template,
                delete_template: template.delete_template,
            });
        });
    }

    save() {
        this.rule = this.form.getRawValue() as TimescaleRuleModel;
        this.rule.errors = undefined;
        this.rule.completed_run = false;
        if (this.create) {
            this.timescaleRuleService.createRuleFromTemplate(this.rule).subscribe(rule => {
                if (rule !== null) {
                    this.dialogRef.close(rule);
                }
            });
        } else {
            this.timescaleRuleService.updateRuleFromTemplate(this.rule).subscribe(t => {
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
