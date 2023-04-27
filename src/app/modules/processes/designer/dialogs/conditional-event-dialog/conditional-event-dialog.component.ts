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
import {
    MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
    MatLegacyDialogRef as MatDialogRef
} from '@angular/material/legacy-dialog';
import {UntypedFormBuilder, UntypedFormControl} from '@angular/forms';
import {
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../../metadata/device-types-overview/shared/device-type.service';
import {ConceptsService} from '../../../../metadata/concepts/shared/concepts.service';
import {ConceptsCharacteristicsModel} from '../../../../metadata/concepts/shared/concepts-characteristics.model';
import {ConditionalEventEditModel} from '../../shared/designer-dialog.model';

@Component({
    templateUrl: './conditional-event-dialog.component.html',
    styleUrls: ['./conditional-event-dialog.component.css'],
})
export class ConditionalEventDialogComponent implements OnInit {
    aspectFormControl = new UntypedFormControl('');
    functionFormControl = new UntypedFormControl({ value: '', disabled: true });

    aspects: Map<string, DeviceTypeAspectModel[]> = new Map();
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;

    limit = 20;

    result!: ConditionalEventEditModel;

    constructor(
        private dialogRef: MatDialogRef<ConditionalEventDialogComponent>,
        private _formBuilder: UntypedFormBuilder,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        @Inject(MAT_DIALOG_DATA)
        private data: {
            msg: ConditionalEventEditModel;
        },
    ) {
        this.result = data.msg || {
            characteristic: '',
            script: 'value == 42',
            label: '',
            aspect: '',
            iotfunction: '',
            qos: '0',
            valueVariableName: 'value',
            variables: ''
        };
        this.result.qos = this.result.qos || '0';
        this.result.valueVariableName = this.result.valueVariableName || 'value';
        this.result.script = this.result.script || 'value == 42';
    }

    ngOnInit() {
        this.initOptions();
        this.initFunctionsUpdate();
        this.getAspects();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.result.aspect = this.aspectFormControl.value || '';
        this.result.iotfunction = this.functionFormControl.value?.id || '';
        this.result.characteristic =  this.characteristic?.id || '';
        this.result.label =  this.functionFormControl.value.name + ' ' + this.characteristic.name + '\n' + this.result.script;
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
            if (this.result.iotfunction) {
                functions.forEach((value) => {
                    if (value.id === this.result.iotfunction) {
                        this.functionFormControl.setValue(value);
                        this.result.iotfunction = '';
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
            if (this.result.aspect) {
                const sel = aspects.find(value => value.id === this.result.aspect);
                if (sel !== undefined) {
                    this.aspectFormControl.setValue(sel.id);
                    this.result.aspect = '';
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
        if (this.result.iotfunction) {
            this.functions.forEach((value) => {
                if (value.id === this.result.iotfunction) {
                    this.functionFormControl.setValue(value);
                    this.getBaseCharacteristics(value);
                }
            });
        }
    }
}
