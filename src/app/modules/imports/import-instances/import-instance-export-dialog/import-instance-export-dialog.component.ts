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
import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ImportInstancesModel} from '../shared/import-instances.model';
import {FormControl, Validators} from '@angular/forms';
import {ImportTypesService} from '../../import-types/shared/import-types.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ImportTypeContentVariableModel, ImportTypeModel} from '../../import-types/shared/import-types.model';
import {ExportService} from '../../../data/export/shared/export.service';
import {ExportModel, ExportValueModel} from '../../../data/export/shared/export.model';
import {SelectionModel} from '@angular/cdk/collections';
import {MatCheckboxChange} from '@angular/material/checkbox';
import {MatTable} from '@angular/material/table';

@Component({
    selector: 'senergy-import-instance-export-dialog',
    templateUrl: './import-instance-export-dialog.component.html',
    styleUrls: ['./import-instance-export-dialog.component.css']
})
export class ImportInstanceExportDialogComponent implements OnInit {
    type: ImportTypeModel | undefined = undefined;
    ready = false;
    nameControl = new FormControl('', Validators.required);
    descControl = new FormControl('');

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    types: Map<string, string> = new Map();

    values: ExportValueModel[] = [];
    valueSelection = new SelectionModel<ExportValueModel>(true, []);
    tags: ExportValueModel[] = [];

    @ViewChild(MatTable, {static: false}) table: MatTable<ExportValueModel> | undefined;

    constructor(@Inject(MAT_DIALOG_DATA) public data: ImportInstancesModel,
                private dialogRef: MatDialogRef<ImportInstanceExportDialogComponent>,
                private importTypesService: ImportTypesService,
                private snackBar: MatSnackBar,
                private exportService: ExportService,
    ) {
    }

    ngOnInit(): void {
        this.types.set(this.STRING, 'string');
        this.types.set(this.INTEGER, 'int');
        this.types.set(this.FLOAT, 'float');
        this.types.set(this.BOOLEAN, 'bool');
        this.nameControl.setValue(this.data.name);

        this.importTypesService.getImportType(this.data.import_type_id).subscribe(type => {
            this.type = type;

            let exportContent = type.output.sub_content_variables?.find(sub => sub.name === 'value' && sub.type === this.STRUCTURE);
            if (exportContent === undefined) {
                exportContent = this.type.output;
            }
            this.fillValuesAndTags(this.values, this.tags, exportContent, '');
            this.valueSelection = new SelectionModel<ExportValueModel>(true, this.values);
            this.table?.renderRows();
            this.ready = true;
        }, err => {
            console.error(err);
            this.snackBar.open('Error loading import type', 'OK', {duration: 3000});
            this.dialogRef.close();
        });

    }


    create() {
        const exp: ExportModel = {
            Name: this.nameControl.value,
            Description: this.descControl.value,
            FilterType: 'import_id',
            Filter: this.data.id,
            Topic: this.data.kafka_topic,
            Generated: false,
            Offset: 'earliest',
            TimePath: 'time',
            Values: this.valueSelection.selected,
            Tags: this.tags,
            EntityName: this.data.name,
            ServiceName: this.data.import_type_id,
        } as ExportModel;
        this.exportService.startPipeline(exp).subscribe(res => {
            this.dialogRef.close(res);
        }, err => {
            console.error(err);
            this.snackBar.open('Error creating export', 'OK', {duration: 3000});
        });
    }

    private fillValuesAndTags(values: ExportValueModel[], tags: ExportValueModel[],
                              content: ImportTypeContentVariableModel, parentPath: string) {

        if (content.sub_content_variables === null || content.sub_content_variables.length === 0
            && this.types.has(content.type)) { // can only export primitive types
            const model = {
                Name: content.name,
                Path: parentPath + '.' + content.name,
                Type: this.types.get(content.type)
            } as ExportValueModel;
            if (content.use_as_tag) {
                if (content.type !== this.STRING) {
                    const tag = {
                        Name: content.name + '_tag',
                        Path: parentPath + '.' + content.name,
                        Type: this.types.get(this.STRING)
                    } as ExportValueModel;
                    tags.push(tag);
                    values.push(model); // tags are always strings, thus needing the value twice
                } else {
                    model.Type = this.types.get(this.STRING) || '';
                    tags.push(model);
                }
            } else {
                values.push(model);
            }
        } else {
            const path = parentPath === '' ? content.name : parentPath + '.' + content.name;
            content.sub_content_variables.forEach(sub => this.fillValuesAndTags(values, tags, sub, path));
        }
    }

    close() {
        this.dialogRef.close();
    }

    checkboxed(value: ExportValueModel, $event: MatCheckboxChange) {
        if ($event.checked) {
            this.valueSelection.select(value);
        } else {
            this.valueSelection.deselect(value);
        }
    }

    masterCheckboxed($event: MatCheckboxChange) {
        if ($event.checked) {
            this.valueSelection.select(...this.values);
        } else {
            this.valueSelection.deselect(...this.values);
        }
    }
}
