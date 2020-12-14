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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ImportTypeContentVariableModel} from '../../import-types/shared/import-types.model';
import {CharacteristicsPermSearchModel} from '../../../devices/characteristics/shared/characteristics-perm-search.model';
import {FormBuilder} from '@angular/forms';

@Component({
    selector: 'senergy-import-content-variable-dialog',
    templateUrl: './content-variable-dialog.component.html',
    styleUrls: ['./content-variable-dialog.component.css']
})
export class ContentVariableDialogComponent implements OnInit {

    form = this.fb.group({
        name: '',
        type: '',
        characteristic_id: '',
        use_as_tag: false
    });

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';

    types: { id: string; name: string }[] = [
        {id: this.STRING, name: 'string'},
        {id: this.INTEGER, name: 'int'},
        {id: this.FLOAT, name: 'float'},
        {id: this.BOOLEAN, name: 'bool'},
        {id: this.STRUCTURE, name: 'Structure'},
        {id: this.LIST, name: 'List'},
    ];

    constructor(@Inject(MAT_DIALOG_DATA) public data:
                    { content?: ImportTypeContentVariableModel, characteristics: CharacteristicsPermSearchModel[], infoOnly: boolean },
                private fb: FormBuilder, private dialogRef: MatDialogRef<ContentVariableDialogComponent>) {
    }


    ngOnInit(): void {
        if (this.data.content !== undefined) {
            this.form.patchValue(this.data.content);
        } else {
            this.data.content = {} as ImportTypeContentVariableModel;
        }
        if (this.data.infoOnly) {
            this.form.disable();
        }
    }


    save() {
        if (this.data.content === undefined) {
            console.error('undefined content');
            return;
        }
        this.data.content.name = this.form.get('name')?.value;
        this.data.content.type = this.form.get('type')?.value;
        this.data.content.characteristic_id = this.form.get('characteristic_id')?.value;
        this.data.content.use_as_tag = this.form.get('use_as_tag')?.value;
        this.dialogRef.close(this.data.content);
    }

    close() {
        this.dialogRef.close();
    }
}
