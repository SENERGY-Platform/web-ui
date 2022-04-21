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

import { Injectable } from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import * as moment from 'moment';
import {
    DeploymentsSelectionConfigurableModel,
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedConfigurableValueModel,
    V2DeploymentsPreparedElementModel,
    V2DeploymentsPreparedModel,
    V2DeploymentsPreparedMsgEventModel,
    V2DeploymentsPreparedSelectionModel,
    V2DeploymentsPreparedSelectionOptionModel,
    V2DeploymentsPreparedTaskModel,
    V2DeploymentsPreparedTimeEventModel,
} from '../../shared/deployments-prepared-v2.model';
import {DeviceTypeAspectNodeModel} from '../../../../metadata/device-types-overview/shared/device-type.model';

@Injectable({
    providedIn: 'root',
})
export class DeploymentsConfigInitializerService {
    constructor(private _formBuilder: FormBuilder) {}

    initFormGroup(deployment: V2DeploymentsPreparedModel): FormGroup {
        return this._formBuilder.group({
            id: deployment.id,
            name: deployment.name,
            description: [{ value: deployment.description || 'no description', disabled: true }],
            diagram: deployment.diagram,
            elements: this.initElementsArray(deployment.elements),
            executable: deployment.executable,
            version: deployment.version
        });
    }

