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
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImportInstanceConfigModel, ImportInstancesModel } from '../import-instances/shared/import-instances.model';
import { ImportInstancesService } from '../import-instances/shared/import-instances.service';
import { ImportTypesService } from '../import-types/shared/import-types.service';
import { ImportTypeConfigModel, ImportTypeModel } from '../import-types/shared/import-types.model';
import {FormArray, FormGroup, UntypedFormBuilder, Validators} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { typeValueValidator } from '../validators/type-value-validator';

@Component({
    selector: 'senergy-import-deploy-dialog',
    templateUrl: './import-deploy-edit-dialog.component.html',
    styleUrls: ['./import-deploy-edit-dialog.component.css'],
})
export class ImportDeployEditDialogComponent implements OnInit {
    form = this.fb.group({
        id: { value: '', disabled: true },
        name: ['', Validators.required],
        import_type_id: { value: '', disabled: true },
        image: { value: '', disabled: true },
        kafka_topic: { value: '', disabled: true },
        configs: this.fb.array([]),
        restart: true,
        created_at: undefined,
        updated_at: undefined,
        generated: false,
    });

    editMode = false;

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';
    UNKNOWN = 'unknown';

    types: Map<string, string> = new Map();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ImportInstancesModel,
        private fb: UntypedFormBuilder,
        private dialogRef: MatDialogRef<ImportDeployEditDialogComponent>,
        private importTypesService: ImportTypesService,
        private snackBar: MatSnackBar,
        private importInstancesService: ImportInstancesService,
    ) {}

    type: ImportTypeModel | undefined = undefined;
    ready = false;
    configs: FormGroup[] = [];

    ngOnInit(): void {
        this.types.set(this.STRING, 'string');
        this.types.set(this.INTEGER, 'int');
        this.types.set(this.FLOAT, 'float');
        this.types.set(this.BOOLEAN, 'bool');
        this.types.set(this.STRUCTURE, 'Structure');
        this.types.set(this.LIST, 'List');

        this.editMode = this.data.id !== undefined && this.data.id.length > 0;
        this.form.patchValue(this.data);
        this.importTypesService.getImportType(this.data.import_type_id).subscribe(
            (type) => {
                this.type = type;
                this.type.configs.forEach((config) => {
                    const group = this.newConfigGroupFromType(config);

                    const configured = this.data.configs?.find((instanceConfig) => instanceConfig.name === config.name);
                    if (configured !== undefined) {
                        if (config.type !== this.STRING) {
                            group.patchValue({ value: JSON.stringify(configured.value) });
                        } else {
                            group.patchValue({ value: configured.value });
                        }
                    }
                    (this.form.get('configs') as FormArray).push(group);
                });
                this.data.configs?.forEach((instanceConfig) => {
                    const t = type.configs?.find((typeConfig) => instanceConfig.name === typeConfig.name);
                    if (t === undefined) {
                        // instance has more configs than type
                        const group = this.newConfigGroupFromInstance(instanceConfig);
                        (this.form.get('configs') as FormArray).push(group);
                    }
                });
                this.form.patchValue({ image: type.image });
                if (this.data.restart === undefined) {
                    this.form.patchValue({ restart: type.default_restart });
                }
                this.configs = (this.form.get('configs') as FormArray).controls as FormGroup[];
                this.ready = true;
            },
            (err) => {
                console.error(err);
                this.snackBar.open('Error loading import type', 'close', { panelClass: 'snack-bar-error' });
                this.dialogRef.close();
            },
        );
    }

    private newConfigGroupFromType(config: ImportTypeConfigModel): FormGroup {
        const group = this.fb.group(
            {
                name: [config.name, Validators.required],
                value: ['', Validators.required],
                type: config.type,
                description: config.description,
            },
            { validators: typeValueValidator('type', 'value', false) },
        );
        if (config.type !== this.STRING) {
            group.patchValue({ value: JSON.stringify(config.default_value) });
        } else {
            group.patchValue({ value: config.default_value });
        }
        return group;
    }

    private newConfigGroupFromInstance(config: ImportInstanceConfigModel): FormGroup {
        return this.fb.group({
            name: config.name,
            value: config.value,
            description: '',
            type: this.UNKNOWN,
        });
    }

    save() {
        const instance = this.form.getRawValue();
        (instance.configs as any[]).forEach((config, i) => {
            if (config.type !== this.STRING && config.type !== this.UNKNOWN) {
                config.value = JSON.parse(config.value);
                instance.configs[i] = config;
            }
        });
        this.importInstancesService.saveImportInstance(instance).subscribe(
            () => this.dialogRef.close(true),
            (err) => {
                if (err !== undefined && err !== null && err.status !== undefined && err.status === 402) {
                    this.snackBar.open('Insufficient budget', 'close', {panelClass: 'snack-bar-error'});
                } else {
                    console.error(err);
                    this.snackBar.open('Error saving', 'close', {panelClass: 'snack-bar-error'});
                }
            },
        );
    }

    close() {
        this.dialogRef.close();
    }
}
