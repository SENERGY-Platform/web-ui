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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatTable} from '@angular/material';
import {FormControl, Validators} from '@angular/forms';
import {Observable} from 'rxjs';
import {ValueTypesModel} from '../shared/value-types.model';
import {map, startWith} from 'rxjs/operators';

interface BaseTypeGroup {
    name: string;
    baseTypes: {
        name: string;
        url: string;
        primitive: boolean;
    }[];
}

interface DataTableStructure {
    valuetype: ValueTypesModel;
    name: string;
}

const ELEMENT_DATA: BaseTypeGroup[] = [
    {
        name: 'Objects', baseTypes: [
            {name: 'structure', url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#structure', primitive: false},
            {name: 'list', url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#list', primitive: false},
            {name: 'map', url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#map', primitive: false},
            {name: 'index_structure', url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#index_structure', primitive: false},
        ]
    },
    {
        name: 'Primitives', baseTypes: [
            {name: 'string', url: 'http://www.w3.org/2001/XMLSchema#string', primitive: true},
            {name: 'integer', url: 'http://www.w3.org/2001/XMLSchema#integer', primitive: true},
            {name: 'decimal', url: 'http://www.w3.org/2001/XMLSchema#decimal', primitive: true},
            {name: 'boolean', url: 'http://www.w3.org/2001/XMLSchema#boolean', primitive: true},
        ]
    }];

@Component({
    templateUrl: './value-types-new-dialog.component.html',
    styleUrls: ['./value-types-new-dialog.component.css']
})
export class ValueTypesNewDialogComponent implements OnInit {
    baseTypeGroupsControl = new FormControl('', [Validators.required]);
    valuetypeFormControl = new FormControl('');
    nameListFormControl = new FormControl('');
    nameFormControl = new FormControl('', [Validators.required]);
    descFormControl = new FormControl('', [Validators.required]);
    literalFormControl = new FormControl('', [Validators.required]);

    columnsToDisplay: string[] = ['position', 'name', 'valuetype', 'action'];
    data: DataTableStructure[] = [];

    baseTypeGroups: BaseTypeGroup[] = ELEMENT_DATA;
    valuetypes: ValueTypesModel[];
    filteredValuetypes: Observable<ValueTypesModel[]> = new Observable();
    hideAdd = false;
    disableCreate = true;

    @ViewChild(MatTable) table!: MatTable<DataTableStructure>;

    constructor(private dialogRef: MatDialogRef<ValueTypesNewDialogComponent>,
                @Inject(MAT_DIALOG_DATA) private input: { valuetypes: ValueTypesModel[] }) {
        this.valuetypes = input.valuetypes;
    }

    ngOnInit(): void {
        this.reset();
        this.initValuetypeFilter();
        this.checkValueChanges();
    }

    close(): void {
        this.dialogRef.close();
    }

    create(): void {

        const resp: ValueTypesModel = {
            name: this.nameFormControl.value,
            description: this.descFormControl.value,
            base_type: this.baseTypeGroupsControl.value.url,
            fields: [],
            literal: this.literalFormControl.value,
        };

        this.data.forEach((item: DataTableStructure) => {
            if (resp.fields) {
                resp.fields.push({name: item.name, type: item.valuetype});
            }
        });
        this.dialogRef.close(resp);
    }

    displayFn(input?: ValueTypesModel): string | undefined {
        return input ? input.name : undefined;
    }

    deleteRow(index: number) {
        this.hideAdd = false;
        this.data.splice(index, 1);
        this.table.renderRows();
        this.checkCreateButton();
    }

    addColumn() {
        if (this.valuetypes.indexOf(this.valuetypeFormControl.value) === -1) {
            this.valuetypeFormControl.setErrors({'invalid': true});
        }

        if (this.nameListFormControl.value === '') {
            this.nameListFormControl.setErrors({'invalid': true});
        }

        if (!this.valuetypeFormControl.hasError('invalid') && !this.nameListFormControl.hasError('invalid')) {
            this.data.push({
                name: this.nameListFormControl.value,
                valuetype: this.valuetypeFormControl.value,
            });

            this.valuetypeFormControl.reset('');
            this.nameListFormControl.reset('');
            if (this.baseTypeGroupsControl.value.name === 'list' || this.baseTypeGroupsControl.value.name === 'map') {
                this.hideAdd = true;
            }
            this.table.renderRows();
            this.checkCreateButton();
        }
    }

    private checkValueChanges() {
        this.nameFormControl.valueChanges.subscribe(() => {
            this.checkCreateButton();
        });
        this.descFormControl.valueChanges.subscribe(() => {
            this.checkCreateButton();
        });
        this.baseTypeGroupsControl.valueChanges.subscribe(() => {
            this.checkCreateButton();
        });
        this.literalFormControl.valueChanges.subscribe(() => {
            this.checkCreateButton();
        });
    }

    private checkCreateButton(): void {
        if (this.nameFormControl.value === '' ||
            this.descFormControl.value === '' ||
            this.baseTypeGroupsControl.value === '') {
            this.disableCreate = true;
        } else {
            if (this.baseTypeGroupsControl.value.primitive === true) {
                if (this.literalFormControl.value === '') {
                    this.disableCreate = true;
                } else {
                    this.disableCreate = false;
                }
            } else {
                if (this.data.length > 0) {
                    this.disableCreate = false;
                } else {
                    this.disableCreate = true;
                }
            }
        }
    }

    private _filter(value: string): ValueTypesModel[] {
        const filterValue = value.toLowerCase();
        return this.valuetypes.filter(option => {
            if (option.name) {
                return option.name.toLowerCase().indexOf(filterValue) === 0;
            }
            return false;
        });
    }

    private reset() {
        this.baseTypeGroupsControl.valueChanges.subscribe(() => {
            this.valuetypeFormControl.reset('');
            this.nameListFormControl.reset('');
            this.literalFormControl.reset('');
            this.hideAdd = false;
            this.data = [];
        });
    }

    private initValuetypeFilter() {
        this.filteredValuetypes = this.valuetypeFormControl.valueChanges.pipe(
            startWith<string | ValueTypesModel>(''),
            map(value => typeof value === 'string' ? value : value.name),
            map(name => name ? this._filter(name) : this.valuetypes.slice())
        );
    }
}
