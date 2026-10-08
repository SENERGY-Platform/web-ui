/*
 * Copyright 2024 InfAI (CC SES)
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

import { Component, Input, OnChanges, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
    DynamicFormGroup,
    InputType,
    applyInputType,
    groupOf,
    inputTypeValue,
    supportsQuery
} from '../../shared/report-object-form';
import { ReportObjectNode, inputTypeOfNode, isContainer } from '../../shared/report-object-node';
import { ReportObjectViewService } from '../../shared/report-object-view.service';
import { DeviceInstanceModel } from '../../../devices/device-instances/shared/device-instances.model';
import { DeviceGroupDisplayModel } from '../../../devices/device-groups/shared/device-groups.model';
import { AddTagFn } from '../../../../core/model/mtx-select.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { QueryEditorComponent } from './query-editor/query-editor.component';
import { MtxSelect } from '@ng-matero/extensions/select';

const INPUT_TYPES: { value: InputType; label: string }[] = [
    { value: 'value', label: 'Value' },
    { value: 'query', label: 'Query' },
    { value: 'devices', label: 'Devices' },
];

@Component({
    selector: 'senergy-reporting-object',
    templateUrl: './report-object.component.html',
    styleUrls: ['./report-object.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, ReactiveFormsModule, MatButtonToggleGroup, MatButtonToggle, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, QueryEditorComponent, MtxSelect]
})
export class ReportObjectComponent implements OnChanges, OnDestroy {
    private viewService = inject(ReportObjectViewService);


    @Input() node!: ReportObjectNode;
    @Input() allDevices: DeviceInstanceModel[] = [];
    @Input() allDeviceGroups: DeviceGroupDisplayModel[] = [];

    inputTypes = INPUT_TYPES;
    deviceQueryLastValues = ['2d', '7d', '30d'];

    private destroy = new Subject<void>();
    private inputTypeSubscription = new Subject<void>();

    ngOnChanges() {
        this.inputTypeSubscription.next();
        this.addKnownDeviceQueryLastValue(this.deviceQueryForm?.controls['last'].value);
        this.form.controls['inputType'].valueChanges
            .pipe(takeUntil(this.destroy), takeUntil(this.inputTypeSubscription))
            .subscribe(() => applyInputType(this.form));
    }

    ngOnDestroy() {
        this.inputTypeSubscription.next();
        this.inputTypeSubscription.complete();
        this.destroy.next();
        this.destroy.complete();
    }

    get form(): DynamicFormGroup {
        return this.node.form;
    }

    get inputType(): InputType {
        return inputTypeValue(this.form);
    }

    get supportsQuery(): boolean {
        return supportsQuery(this.node.data);
    }

    get isContainer(): boolean {
        return isContainer(this.node);
    }

    get hasValueInput(): boolean {
        return this.form.controls['value'] !== undefined;
    }

    get queryForm(): DynamicFormGroup | undefined {
        return groupOf(this.form, 'query');
    }

    get deviceQueryForm(): DynamicFormGroup | undefined {
        return groupOf(this.form, 'deviceQuery');
    }

    childInputType(node: ReportObjectNode): string {
        return isContainer(node) ? 'object' : inputTypeOfNode(node);
    }

    select(node: ReportObjectNode) {
        this.viewService.select(node.path);
    }

    addDeviceQueryLastValue(): AddTagFn {
        return (text: string) => {
            this.addKnownDeviceQueryLastValue(text);
            return text;
        };
    }

    private addKnownDeviceQueryLastValue(value: string | null | undefined) {
        if (value === undefined || value === null || value === '' || this.deviceQueryLastValues.indexOf(value) !== -1) {
            return;
        }
        this.deviceQueryLastValues = this.deviceQueryLastValues.concat(value);
    }
}
