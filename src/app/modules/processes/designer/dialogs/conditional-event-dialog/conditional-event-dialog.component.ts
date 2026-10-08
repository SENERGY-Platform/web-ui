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

import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
    compareAspectIds,
    criteriaAspectIds,
    deprecatedAspectAlias,
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../../metadata/concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../../metadata/concepts/shared/concepts-characteristics.model';
import { ConditionalEventEditModel } from '../../shared/designer-dialog.model';
import {
    AspectClassification,
    aspectTreeFromAspectNodes,
    classifyAspects,
    collidingAspectNames,
} from '../../../../../core/components/aspect-select/aspect-select.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './conditional-event-dialog.component.html',
    styleUrls: ['./conditional-event-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, AspectSelectComponent, ReactiveFormsModule, MatFormField, MatLabel, MtxSelect, MatError, MatErrorMessagesDirective, MtxOption, MatInput, MatDialogActions, MatButton]
})
export class ConditionalEventDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<ConditionalEventDialogComponent>>(MatDialogRef);
    private _formBuilder = inject(UntypedFormBuilder);
    private deviceTypeService = inject(DeviceTypeService);
    private conceptsService = inject(ConceptsService);
    private destroyRef = inject(DestroyRef);
    private data = inject<{
        msg: ConditionalEventEditModel;
    }>(MAT_DIALOG_DATA);

    aspectFormControl = new UntypedFormControl([]);
    functionFormControl = new UntypedFormControl({ value: '', disabled: true });

    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;

    limit = 20;

    result!: ConditionalEventEditModel;

    /** Aspect ids of the edited element, applied once the selectable aspects are known. */
    private initialAspectIds: string[];
    private aspectFunctionsSubscription?: Subscription;
    private classified = new Map<string, AspectClassification>();

    constructor() {
        const data = this.data;

        this.result = data.msg || {
            characteristic: '',
            script: 'value == 42',
            label: '',
            aspect: '',
            aspects: [],
            iotfunction: '',
            qos: '0',
            valueVariableName: 'value',
            variables: ''
        };
        this.result.qos = this.result.qos || '0';
        this.result.valueVariableName = this.result.valueVariableName || 'value';
        this.result.script = this.result.script || 'value == 42';
        this.initialAspectIds = criteriaAspectIds({ aspect_ids: this.result.aspects, aspect_id: this.result.aspect });
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
        if (this.aspectClassCollision) {
            return;
        }
        const aspectIds = [...this.selectedAspectIds()].sort(compareAspectIds);
        this.result.aspects = aspectIds;
        this.result.aspect = deprecatedAspectAlias(aspectIds) || '';
        this.result.iotfunction = this.functionFormControl.value?.id || '';
        this.result.characteristic = this.characteristic?.id || '';
        this.result.label = this.functionFormControl.value.name + ' ' + this.characteristic.name + '\n' + this.result.script;
        this.dialogRef.close(this.result);
    }

    get aspectClassCollision(): boolean {
        return collidingAspectNames(this.classified, this.selectedAspectIds()).length > 0;
    }

    /** By id only: functions get renamed while their ids stay. */
    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    private initOptions(): void {
        this.aspectFormControl.setValue([]);
        this.functionFormControl.setValue(undefined);
        this.functionFormControl.disable();
    }

    private initFunctionsUpdate(): void {
        this.functionFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((func: DeviceTypeFunctionModel) => {
            this.getBaseCharacteristics(func);
        });

        this.aspectFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
        this.aspectFunctionsSubscription = this.deviceTypeService
            .getMeasuringFunctionsPerAspectWithImports(aspectIds)
            .subscribe((functionLists: DeviceTypeFunctionModel[][]) => {
                const [first, ...rest] = functionLists;
                const functions = first.filter((f) => rest.every((list) => list.some((other) => other.id === f.id)));
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

    private selectedAspectIds(): string[] {
        return this.aspectFormControl.value || [];
    }

    private getAspects() {
        this.deviceTypeService.getAspectNodesWithMeasuringFunction().subscribe((nodes: DeviceTypeAspectNodeModel[]) => {
            this.aspects = aspectTreeFromAspectNodes(nodes);
            this.classified = classifyAspects(this.aspects);
            // handle init value; a selection naming an aspect that is no longer offered opens empty, as the
            // single select did, rather than narrowed to the remaining aspects without the user noticing
            const initial = this.initialAspectIds;
            this.initialAspectIds = [];
            if (initial.length > 0 && initial.every((id) => nodes.some((node) => node.id === id))) {
                this.aspectFormControl.setValue(initial);
            }
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
