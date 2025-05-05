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
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
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
import { rangeValidator } from '../../../../../core/validators/range.validator';
import { CompareWithFn, GroupValueFn } from '@ng-matero/extensions/select';

interface DeviceTypeAspectNodeModelWithRootName extends DeviceTypeAspectNodeModel {
    root_name?: string;
}

@Component({
    templateUrl: './task-config-dialog.component.html',
    styleUrls: ['./task-config-dialog.component.css'],
})
export class TaskConfigDialogComponent implements OnInit {
    optionsFormControl = new UntypedFormControl('');
    deviceClassFormControl = new UntypedFormControl('');
    aspectFormControl = new UntypedFormControl('');
    functionFormControl = new UntypedFormControl({ value: '', disabled: true });
    completionStrategyFormControl = new UntypedFormControl('');
    retriesFormControl = new UntypedFormControl({ value: 0, disabled: true }, [rangeValidator(-1, 100)]);
    preferEventsFormControl = new UntypedFormControl({ value: false, disabled: true });



    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    aspects: DeviceTypeAspectNodeModelWithRootName[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;
    limit = 20;

    result!: DeviceTypeSelectionResultModel;
    selection: DeviceTypeSelectionRefModel | null;
    functionTypes: DeviceTypeFunctionType[] = functionTypes;

    constructor(
        private dialogRef: MatDialogRef<TaskConfigDialogComponent>,
        private dtService: DeviceTypeService,
        private _formBuilder: UntypedFormBuilder,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        @Inject(MAT_DIALOG_DATA) private data: { selection: DeviceTypeSelectionRefModel | null },
    ) {
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
            retries: this.retriesFormControl.value,
            prefer_events: this.preferEventsFormControl.value
        };
        this.dialogRef.close(this.result);
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    getRootAspect(): GroupValueFn {
        return (_, children): any => {
            children = children as DeviceTypeAspectNodeModelWithRootName[];
            const id = children[0].root_id;
            if (id !== undefined) {
                return { id };
            }
            return null;
        };
    }

    compareAspectsWith: CompareWithFn = (a: DeviceTypeAspectNodeModelWithRootName | string, b: DeviceTypeAspectNodeModelWithRootName | string) => {
        const aIsStr = typeof a === 'string' || a instanceof String;
        const bIsStr = typeof b === 'string' || b instanceof String;

        if (aIsStr && bIsStr) {
            return a === b;
        }
        if (!aIsStr && !bIsStr) {
            return a.id === b.id;
        }
        if (aIsStr) {
            return a === (b as DeviceTypeAspectNodeModelWithRootName).id;
        }
        return a.id === b;
    };

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
                this.preferEventsFormControl.patchValue(false);
                this.preferEventsFormControl.disable();
            }
            if (completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
                this.preferEventsFormControl.enable();
                this.retriesFormControl.patchValue(-1);
            }
        });
    }

    private getDeviceClasses(): void {
        this.deviceTypeService
            .getDeviceClassesWithControllingFunction()
            .subscribe((deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                this.deviceClasses = deviceTypeDeviceClasses;
            });
    }

    private getAspects(): void {
        this.deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly().subscribe((aspects: DeviceTypeAspectNodeModel[]) => {
            const tmp: DeviceTypeAspectNodeModelWithRootName[] = [];
            aspects.forEach(a => {
                const t = a as DeviceTypeAspectNodeModelWithRootName;
                t.root_name = aspects.find(x => x.id === t.root_id)?.name;
                tmp.push(t);
            });
            this.aspects = tmp;
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
            this.conceptsService
                .getConceptWithCharacteristics(func.concept_id)
                .subscribe((concept: ConceptsCharacteristicsModel | null) => {
                    if (concept && concept.base_characteristic_id) {
                        let index = -1;
                        concept.characteristics.forEach((char: DeviceTypeCharacteristicsModel, i: number) => {
                            if (char.id === concept.base_characteristic_id) {
                                index = i;
                            }
                        });
                        if (index >= 0) {
                            this.characteristic = concept.characteristics[index];
                        } else {
                            console.error('base characteristic ' + concept.base_characteristic_id + ' is not characteristic of the concept');
                        }
                    } else {
                        if (!concept) {
                            console.error('unknown concept');
                        } else if (!concept.base_characteristic_id) {
                            console.error('missing concept base characteristic');
                        }
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
            this.preferEventsFormControl.setValue(this.selection.prefer_events || false);
            if (this.selection.completionStrategy === 'optimistic') {
                this.retriesFormControl.disable();
                this.preferEventsFormControl.disable();
            }
            if (this.selection.completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
                this.preferEventsFormControl.enable();
            }
        } else {
            this.optionsFormControl.setValue('Controlling');
            this.completionStrategyFormControl.setValue('optimistic');
        }
    }
}
