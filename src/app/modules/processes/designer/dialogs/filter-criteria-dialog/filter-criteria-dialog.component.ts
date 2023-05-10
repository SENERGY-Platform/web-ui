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

import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {FormBuilder, FormControl, UntypedFormBuilder, UntypedFormControl, Validators} from '@angular/forms';
import {
    DeviceTypeAspectModel, DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeFunctionType,
    functionTypes,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import {
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel,
} from '../../../../metadata/device-types-overview/shared/device-type-selection.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../../metadata/concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../../metadata/concepts/shared/concepts-characteristics.model';
import { FilterCriteriaDialogResultModel } from '../../shared/designer-dialog.model';
import { Observable } from 'rxjs';

@Component({
    templateUrl: './filter-criteria-dialog.component.html',
    styleUrls: ['./filter-criteria-dialog.component.css'],
})
export class FilterCriteriaDialogComponent implements OnInit {
    aspectFormControl = new UntypedFormControl('');
    functionFormControl = new UntypedFormControl({ value: '', disabled: true });

    aspects: Map<string, DeviceTypeAspectModel[]> = new Map();
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;
    limit = 20;

    result!: FilterCriteriaDialogResultModel;

    constructor(
        private dialogRef: MatDialogRef<FilterCriteriaDialogComponent>,
        private _formBuilder: UntypedFormBuilder,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        @Inject(MAT_DIALOG_DATA)
        private data: {
            aspect: string | null | undefined;
            iotfunction: string | null | undefined;
        },
    ) {}

    ngOnInit() {
        this.initOptions();
        this.initFunctionsUpdate();
        this.getAspects();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.result = {
            aspect: this.aspectFormControl.value || '',
            iotfunction: this.functionFormControl.value.id || '',
            characteristic: this.characteristic.id || '',
            label: this.functionFormControl.value.name + ' ' + this.characteristic.name,
        };
        this.dialogRef.close(this.result);
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    private initOptions(): void {
        this.aspectFormControl.setValue(undefined);
        this.functionFormControl.setValue(undefined);
        this.functionFormControl.disable();
    }

    private initFunctionsUpdate(): void {
        this.functionFormControl.valueChanges.subscribe((func: DeviceTypeFunctionModel) => {
            this.getBaseCharacteristics(func);
        });

        this.aspectFormControl.valueChanges.subscribe((aspectId: string) => {
            this.resetFunctions();
            this.getAspectFunctions(aspectId);
        });
    }

    private getAspectFunctions(aspectId: string) {
        this.deviceTypeService.getAspectsMeasuringFunctionsWithImports(aspectId).subscribe((functions: DeviceTypeFunctionModel[]) => {
            this.functions = functions;

            // handle init value
            if (this.data.iotfunction) {
                functions.forEach((value) => {
                    if (value.id === this.data.iotfunction) {
                        this.functionFormControl.setValue(value);
                        this.data.iotfunction = null;
                    }
                });
            }
        });
    }

    private getAspects() {
        this.deviceTypeService.getAspectNodesWithMeasuringFunction().subscribe((aspects: DeviceTypeAspectNodeModel[]) => {
            const tmp: Map<string, DeviceTypeAspectNodeModel[]> = new Map();
            const asp: Map<string, DeviceTypeAspectNodeModel[]> = new Map();
            aspects.forEach(a => {
                if (!tmp.has(a.root_id)) {
                    tmp.set(a.root_id, []);
                }
                tmp.get(a.root_id)?.push(a);
            });
            tmp.forEach((v, k) => asp.set(aspects.find(a => a.id === k)?.name || '', v));
            // handle init value
            if (this.data.aspect) {
                const sel = aspects.find(value => value.id === this.data.aspect);
                if (sel !== undefined) {
                    this.aspectFormControl.setValue(sel.id);
                    this.data.aspect = null;
                }
            }
            this.aspects = asp;
        });
    }

    private resetFunctions() {
        this.functions = [];
        this.functionFormControl.setValue('');
        this.functionFormControl.enable();
    }

    private getBaseCharacteristics(func: DeviceTypeFunctionModel): void {
        if (func && func.concept_id !== '') {
            this.conceptsService
                .getConceptWithCharacteristics(func.concept_id)
                .subscribe((concept: ConceptsCharacteristicsModel | null) => {
                    if (concept) {
                        let index = -1;
                        concept.characteristics.forEach((char: DeviceTypeCharacteristicsModel, i: number) => {
                            if (char.id === concept.base_characteristic_id) {
                                index = i;
                            }
                        });
                        this.characteristic = concept.characteristics[index];
                    }
                });
        } else {
            this.characteristic = {} as DeviceTypeCharacteristicsModel;
        }
    }

    private initSelection() {
        if (this.data.iotfunction) {
            this.functions.forEach((value) => {
                if (value.id === this.data.iotfunction) {
                    this.functionFormControl.setValue(value);
                    this.getBaseCharacteristics(value);
                }
            });
        }
    }
}
