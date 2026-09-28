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
import { forkJoin, Subscription } from 'rxjs';
import {
    compareAspectIds,
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
import { aspectTreeFromAspectNodes } from '../../../../../core/components/aspect-select/aspect-select.model';
import { selectedAspectNodes } from '../../bpmn-js/properties-provider/aspects';

@Component({
    templateUrl: './task-config-dialog.component.html',
    styleUrls: ['./task-config-dialog.component.css'],
})
export class TaskConfigDialogComponent implements OnInit {
    optionsFormControl = new UntypedFormControl('');
    deviceClassFormControl = new UntypedFormControl('');
    aspectFormControl = new UntypedFormControl([]);
    functionFormControl = new UntypedFormControl({ value: '', disabled: true });
    completionStrategyFormControl = new UntypedFormControl('');
    retriesFormControl = new UntypedFormControl({ value: 0, disabled: true }, [rangeValidator(-1, 100)]);
    preferEventsFormControl = new UntypedFormControl({ value: false, disabled: true });



    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;
    limit = 20;

    result!: DeviceTypeSelectionResultModel;
    selection: DeviceTypeSelectionRefModel | null;
    functionTypes: DeviceTypeFunctionType[] = functionTypes;

    /** Selectable aspect nodes by id, including the nodes of the initial selection the listing may miss. */
    private aspectNodes = new Map<string, DeviceTypeAspectNodeModel>();
    private aspectFunctionsSubscription?: Subscription;

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
        const aspects = this.selectedAspectIds()
            .map((id) => this.aspectNodes.get(id))
            .filter((node): node is DeviceTypeAspectNodeModel => node !== undefined)
            .sort((a, b) => compareAspectIds(a.id, b.id));
        this.result = {
            aspect: (aspects[0] || null) as DeviceTypeAspectModel,
            aspects,
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

    private initOptions(): void {
        this.optionsFormControl.valueChanges.subscribe((options) => {
            this.deviceClassFormControl.setValue('');
            this.aspectFormControl.setValue([]);
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
        this.deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly().subscribe((nodes: DeviceTypeAspectNodeModel[]) => {
            nodes.forEach((node) => this.aspectNodes.set(node.id, node));
            this.aspects = aspectTreeFromAspectNodes([...this.aspectNodes.values()]);
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

        this.aspectFormControl.valueChanges.subscribe(() => {
            this.resetFunctions();
            this.getAspectFunctions(this.selectedAspectIds());
        });
    }

    /**
     * Several aspects in one criteria are an AND, so only a function offered for every selected aspect
     * can match. A newer selection cancels the requests of the previous one, which could otherwise
     * answer last and overwrite its function list.
     */
    private getAspectFunctions(aspectIds: string[]) {
        this.aspectFunctionsSubscription?.unsubscribe();
        if (aspectIds.length === 0) {
            this.functions = [];
            this.functionFormControl.disable();
            return;
        }
        this.aspectFunctionsSubscription = forkJoin(aspectIds.map((id) => this.deviceTypeService.getAspectsMeasuringFunctions(id))).subscribe(
            (functionLists: DeviceTypeFunctionModel[][]) => {
                const [first, ...rest] = functionLists;
                this.functions = first.filter((f) => rest.every((list) => list.some((other) => other.id === f.id)));
            },
        );
    }

    private selectedAspectIds(): string[] {
        return this.aspectFormControl.value || [];
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
            const selectedNodes = selectedAspectNodes(this.selection) as DeviceTypeAspectNodeModel[];
            selectedNodes.forEach((node) => this.aspectNodes.set(node.id, node));
            this.aspects = aspectTreeFromAspectNodes([...this.aspectNodes.values()]);
            this.aspectFormControl.setValue(selectedNodes.map((node) => node.id));
            this.functionTypes.forEach((functionType: DeviceTypeFunctionType) => {
                if (this.selection !== null && functionType.rdf_type === this.selection.function.rdf_type) {
                    this.optionsFormControl.setValue(functionType.text);
                    if (functionType.text === 'Controlling') {
                        this.getDeviceClassFunctions(this.selection.device_class);
                    }
                    if (functionType.text === 'Measuring') {
                        this.completionStrategyFormControl.disable();
                        this.getAspectFunctions(this.selectedAspectIds());
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
