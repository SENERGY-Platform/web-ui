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
import {ImportTypeModel} from '../../import-types/shared/import-types.model';
import {ExportService} from '../../../exports/shared/export.service';
import {ExportModel, ExportValueModel} from '../../../exports/shared/export.model';
import {SelectionModel} from '@angular/cdk/collections';
import {MatCheckboxChange} from '@angular/material/checkbox';
import {MatTable} from '@angular/material/table';
import {environment} from '../../../../../environments/environment';

@Component({
    selector: 'senergy-import-instance-export-dialog',
    templateUrl: './import-instance-export-dialog.component.html',
    styleUrls: ['./import-instance-export-dialog.component.css'],
})
export class ImportInstanceExportDialogComponent implements OnInit {
    type: ImportTypeModel | undefined = undefined;
    ready = false;
    nameControl = new FormControl('', Validators.required);
    descControl = new FormControl('');

    values: ExportValueModel[] = [];
    valueSelection = new SelectionModel<ExportValueModel>(true, []);
    tags: ExportValueModel[] = [];

    @ViewChild(MatTable, { static: false }) table: MatTable<ExportValueModel> | undefined;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ImportInstancesModel,
        private dialogRef: MatDialogRef<ImportInstanceExportDialogComponent>,
        private importTypesService: ImportTypesService,
        private snackBar: MatSnackBar,
        private exportService: ExportService,
    ) {}

    ngOnInit(): void {
        this.nameControl.setValue(this.data.name);

        this.importTypesService.getImportType(this.data.import_type_id).subscribe(
            (type) => {
                this.type = type;
                const valuesAndTags = this.importTypesService.parseImportTypeExportValues(type);
                valuesAndTags.forEach((v) => (v.Tag ? this.tags.push(v) : this.values.push(v)));
                this.valueSelection = new SelectionModel<ExportValueModel>(true, this.values);
                this.table?.renderRows();
                this.ready = true;
            },
            (err) => {
                console.error(err);
                this.snackBar.open('Error loading import type', 'close', { panelClass: 'snack-bar-error' });
                this.dialogRef.close();
            },
        );
    }

    create() {
        const values = this.valueSelection.selected;
        values.push(...this.tags);
        const exp: ExportModel = {
            Name: this.nameControl.value,
            Description: this.descControl.value,
            FilterType: 'import_id',
            Filter: this.data.id,
            Topic: this.data.kafka_topic,
            Generated: false,
            Offset: 'earliest',
            TimePath: 'time',
            Values: values,
            EntityName: this.data.name,
            ServiceName: this.data.import_type_id,
            ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
            TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
        } as ExportModel;
        this.exportService.startPipeline(exp).subscribe(
            (res) => {
                this.dialogRef.close(res);
            },
            (err) => {
                console.error(err);
                this.snackBar.open('Error creating export', 'close', { panelClass: 'snack-bar-error' });
            },
        );
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
