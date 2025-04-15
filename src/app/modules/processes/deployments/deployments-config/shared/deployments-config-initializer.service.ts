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
import {
    AbstractControl, FormControl,
    FormGroup, UntypedFormArray,
    UntypedFormBuilder, UntypedFormGroup,
    ValidationErrors,
    ValidatorFn
} from '@angular/forms';
import { duration } from 'moment';
import {
    ConditionalEventModel,
    DeploymentsSelectionConfigurableModel,
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedConfigurableValueModel,
    V2DeploymentsPreparedElementModel,
    V2DeploymentsPreparedIncidentHandlingModel,
    V2DeploymentsPreparedModel,
    V2DeploymentsPreparedMsgEventModel,
    V2DeploymentsPreparedSelectionModel,
    V2DeploymentsPreparedSelectionOptionModel,
    V2DeploymentsPreparedStartParameterModel,
    V2DeploymentsPreparedTaskModel,
    V2DeploymentsPreparedTimeEventModel,
} from '../../shared/deployments-prepared-v2.model';

@Injectable({
    providedIn: 'root',
})
export class DeploymentsConfigInitializerService {
    constructor(private _formBuilder: UntypedFormBuilder) {}

    initFormGroup(deployment: V2DeploymentsPreparedModel): FormGroup {
        return this._formBuilder.group({
            id: deployment.id,
            name: deployment.name,
            description: [{ value: deployment.description || 'no description', disabled: true }],
            diagram: deployment.diagram,
            elements: this.initElementsArray(deployment.elements),
            executable: deployment.executable,
            version: deployment.version,
            incident_handling: this.initIncidentHandlingFormGroup(deployment.incident_handling),
            start_parameter: this.initStartParamArray(deployment.start_parameter || [])
        });
    }