    initConfigurablesArray(configurables: V2DeploymentsPreparedConfigurableModel[] | null): FormArray {
        const array = new FormArray([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableModel) => {
                array.push(this.initConfigurableGroup(configurable));
            });
        }
        return array;
    }

    private initElementsArray(elements: V2DeploymentsPreparedElementModel[]): FormArray {
        const groups: string[] = [];
        const array = new FormArray([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedElementModel) => {
                array.push(this.initElementFormGroup(el, groups));
            });
        }
        return array;
    }

    private initElementFormGroup(element: V2DeploymentsPreparedElementModel, groups: string[]): FormGroup {
        const disable = this.checkIfGroupExistedBefore(groups, element.group);
        return this._formBuilder.group({
            bpmn_id: element.bpmn_id,
            group: element.group,
            name: element.name,
            order: element.order,
            time_event: element.time_event ? this.initTimeEventFormGroup(element.time_event) : null,
            message_event: element.message_event ? this.initMessageEventFormGroup(element.message_event) : null,
            notification: element.notification,
            task: element.task ? this.initTaskFormGroup(element.task, disable) : null,
        });
    }

    private initTimeEventFormGroup(timeEvent: V2DeploymentsPreparedTimeEventModel): FormGroup {
        return this._formBuilder.group({
            type: timeEvent.type,
            time: timeEvent.time,
            durationUnits: this.initTimeDurationRawFormGroup(timeEvent.time),
        }, {
            validators: [this.getTimeEventValidator()]
        });
    }

    private checkIfGroupExistedBefore(groups: string[], group: string | null): boolean {
        if (group) {
            if (groups.includes(group)) {
                return true;
            } else {
                groups.push(group);
                return false;
            }
        }
        return false;
    }

    private initTaskFormGroup(task: V2DeploymentsPreparedTaskModel, disable: boolean): FormGroup {
        return this._formBuilder.group({
            retries: task.retries,
            parameter: this.initParameterFormGroup(task.parameter),
            selection: this.initSelectionFormGroup(task.selection, disable),
        });
    }

    private initMessageEventFormGroup(messageEvent: V2DeploymentsPreparedMsgEventModel): FormGroup {
        return this._formBuilder.group({
            value: messageEvent.value,
            flow_id: messageEvent.flow_id,
            event_id: messageEvent.event_id,
            selection: this.initSelectionFormGroup(messageEvent.selection, false),
        });
    }

    private initTimeDurationRawFormGroup(timeEvent: string): FormGroup {
        return this._formBuilder.group({
            years: [moment.duration(timeEvent).years()],
            months: [moment.duration(timeEvent).months()],
            days: [moment.duration(timeEvent).days()],
            hours: [moment.duration(timeEvent).hours()],
            minutes: [moment.duration(timeEvent).minutes()],
            seconds: [moment.duration(timeEvent).seconds()],
        });
    }

    private initSelectionFormGroup(selection: V2DeploymentsPreparedSelectionModel, disable: boolean): FormGroup {
        const selectedOptionIndex = this.getSelectedOptionIndex(selection);
        const group = this._formBuilder.group({
            filter_criteria: selection.filter_criteria,
            selection_options: this.initSelectionFormArray(selection.selection_options),
            selection_options_index: selectedOptionIndex,
            selected_device_id: [{ value: selection.selected_device_id, disabled: disable }],
            selected_service_id: [{ value: selection.selected_service_id, disabled: disable }],
            selected_device_group_id: [{ value: selection.selected_device_group_id, disabled: disable }],
            selected_import_id: [{ value: selection.selected_import_id, disabled: disable }],
            selected_path_option: [{ value: undefined, disabled: disable }],
            selected_path: this.iniPathOptionFormControl(selection.selected_path, disable),
            show: false,
        });
        return group;
    }

    private initPathOptionsFormArray(pathOptions: DeploymentsSelectionPathOptionModel[], disabled: boolean): FormArray {
        const array: FormGroup[] = [];
        if (pathOptions !== null) {
            pathOptions.forEach((option: DeploymentsSelectionPathOptionModel) => {
                array.push(this.iniPathOptionFormControl(option, disabled));
            });
        }

        return this._formBuilder.array(array);
    }


    public iniPathOptionFormControl(pathOption: DeploymentsSelectionPathOptionModel | null, disable: boolean):FormGroup {
        const that = this;
        return this._formBuilder.group({
            path: [{ value: pathOption?.path, disabled: disable }, Validators.required],
            characteristicId: [{ value: pathOption?.characteristicId, disabled: disable }],
            aspectNode: [{ value: pathOption?.aspectNode, disabled: disable }],
            functionId: [{ value: pathOption?.functionId, disabled: disable }],
            isVoid: [{ value: pathOption?.isVoid, disabled: disable }],
            value: [{ value: pathOption?.value, disabled: disable }],
            type: [{ value: pathOption?.type, disabled: disable }],
            configurables: that.initConfigurablesFormArray(pathOption?.configurables, disable),
        });
    }

    public initConfigurablesFormArray(configurables: undefined | DeploymentsSelectionConfigurableModel[], disabled: boolean): FormArray {
        const array: FormGroup[] = [];
        if (configurables !== undefined && configurables !== null) {
            configurables.forEach((c: DeploymentsSelectionConfigurableModel) => {
                array.push(this.iniConfigurableFormControl(c, disabled));
            });
        }
        return this._formBuilder.array(array);
    }


    public iniConfigurableFormControl(configurable: DeploymentsSelectionConfigurableModel | null, disable: boolean):FormGroup {
        return this._formBuilder.group({
            path: [{ value: configurable?.path, disabled: disable }],
            characteristic_id: [{ value: configurable?.characteristic_id, disabled: disable }],
            aspect_node: [{ value: configurable?.aspect_node, disabled: disable }],
            function_id: [{ value: configurable?.function_id, disabled: disable }],
            value: [{ value: configurable?.value, disabled: disable }],
            type: [{ value: configurable?.type, disabled: disable }],
        });
    }

    private initParameterFormGroup(parameter: any): FormGroup {
        const fbGroup = this._formBuilder.group({});
        for (const [key, value] of Object.entries(parameter)) {
            fbGroup.addControl(key, new FormControl(value));
        }
        return fbGroup;
    }

    private initSelectionFormArray(selection: V2DeploymentsPreparedSelectionOptionModel[]): FormArray {
        const array: FormGroup[] = [];

        if (selection !== null) {
            selection.forEach((selectable: V2DeploymentsPreparedSelectionOptionModel) => {
                array.push(this.initDeviceSelectionOptionGroup(selectable));
            });
        }

        return this._formBuilder.array(array);
    }

    private initDeviceSelectionOptionGroup(selectionOption: V2DeploymentsPreparedSelectionOptionModel): FormGroup {
        return this._formBuilder.group({
            device: [selectionOption.device],
            services: selectionOption.services !== null ? this._formBuilder.array(selectionOption.services) : null,
            device_group: [selectionOption.device_group],
            import: selectionOption.import,
            importType: selectionOption.importType,
            path_options: [selectionOption.path_options]
        });
    }

    private initConfigurableGroup(configurable: V2DeploymentsPreparedConfigurableModel): FormGroup {
        return this._formBuilder.group({
            characteristic_id: configurable.characteristic_id,
            values: this.initConfigurableValueArray(configurable.values),
        });
    }

    private initConfigurableValueArray(configurables: V2DeploymentsPreparedConfigurableValueModel[]): FormArray {
        const array = new FormArray([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableValueModel) => {
                array.push(this.initConfigurableValueGroup(configurable));
            });
        }
        return array;
    }

    private initConfigurableValueGroup(configurableValue: V2DeploymentsPreparedConfigurableValueModel): FormGroup {
        return this._formBuilder.group({
            label: configurableValue.label,
            path: configurableValue.path,
            value: configurableValue.value,
        });
    }

    private getSelectedOptionIndex(selection: V2DeploymentsPreparedSelectionModel) {
        let result = selection.selection_options_index === undefined ? -1 : selection.selection_options_index;
        if (!selection.selection_options) {
            selection.selection_options = [];
        }
        selection.selection_options.forEach((option, index) => {
            if (option.device && selection.selected_device_id && selection.selected_device_id === option.device.id) {
                result = index;
            }
            if (
                option.device_group &&
                selection.selected_device_group_id &&
                selection.selected_device_group_id === option.device_group.id
            ) {
                result = index;
            }
            if (option.import && selection.selected_import_id && selection.selected_import_id === option.import.id) {
                result = index;
            }
        });
        return result;
    }

    private getTimeEventValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (control.value.type === 'timeDuration'){
                let duration = moment.duration(control.value.durationUnits);
                if (duration.asSeconds() < 5) {
                    return {durationLessThan5Seconds: {value: control.value}}
                }
            }
            return null;
        };
    }

}
