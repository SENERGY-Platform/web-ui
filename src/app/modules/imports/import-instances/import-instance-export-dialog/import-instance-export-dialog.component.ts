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
import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {ImportInstancesModel} from '../shared/import-instances.model';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {ImportTypesService} from '../../import-types/shared/import-types.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ImportTypeModel} from '../../import-types/shared/import-types.model';
import {ExportService} from '../../../exports/shared/export.service';
import {ExportModel, ExportValueModel} from '../../../exports/shared/export.model';
import {SelectionModel} from '@angular/cdk/collections';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {environment} from '../../../../../environments/environment';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatSort } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { snackError } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-import-instance-export-dialog',
    templateUrl: './import-instance-export-dialog.component.html',
    styleUrls: ['./import-instance-export-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, FormsModule, ReactiveFormsModule, MatError, MatErrorMessagesDirective, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton]
})
export class ImportInstanceExportDialogComponent implements OnInit {
    data = inject<ImportInstancesModel>(MAT_DIALOG_DATA);
    private dialogRef = inject<MatDialogRef<ImportInstanceExportDialogComponent>>(MatDialogRef);
    private importTypesService = inject(ImportTypesService);
    private snackBar = inject(MatSnackBar);
    private exportService = inject(ExportService);

    type: ImportTypeModel | undefined = undefined;
    ready = false;
    nameControl = new FormControl('', Validators.required);
    descControl = new FormControl('');

    values: ExportValueModel[] = [];
    valueSelection = new SelectionModel<ExportValueModel>(true, []);
    tags: ExportValueModel[] = [];

    @ViewChild(MatTable, { static: false }) table: MatTable<ExportValueModel> | undefined;

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
                snackError(this.snackBar, 'Error loading import type');
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
                snackError(this.snackBar, 'Error creating export');
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
