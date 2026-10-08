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
import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ImportTypeContentVariableModel } from '../../import-types/shared/import-types.model';
import { AbstractControl, UntypedFormBuilder, ValidationErrors, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    contentVariableAspectIds,
    deprecatedAspectAlias,
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { AspectSelectComponent } from '../../../../core/components/aspect-select/aspect-select.component';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';

interface DeviceTypeCharacteristicsModelWithGroup extends DeviceTypeCharacteristicsModel {
    group?: string;
}

@Component({
    selector: 'senergy-import-content-variable-dialog',
    templateUrl: './content-variable-dialog.component.html',
    styleUrls: ['./content-variable-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, AspectSelectComponent, MtxSelect, MtxOption, MatCheckbox, MatTooltip, MatDialogActions, MatButton]
})
export class ContentVariableDialogComponent implements OnInit {
    static notNamedTimeAndNotEmpty(control: AbstractControl): ValidationErrors | null {
        if (control.value === '') {
            const err = { notNamedTimeAndNotEmpty: 'Name required' };
            control.setErrors(err);
            return err;
        }
        if (control.value === 'time') {
            const err = { notNamedTimeAndNotEmpty: 'Name time not allowed at this level' };
            // necessary for analytics pipelines
            control.setErrors(err);
            return err;
        }
        control.setErrors(null);
        return null;
    }

    form = this.fb.group({
        name: [undefined, Validators.required],
        type: [undefined, Validators.required],
        characteristic_id: null,
        use_as_tag: false,
        aspect_ids: [[] as string[]],
        function_id: undefined,
    });

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';

    types: { id: string; name: string }[] = [
        { id: this.STRING, name: 'string' },
        { id: this.INTEGER, name: 'int' },
        { id: this.FLOAT, name: 'float' },
        { id: this.BOOLEAN, name: 'bool' },
        { id: this.STRUCTURE, name: 'Structure' },
        { id: this.LIST, name: 'List' },
    ];

    constructor(
        @Inject(MAT_DIALOG_DATA)
        public data: {
            content?: ImportTypeContentVariableModel;
            functions: DeviceTypeFunctionModel[];
            aspects: DeviceTypeAspectModel[];
            typeConceptCharacteristics: Map<string, Map<string, DeviceTypeCharacteristicsModel[]>>;
            infoOnly: boolean;
            nameTimeAllowed: boolean;
        },
        private fb: UntypedFormBuilder,
        private dialogRef: MatDialogRef<ContentVariableDialogComponent>,
    ) {
    }

    ngOnInit(): void {
        if (!this.data.nameTimeAllowed) {
            this.form.get('name')?.setValidators([ContentVariableDialogComponent.notNamedTimeAndNotEmpty]);
        }
        if (this.data.content !== undefined) {
            this.form.patchValue(this.data.content);
            // aspect_ids reads list-first with a fallback to the deprecated aspect_id, so a type
            // stored before the list existed still opens with its one aspect selected.
            this.form.patchValue({ aspect_ids: contentVariableAspectIds(this.data.content) });
        } else {
            this.data.content = {} as ImportTypeContentVariableModel;
        }
        if (this.data.infoOnly) {
            this.form.disable();
        }
        this.form.get('type')?.valueChanges.subscribe((_) => {
            this.form.patchValue({ characteristic_id: null });
        });
    }

    save() {
        if (this.data.content === undefined) {
            console.error('undefined content');
            return;
        }
        const aspectIds: string[] = this.form.get('aspect_ids')?.value || [];
        this.data.content.name = this.form.get('name')?.value;
        this.data.content.type = this.form.get('type')?.value;
        this.data.content.characteristic_id = this.form.get('characteristic_id')?.value;
        this.data.content.use_as_tag = this.form.get('use_as_tag')?.value;
        this.data.content.aspect_ids = aspectIds;
        // Derived fresh from the current selection rather than carried over, so an aspect removed
        // here is not resurrected by a stale aspect_id when the import-repository folds it back in.
        this.data.content.aspect_id = deprecatedAspectAlias(aspectIds);
        this.data.content.function_id = this.form.get('function_id')?.value;
        this.dialogRef.close(this.data.content);
    }

    close() {
        this.dialogRef.close();
    }

    getConceptCharacteristics(): DeviceTypeCharacteristicsModelWithGroup[] {
        const type = this.form.get('type')?.value;
        const res: DeviceTypeCharacteristicsModelWithGroup[] = [];
        this.data.typeConceptCharacteristics.get(type)?.forEach((v, k) => {
            v.forEach(e => {
                (e as DeviceTypeCharacteristicsModelWithGroup).group = k;
                res.push(e);
            });
        });
        return res;
    }

    nameHint(): string {
        const errors = this.form.get('name')?.errors;
        if (errors === undefined || errors === null || errors['notNamedTimeAndNotEmpty'] === undefined) {
            return '';
        }
        return errors['notNamedTimeAndNotEmpty'];
    }

}
