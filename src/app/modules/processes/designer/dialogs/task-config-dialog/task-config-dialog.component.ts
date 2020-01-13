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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatRadioChange} from '@angular/material';
import {FormBuilder, FormControl, Validators} from '@angular/forms';
import {
    DeviceTypeAspectModel, DeviceTypeCharacteristicsModel,
    DeviceTypeDeviceClassModel, DeviceTypeFunctionModel, DeviceTypeFunctionType, functionTypes,
} from '../../../../devices/device-types-overview/shared/device-type.model';
import {
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel
} from '../../../../devices/device-types-overview/shared/device-type-selection.model';
import {DeviceTypeService} from '../../../../devices/device-types-overview/shared/device-type.service';
import {ConceptsService} from '../../../../devices/concepts/shared/concepts.service';
import {ConceptsCharacteristicsModel} from '../../../../devices/concepts/shared/concepts-characteristics.model';

@Component({
    templateUrl: './task-config-dialog.component.html',
    styleUrls: ['./task-config-dialog.component.css'],
})
export class TaskConfigDialogComponent implements OnInit {
    optionsFormControl = new FormControl('');
    deviceClassFormControl = new FormControl('');
    aspectFormControl = new FormControl('');
    functionFormControl = new FormControl({value: '', disabled: true});
    completionStrategyFormControl = new FormControl('');
    retriesFormControl = new FormControl({value: 0, disabled: true}, [Validators.min(0), Validators.max(100)]);

    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;
    limit = 20;

    result!: DeviceTypeSelectionResultModel;
    selection: DeviceTypeSelectionRefModel | null;
    functionTypes: DeviceTypeFunctionType[] = functionTypes;

    constructor(
        private dialogRef: MatDialogRef<TaskConfigDialogComponent>,
        private dtService: DeviceTypeService,
        private _formBuilder: FormBuilder,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        @Inject(MAT_DIALOG_DATA) private data: { selection: DeviceTypeSelectionRefModel | null }) {
        this.selection = this.data.selection;
    }

    ngOnInit() {
        this.initSelection();
        this.initOptions();
        this.getDeviceClasses();
        this.getAspects();
        this.initFunctions();
        this.initCompletionStrategy();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.result = {
            aspect: this.aspectFormControl.value || null,
            function: this.functionFormControl.value,
            device_class: this.deviceClassFormControl.value || null,
            characteristic: this.characteristic,
            completionStrategy: this.completionStrategyFormControl.value,
            retries: this.retriesFormControl.value
        };
        this.dialogRef.close(this.result);
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    private initOptions(): void {
        this.optionsFormControl.valueChanges.subscribe((options) => {
            this.deviceClassFormControl.setValue('');
            this.aspectFormControl.setValue('');
            this.functionFormControl.setValue('');
            this.functionFormControl.disable();
            if (options === 'Measuring') {
                this.completionStrategyFormControl.patchValue('pessimistic');
                this.completionStrategyFormControl.disable();
            }
            if (options === 'Controlling') {
                this.completionStrategyFormControl.patchValue('optimistic');
                this.completionStrategyFormControl.enable();
            }
        });
    }

    private initCompletionStrategy(): void {
        this.completionStrategyFormControl.valueChanges.subscribe((completionStrategy) => {
            if (completionStrategy === 'optimistic') {
                this.retriesFormControl.patchValue(0);
                this.retriesFormControl.disable();
            }
            if (completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
            }
        });
    }

    private getDeviceClasses(): void {
        this.deviceTypeService.getDeviceClassesWithControllingFunction().subscribe(
            (deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                this.deviceClasses = deviceTypeDeviceClasses;
            });
    }

    private getAspects(): void {
        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe(
            (aspects: DeviceTypeAspectModel[]) => {
                this.aspects = aspects;
            });
    }

    private initFunctions(): void {
        this.functionFormControl.valueChanges.subscribe((func: DeviceTypeFunctionModel) => {
            this.getBaseCharacteristics(func);
        });
        this.deviceClassFormControl.valueChanges.subscribe((deviceClass: DeviceTypeDeviceClassModel) => {
            this.resetFunctions();
            this.getDeviceClassFunctions(deviceClass);
        });

        this.aspectFormControl.valueChanges.subscribe((aspect: DeviceTypeAspectModel) => {
            this.resetFunctions();
            this.getAspectFunctions(aspect);
        });
    }

    private getAspectFunctions(aspect: DeviceTypeAspectModel) {
        this.deviceTypeService.getAspectsMeasuringFunctions(aspect.id).subscribe((functions: DeviceTypeFunctionModel[]) => {
            this.functions = functions;
        });
    }

    private getDeviceClassFunctions(deviceClass: DeviceTypeDeviceClassModel) {
        this.deviceTypeService.getDeviceClassesControllingFunctions(deviceClass.id).subscribe((functions: DeviceTypeFunctionModel[]) => {
            this.functions = functions;
        });
    }

    private resetFunctions() {
        this.functions = [];
        this.functionFormControl.setValue('');
        this.functionFormControl.enable();
    }

    private getBaseCharacteristics(func: DeviceTypeFunctionModel): void {
        if (func && func.concept_id !== '') {
            this.conceptsService.getConceptWithCharacteristics(func.concept_id).subscribe(
                (concept: (ConceptsCharacteristicsModel | null)) => {
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
        if (this.selection !== null) {
            this.deviceClassFormControl.setValue(this.selection.device_class);
            this.aspectFormControl.setValue(this.selection.aspect);
            this.functionTypes.forEach((functionType: DeviceTypeFunctionType) => {
                if (this.selection !== null && functionType.rdf_type === this.selection.function.rdf_type) {
                    this.optionsFormControl.setValue(functionType.text);
                    if (functionType.text === 'Controlling') {
                        this.getDeviceClassFunctions(this.selection.device_class);
                    }
                    if (functionType.text === 'Measuring') {
                        this.completionStrategyFormControl.disable();
                        this.getAspectFunctions(this.selection.aspect);
                    }
                }
            });
            this.functionFormControl.setValue(this.selection.function);
            this.functionFormControl.enable();
            this.getBaseCharacteristics(this.selection.function);
            this.completionStrategyFormControl.setValue(this.selection.completionStrategy);
            this.retriesFormControl.setValue(this.selection.retries || 0);
            if (this.selection.completionStrategy === 'optimistic') {
                this.retriesFormControl.disable();
            }
            if (this.selection.completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
            }
        } else {
            this.optionsFormControl.setValue('Controlling');
            this.completionStrategyFormControl.setValue('optimistic');
        }
    }
}