    initConfigurablesArray(configurables: V2DeploymentsPreparedConfigurableModel[] | null): UntypedFormArray {
        const array = new UntypedFormArray([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableModel) => {
                array.push(this.initConfigurableGroup(configurable));
            });
        }
        return array;
    }

    private initElementsArray(elements: V2DeploymentsPreparedElementModel[]): UntypedFormArray {
        const groups: string[] = [];
        const array = new UntypedFormArray([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedElementModel) => {
                array.push(this.initElementFormGroup(el, groups));
            });
        }
        return array;
    }

    private initIncidentHandlingFormGroup(incidentHandling: V2DeploymentsPreparedIncidentHandlingModel | undefined): UntypedFormGroup {
        if(incidentHandling) {
            return this._formBuilder.group({
                restart: incidentHandling.restart,
                notify: incidentHandling.notify,
            });
        } else {
            return this._formBuilder.group({
                restart: [{ value: false, disabled: true }],
                notify: true,
            });
        }
    }

    private initStartParamArray(elements: V2DeploymentsPreparedStartParameterModel[]): UntypedFormArray {
        const array = new UntypedFormArray([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedStartParameterModel) => {
                array.push(this.initStartParamFormGroup(el));
            });
        }
        return array;
    }

    private initStartParamFormGroup(parameter: V2DeploymentsPreparedStartParameterModel): UntypedFormGroup {
        return this._formBuilder.group({
            id: [{ value: parameter.id, disabled: true }],
            label: [{ value: parameter.label, disabled: false }],
            type: [{ value: parameter.type, disabled: true }],
            default: [{ value: parameter.default, disabled: false }],
        });
    }

    private initElementFormGroup(element: V2DeploymentsPreparedElementModel, groups: string[]): UntypedFormGroup {
        const disable = this.checkIfGroupExistedBefore(groups, element.group);
        return this._formBuilder.group({
            bpmn_id: element.bpmn_id,
            group: element.group,
            name: element.name,
            order: element.order,
            time_event: element.time_event ? this.initTimeEventFormGroup(element.time_event) : null,
            message_event: element.message_event ? this.initMessageEventFormGroup(element.message_event) : null,
            conditional_event: element.conditional_event ? this.initConditionalEventFormGroup(element.conditional_event) : null,
            notification: element.notification,
            task: element.task ? this.initTaskFormGroup(element.task, disable) : null,
        });
    }

    private initTimeEventFormGroup(timeEvent: V2DeploymentsPreparedTimeEventModel): UntypedFormGroup {
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

    private initTaskFormGroup(task: V2DeploymentsPreparedTaskModel, disable: boolean): UntypedFormGroup {
        return this._formBuilder.group({
            retries: task.retries,
            parameter: this.initParameterFormGroup(task.parameter),
            selection: this.initSelectionFormGroup(task.selection, disable),
        });
    }

    private initMessageEventFormGroup(messageEvent: V2DeploymentsPreparedMsgEventModel): UntypedFormGroup {
        return this._formBuilder.group({
            value: messageEvent.value,
            flow_id: messageEvent.flow_id,
            event_id: messageEvent.event_id,
            use_marshaller: messageEvent.use_marshaller,
            selection: this.initSelectionFormGroup(messageEvent.selection, false),
        });
    }

    private initConditionalEventFormGroup(conditionalEvent: ConditionalEventModel): FormGroup {
        return this._formBuilder.group({
            script: conditionalEvent.script,
            value_variable: conditionalEvent.value_variable,
            variables: this.initConditionalEventVariablesFormGroup(conditionalEvent.variables),
            qos: conditionalEvent.qos,
            event_id: conditionalEvent.event_id,
            selection: this.initSelectionFormGroup(conditionalEvent.selection, false),
        });
    }

    private initConditionalEventVariablesFormGroup(variables: any): FormGroup {
        return this._formBuilder.group(variables);
    }

    private initTimeDurationRawFormGroup(timeEvent: string): UntypedFormGroup {
        return this._formBuilder.group({
            years: [duration(timeEvent).years()],
            months: [duration(timeEvent).months()],
            days: [duration(timeEvent).days()],
            hours: [duration(timeEvent).hours()],
            minutes: [duration(timeEvent).minutes()],
            seconds: [duration(timeEvent).seconds()],
        });
    }

    private initSelectionFormGroup(selection: V2DeploymentsPreparedSelectionModel, disable: boolean): UntypedFormGroup {
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
        }, {
            validators: [
                control => {
                    const selectedGroupId = control.get('selected_device_group_id')?.value;
                    const selectedPath = control.get('selected_path.path')?.value;
                    if(!selectedPath || selectedPath === '') {
                        if( selectedGroupId &&  selectedGroupId !== '') {
                            control.get('selected_path.path')?.setErrors(null);
                            return;
                        } else {
                            control.get('selected_path.path')?.setErrors({missingSelectedPathForNoneGroup: true});
                            return;
                        }
                    }
                    control.get('selected_path.path')?.setErrors(null);
                    return;
                }
            ]
        });
        return group;
    }

    private initPathOptionsFormArray(pathOptions: DeploymentsSelectionPathOptionModel[], disabled: boolean): UntypedFormArray {
        const array: UntypedFormGroup[] = [];
        if (pathOptions !== null) {
            pathOptions.forEach((option: DeploymentsSelectionPathOptionModel) => {
                array.push(this.iniPathOptionFormControl(option, disabled));
            });
        }

        return this._formBuilder.array(array);
    }


    public iniPathOptionFormControl(pathOption: DeploymentsSelectionPathOptionModel | null, disable: boolean): UntypedFormGroup {
        const that = this;
        return this._formBuilder.group({
            path: [{ value: pathOption?.path, disabled: disable }],
            characteristicId: [{ value: pathOption?.characteristicId, disabled: disable }],
            aspectNode: [{ value: pathOption?.aspectNode, disabled: disable }],
            functionId: [{ value: pathOption?.functionId, disabled: disable }],
            isVoid: [{ value: pathOption?.isVoid, disabled: disable }],
            value: [{ value: pathOption?.value, disabled: disable }],
            type: [{ value: pathOption?.type, disabled: disable }],
            configurables: that.initConfigurablesFormArray(pathOption?.configurables, disable),
        });
    }

    public initConfigurablesFormArray(configurables: undefined | DeploymentsSelectionConfigurableModel[], disabled: boolean): UntypedFormArray {
        const array: UntypedFormGroup[] = [];
        if (configurables !== undefined && configurables !== null) {
            configurables.forEach((c: DeploymentsSelectionConfigurableModel) => {
                array.push(this.iniConfigurableFormControl(c, disabled));
            });
        }
        return this._formBuilder.array(array);
    }


    public iniConfigurableFormControl(configurable: DeploymentsSelectionConfigurableModel | null, disable: boolean): UntypedFormGroup {
        return this._formBuilder.group({
            path: [{ value: configurable?.path, disabled: disable }],
            characteristic_id: [{ value: configurable?.characteristic_id, disabled: disable }],
            aspect_node: [{ value: configurable?.aspect_node, disabled: disable }],
            function_id: [{ value: configurable?.function_id, disabled: disable }],
            value: [{ value: configurable?.value, disabled: disable }],
            type: [{ value: configurable?.type, disabled: disable }],
        });
    }

    private initParameterFormGroup(parameter: any): UntypedFormGroup {
        const fbGroup = this._formBuilder.group({});
        for (const [key, value] of Object.entries(parameter)) {
            fbGroup.addControl(key, new FormControl(value));
        }
        return fbGroup;
    }

    private initSelectionFormArray(selection: V2DeploymentsPreparedSelectionOptionModel[]): UntypedFormArray {
        const array: UntypedFormGroup[] = [];

        if (selection !== null) {
            selection.forEach((selectable: V2DeploymentsPreparedSelectionOptionModel) => {
                array.push(this.initDeviceSelectionOptionGroup(selectable));
            });
        }

        return this._formBuilder.array(array);
    }

    private initDeviceSelectionOptionGroup(selectionOption: V2DeploymentsPreparedSelectionOptionModel): UntypedFormGroup {
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

    private initConfigurableValueArray(configurables: V2DeploymentsPreparedConfigurableValueModel[]): UntypedFormArray {
        const array = new UntypedFormArray([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableValueModel) => {
                array.push(this.initConfigurableValueGroup(configurable));
            });
        }
        return array;
    }

    private initConfigurableValueGroup(configurableValue: V2DeploymentsPreparedConfigurableValueModel): UntypedFormGroup {
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
                const dur = duration(control.value.durationUnits);
                if (dur.asSeconds() < 5) {
                    return {durationLessThan5Seconds: {value: control.value}};
                }
            }
            return null;
        };
    }

}
