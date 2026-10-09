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

import { Injectable, inject } from '@angular/core';
import {
    AbstractControl, FormArray, FormBuilder, FormControl,
    FormGroup, FormRecord,
    ValidationErrors,
    ValidatorFn
} from '@angular/forms';
import { duration, durationAs, durationParts } from '../../../../../core/time/iso-duration';
import {
    ConditionalEventModel,
    DeploymentsSelectionConfigurableModel,
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedDiagramModel,
    V2DeploymentsPreparedFilterCriteriaModel,
    V2DeploymentsPreparedNotificationModel,
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
import { ImportInstancesModel } from '../../../../imports/import-instances/shared/import-instances.model';
import { ImportTypeModel } from '../../../../imports/import-types/shared/import-types.model';
import { DeviceTypeAspectNodeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';

export type StartParamForm = FormGroup<{
    id: FormControl<string | null>;
    label: FormControl<string | null>;
    type: FormControl<string | null>;
    default: FormControl<string | null>;
}>;

export type IncidentHandlingForm = FormGroup<{
    restart: FormControl<boolean | null>;
    notify: FormControl<boolean | null>;
}>;

export type DurationUnitsForm = FormGroup<{
    years: FormControl<number | null>;
    months: FormControl<number | null>;
    days: FormControl<number | null>;
    hours: FormControl<number | null>;
    minutes: FormControl<number | null>;
    seconds: FormControl<number | null>;
}>;

export type TimeEventForm = FormGroup<{
    type: FormControl<string | null>;
    time: FormControl<string | null>;
    durationUnits: DurationUnitsForm;
}>;

export type ConfigurableValueForm = FormGroup<{
    label: FormControl<string | null>;
    path: FormControl<string | null>;
    value: FormControl<string | null>;
}>;

export type ConfigurableForm = FormGroup<{
    characteristic_id: FormControl<string | null>;
    values: FormArray<ConfigurableValueForm>;
}>;

export type SelectionConfigurableForm = FormGroup<{
    path: FormControl<string | null | undefined>;
    characteristic_id: FormControl<string | null | undefined>;
    aspect_node: FormControl<DeviceTypeAspectNodeModel | null | undefined>;
    aspect_nodes: FormControl<DeviceTypeAspectNodeModel[] | null | undefined>;
    function_id: FormControl<string | null | undefined>;
    value: FormControl<any>;
    type: FormControl<string | null | undefined>;
}>;

export type PathOptionForm = FormGroup<{
    path: FormControl<string | null | undefined>;
    characteristicId: FormControl<string | null | undefined>;
    aspectNode: FormControl<DeviceTypeAspectNodeModel | null | undefined>;
    aspectNodes: FormControl<DeviceTypeAspectNodeModel[] | null | undefined>;
    functionId: FormControl<string | null | undefined>;
    isVoid: FormControl<boolean | null | undefined>;
    value: FormControl<any>;
    type: FormControl<string | null | undefined>;
    configurables: FormArray<SelectionConfigurableForm>;
}>;

export type SelectionOptionForm = FormGroup<{
    device: FormControl<V2DeploymentsPreparedSelectionOptionModel['device']>;
    services: AbstractControl<any>; // the services array, or a null control
    device_group: FormControl<V2DeploymentsPreparedSelectionOptionModel['device_group']>;
    import: FormControl<ImportInstancesModel | null>;
    importType: FormControl<ImportTypeModel | null>;
    path_options: FormControl<V2DeploymentsPreparedSelectionOptionModel['path_options']>;
}>;

export type SelectionForm = FormGroup<{
    filter_criteria: FormControl<V2DeploymentsPreparedFilterCriteriaModel | null>;
    selection_options: FormArray<SelectionOptionForm>;
    selection_options_index: FormControl<number | null>;
    selected_device_id: FormControl<string | null>;
    selected_service_id: FormControl<string | null>;
    selected_device_group_id: FormControl<string | null>;
    selected_import_id: FormControl<string | null>;
    selected_path_option: FormControl<undefined | null>;
    selected_path: PathOptionForm;
    show: FormControl<boolean | null>;
}>;

export type TaskForm = FormGroup<{
    retries: FormControl<number | null>;
    parameter: FormRecord<FormControl<any>>;
    selection: SelectionForm;
}>;

export type MessageEventForm = FormGroup<{
    value: FormControl<string | null>;
    flow_id: FormControl<string | null>;
    event_id: FormControl<string | null>;
    use_marshaller: FormControl<boolean | null>;
    selection: SelectionForm;
}>;

export type ConditionalEventForm = FormGroup<{
    script: FormControl<string | null>;
    value_variable: FormControl<string | null>;
    variables: FormGroup<any>; // keys are the backend's variable names
    qos: FormControl<number | null>;
    event_id: FormControl<string | null>;
    selection: SelectionForm;
}>;

export type ElementForm = FormGroup<{
    bpmn_id: FormControl<string | null>;
    group: FormControl<string | null>;
    name: FormControl<string | null>;
    order: FormControl<number | null>;
    // The slots below hold the nested group, or the FormControl(null) the builder makes from null.
    time_event: AbstractControl<any>;
    message_event: AbstractControl<any>;
    conditional_event: AbstractControl<any>;
    notification: FormControl<V2DeploymentsPreparedNotificationModel | null>;
    task: AbstractControl<any>;
}>;

export type DeploymentForm = FormGroup<{
    id: FormControl<string | null>;
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    diagram: FormControl<V2DeploymentsPreparedDiagramModel | null>;
    elements: FormArray<ElementForm>;
    executable: FormControl<boolean | null>;
    version: FormControl<number | null>;
    incident_handling: IncidentHandlingForm;
    start_parameter: FormArray<StartParamForm>;
}>;

@Injectable({
    providedIn: 'root',
})
export class DeploymentsConfigInitializerService {
    private _formBuilder = inject(FormBuilder);


    initFormGroup(deployment: V2DeploymentsPreparedModel): DeploymentForm {
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

    initConfigurablesArray(configurables: V2DeploymentsPreparedConfigurableModel[] | null): FormArray<ConfigurableForm> {
        const array = new FormArray<ConfigurableForm>([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableModel) => {
                array.push(this.initConfigurableGroup(configurable));
            });
        }
        return array;
    }

    private initElementsArray(elements: V2DeploymentsPreparedElementModel[]): FormArray<ElementForm> {
        const groups: string[] = [];
        const array = new FormArray<ElementForm>([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedElementModel) => {
                array.push(this.initElementFormGroup(el, groups));
            });
        }
        return array;
    }

    private initIncidentHandlingFormGroup(incidentHandling: V2DeploymentsPreparedIncidentHandlingModel | undefined): IncidentHandlingForm {
        if(incidentHandling) {
            return this._formBuilder.group({
                restart: incidentHandling.restart,
                notify: incidentHandling.notify,
            });
        } else {
            return this._formBuilder.group({
                restart: [{ value: false, disabled: true }],
                notify: new FormControl<boolean | null>(true),
            });
        }
    }

    private initStartParamArray(elements: V2DeploymentsPreparedStartParameterModel[]): FormArray<StartParamForm> {
        const array = new FormArray<StartParamForm>([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedStartParameterModel) => {
                array.push(this.initStartParamFormGroup(el));
            });
        }
        return array;
    }

    private initStartParamFormGroup(parameter: V2DeploymentsPreparedStartParameterModel): StartParamForm {
        return this._formBuilder.group({
            id: [{ value: parameter.id, disabled: true }],
            label: [{ value: parameter.label, disabled: false }],
            type: [{ value: parameter.type, disabled: true }],
            default: [{ value: parameter.default, disabled: false }],
        });
    }

    private initElementFormGroup(element: V2DeploymentsPreparedElementModel, groups: string[]): ElementForm {
        const disable = this.checkIfGroupExistedBefore(groups, element.group);
        return this._formBuilder.group({
            bpmn_id: element.bpmn_id,
            group: element.group,
            name: element.name,
            order: element.order,
            time_event: (element.time_event ? this.initTimeEventFormGroup(element.time_event) : null) as AbstractControl,
            message_event: (element.message_event ? this.initMessageEventFormGroup(element.message_event) : null) as AbstractControl,
            conditional_event: (element.conditional_event ? this.initConditionalEventFormGroup(element.conditional_event) : null) as AbstractControl,
            notification: element.notification,
            task: (element.task ? this.initTaskFormGroup(element.task, disable) : null) as AbstractControl,
        });
    }

    private initTimeEventFormGroup(timeEvent: V2DeploymentsPreparedTimeEventModel): TimeEventForm {
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

    private initTaskFormGroup(task: V2DeploymentsPreparedTaskModel, disable: boolean): TaskForm {
        return this._formBuilder.group({
            retries: task.retries,
            parameter: this.initParameterFormGroup(task.parameter),
            selection: this.initSelectionFormGroup(task.selection, disable),
        });
    }

    private initMessageEventFormGroup(messageEvent: V2DeploymentsPreparedMsgEventModel): MessageEventForm {
        return this._formBuilder.group({
            value: messageEvent.value,
            flow_id: messageEvent.flow_id,
            event_id: messageEvent.event_id,
            use_marshaller: messageEvent.use_marshaller,
            selection: this.initSelectionFormGroup(messageEvent.selection, false),
        });
    }

    private initConditionalEventFormGroup(conditionalEvent: ConditionalEventModel): ConditionalEventForm {
        return this._formBuilder.group({
            script: conditionalEvent.script,
            value_variable: conditionalEvent.value_variable,
            variables: this.initConditionalEventVariablesFormGroup(conditionalEvent.variables),
            qos: conditionalEvent.qos,
            event_id: conditionalEvent.event_id,
            selection: this.initSelectionFormGroup(conditionalEvent.selection, false),
        });
    }

    private initConditionalEventVariablesFormGroup(variables: any): FormGroup<any> {
        return this._formBuilder.group(variables);
    }

    private initTimeDurationRawFormGroup(timeEvent: string): DurationUnitsForm {
        const parts = durationParts(duration(timeEvent));
        return this._formBuilder.group({
            years: [parts.years],
            months: [parts.months],
            days: [parts.days],
            hours: [parts.hours],
            minutes: [parts.minutes],
            seconds: [parts.seconds],
        });
    }

    private initSelectionFormGroup(selection: V2DeploymentsPreparedSelectionModel, disable: boolean): SelectionForm {
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

    private initPathOptionsFormArray(pathOptions: DeploymentsSelectionPathOptionModel[], disabled: boolean): FormArray<PathOptionForm> {
        const array: PathOptionForm[] = [];
        if (pathOptions !== null) {
            pathOptions.forEach((option: DeploymentsSelectionPathOptionModel) => {
                array.push(this.iniPathOptionFormControl(option, disabled));
            });
        }

        return this._formBuilder.array(array);
    }


    public iniPathOptionFormControl(pathOption: DeploymentsSelectionPathOptionModel | null, disable: boolean): PathOptionForm {
        const that = this;
        return this._formBuilder.group({
            path: [{ value: pathOption?.path, disabled: disable }],
            characteristicId: [{ value: pathOption?.characteristicId, disabled: disable }],
            aspectNode: [{ value: pathOption?.aspectNode, disabled: disable }],
            aspectNodes: [{ value: pathOption?.aspectNodes, disabled: disable }],
            functionId: [{ value: pathOption?.functionId, disabled: disable }],
            isVoid: [{ value: pathOption?.isVoid, disabled: disable }],
            value: [{ value: pathOption?.value, disabled: disable }],
            type: [{ value: pathOption?.type, disabled: disable }],
            configurables: that.initConfigurablesFormArray(pathOption?.configurables, disable),
        });
    }

    public initConfigurablesFormArray(configurables: undefined | DeploymentsSelectionConfigurableModel[], disabled: boolean): FormArray<SelectionConfigurableForm> {
        const array: SelectionConfigurableForm[] = [];
        if (configurables !== undefined && configurables !== null) {
            configurables.forEach((c: DeploymentsSelectionConfigurableModel) => {
                array.push(this.iniConfigurableFormControl(c, disabled));
            });
        }
        return this._formBuilder.array(array);
    }


    public iniConfigurableFormControl(configurable: DeploymentsSelectionConfigurableModel | null, disable: boolean): SelectionConfigurableForm {
        return this._formBuilder.group({
            path: [{ value: configurable?.path, disabled: disable }],
            characteristic_id: [{ value: configurable?.characteristic_id, disabled: disable }],
            aspect_node: [{ value: configurable?.aspect_node, disabled: disable }],
            aspect_nodes: [{ value: configurable?.aspect_nodes, disabled: disable }],
            function_id: [{ value: configurable?.function_id, disabled: disable }],
            value: [{ value: configurable?.value, disabled: disable }],
            type: [{ value: configurable?.type, disabled: disable }],
        });
    }

    private initParameterFormGroup(parameter: any): FormRecord<FormControl<any>> {
        const fbGroup = this._formBuilder.record<FormControl<any>>({});
        for (const [key, value] of Object.entries(parameter)) {
            fbGroup.addControl(key, new FormControl(value));
        }
        return fbGroup;
    }

    private initSelectionFormArray(selection: V2DeploymentsPreparedSelectionOptionModel[]): FormArray<SelectionOptionForm> {
        const array: SelectionOptionForm[] = [];

        if (selection !== null) {
            selection.forEach((selectable: V2DeploymentsPreparedSelectionOptionModel) => {
                array.push(this.initDeviceSelectionOptionGroup(selectable));
            });
        }

        return this._formBuilder.array(array);
    }

    private initDeviceSelectionOptionGroup(selectionOption: V2DeploymentsPreparedSelectionOptionModel): SelectionOptionForm {
        return this._formBuilder.group({
            device: [selectionOption.device],
            services: (selectionOption.services !== null ? this._formBuilder.array(selectionOption.services) : null) as AbstractControl,
            device_group: [selectionOption.device_group],
            import: selectionOption.import,
            importType: selectionOption.importType,
            path_options: this._formBuilder.control(selectionOption.path_options)
        });
    }

    private initConfigurableGroup(configurable: V2DeploymentsPreparedConfigurableModel): ConfigurableForm {
        return this._formBuilder.group({
            characteristic_id: configurable.characteristic_id,
            values: this.initConfigurableValueArray(configurable.values),
        });
    }

    private initConfigurableValueArray(configurables: V2DeploymentsPreparedConfigurableValueModel[]): FormArray<ConfigurableValueForm> {
        const array = new FormArray<ConfigurableValueForm>([]);
        if (configurables) {
            configurables.forEach((configurable: V2DeploymentsPreparedConfigurableValueModel) => {
                array.push(this.initConfigurableValueGroup(configurable));
            });
        }
        return array;
    }

    private initConfigurableValueGroup(configurableValue: V2DeploymentsPreparedConfigurableValueModel): ConfigurableValueForm {
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
                if (durationAs(dur, 'seconds') < 5) {
                    return {durationLessThan5Seconds: {value: control.value}};
                }
            }
            return null;
        };
    }

}
