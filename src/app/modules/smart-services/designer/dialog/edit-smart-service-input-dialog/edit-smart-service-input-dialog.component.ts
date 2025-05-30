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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    SmartServiceInputsDescription,
    SmartServiceInput, SmartServiceInputProperty
} from '../../shared/designer.model';
import { BpmnElement } from '../../../../processes/designer/shared/designer.model';
import { FunctionsPermSearchModel } from '../../../../metadata/functions/shared/functions-perm-search.model';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeAspectNodeModel, DeviceTypeCharacteristicsModel, DeviceTypeDeviceClassModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { CharacteristicsService } from '../../../../metadata/characteristics/shared/characteristics.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { CompareWithFn, GroupValueFn } from '@ng-matero/extensions/select';

interface DeviceTypeAspectNodeModelWithRootName extends DeviceTypeAspectNodeModel {
    root_name?: string;
}

@Component({
    templateUrl: './edit-smart-service-input-dialog.component.html',
    styleUrls: ['./edit-smart-service-input-dialog.component.css'],
})
export class EditSmartServiceInputDialogComponent {
    abstract: AbstractSmartServiceInput[] = [];

    functions: (FunctionsPermSearchModel | { id?: string; name: string })[] = [];
    deviceClasses: (DeviceTypeDeviceClassModel | { id?: string; name: string })[] = [];
    aspects: DeviceTypeAspectNodeModelWithRootName[] = [];

    characteristics: DeviceTypeCharacteristicsModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceInputDialogComponent>,
        private functionsService: FunctionsService,
        private deviceTypesService: DeviceTypeService,
        private deviceClassService: DeviceClassesService,
        private characteristicsService: CharacteristicsService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceInputsDescription; element: BpmnElement },
    ) {
        this.characteristicsService.getCharacteristics('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.characteristics = value.result;
        });
        this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.functions = value.result;
        });
        this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.deviceClasses = value.result;
        });
        this.deviceTypesService.getAspectNodesWithMeasuringFunctionOfDevicesOnly().subscribe((aspects: DeviceTypeAspectNodeModel[]) => {
            const tmp: DeviceTypeAspectNodeModelWithRootName[] = [];
            aspects.forEach(a => {
                const t = a as DeviceTypeAspectNodeModelWithRootName;
                t.root_name = aspects.find(x => x.id === t.root_id)?.name;
                tmp.push(t);
            });
            this.aspects = tmp;
        });
        this.setAbstractByDescription(dialogParams.info);
    }

    isValidCamundaVariableNameValidator(c: AbstractControl): ValidationErrors | null {
        const variableName: string = c.value;
        const err = {
            validateCamundaVariableName: {
                valid: false
            }
        };
        if (isValidCamundaVariableName(variableName)) {
            return null;
        } else {
            return err;
        }
    }

    readAbstractAsDescription(): SmartServiceInputsDescription {
        return abstractSmartServiceInputToSmartServiceInputsDescription(this.abstract);
    }

    setAbstractByDescription(value: SmartServiceInputsDescription) {
        this.abstract = smartServiceInputsDescriptionToAbstractSmartServiceInput(value);
    }

    useIotSelectors(condition: boolean, input: AbstractSmartServiceInput) {
        if (condition) {
            if (!input.iot_selectors) {
                input.iot_selectors = [];
            }
            if (!input.criteria_list) {
                input.criteria_list = [];
            }
            if (input.options) {
                input.options = undefined;
            }
        } else {
            if (input.iot_selectors) {
                input.iot_selectors = undefined;
            }
            if (input.criteria_list) {
                input.criteria_list = undefined;
            }
            if (!input.options) {
                input.options = [];
            }
        }
    }

    isIotInputProvider(input: AbstractSmartServiceInput): boolean {
        return !!input.iot_selectors;
    }

    removeOption(input: AbstractSmartServiceInput, optionKey: string) {
        if (input.options) {
            input.options = input.options.filter(value => value.key !== optionKey);
        }
    }

    addOption(input: AbstractSmartServiceInput) {
        let value;
        switch (input.type) {
            case 'string':
                value = '';
                break;
            case 'long':
                value = 0;
                break;
            case 'boolean':
                value = false;
                break;
        }
        if (input.options) {
            input.options.push({ key: '', value });
        } else {
            input.options = [{ key: '', value }];
        }
    }

    removeCriteria(input: AbstractSmartServiceInput, index: number) {
        input.criteria_list?.splice(index, 1);
    }

    addCriteria(input: AbstractSmartServiceInput) {
        if (input.criteria_list) {
            input.criteria_list?.push({});
        } else {
            input.criteria_list = [{}];
        }
    }

    removeInput(index: number) {
        this.abstract?.splice(index, 1);
    }

    addInput() {
        this.abstract?.push({
            id: '',
            label: '',
            type: 'string',
            order: 0,
            multiple: false,
            optional: false,
            auto_select_all: false
        });
    }

    compareById(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    criteriaToLabel(criteria: { interaction?: string; function_id?: string; device_class_id?: string; aspect_id?: string }): string {
        let functionName = '';
        if (criteria.function_id) {
            functionName = this.functions.find(v => v.id === criteria.function_id)?.name || criteria.function_id;
        }
        let deviceClassName = '';
        if (criteria.device_class_id) {
            deviceClassName = this.deviceClasses.find(v => v.id === criteria.device_class_id)?.name || criteria.device_class_id;
        }
        let aspectName = '';
        if (criteria.aspect_id) {
            const temp = this.aspects.find(v => v.id === criteria.aspect_id);
                if (temp) {
                    aspectName = temp.name;
                } else {
                    aspectName = criteria.aspect_id;
                }
        }

        const parts: string[] = [];
        if (criteria.interaction) {
            parts.push(criteria.interaction);
        }
        if (aspectName) {
            parts.push(aspectName);
        }
        if (deviceClassName) {
            parts.push(deviceClassName);
        }
        if (functionName) {
            parts.push(functionName);
        }
        return parts.join(' | ');
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.readAbstractAsDescription());
    }

    isValid() {
        return !this.abstract.some(value => !isValidCamundaVariableName(value.id));
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
}

export interface AbstractSmartServiceInput {
    id: string;
    label: string;
    type: string;
    default_value?: any;

    description?: string;

    iot_selectors?: string[];
    criteria_list?: {
        interaction?: string;
        function_id?: string;
        device_class_id?: string;
        aspect_id?: string;
    }[];
    entity_only?: boolean;
    same_entity?: string;
    options?: { key: string; value: any }[];
    characteristic_id?: string;
    order: number;
    multiple: boolean;
    auto_select_all: boolean;
    optional: boolean;
}

export function abstractSmartServiceInputToSmartServiceInputsDescription(abstract: AbstractSmartServiceInput[]): SmartServiceInputsDescription {
    const inputs: SmartServiceInput[] = abstract.map(input => {
        const properties: SmartServiceInputProperty[] = [];
        if (input.description) {
            properties.push({ id: 'description', value: input.description });
        }
        if (input.iot_selectors && input.iot_selectors.length > 0) {
            properties.push({ id: 'iot', value: input.iot_selectors.join(',') });
        }
        if (input.criteria_list && input.criteria_list.length > 0) {
            input.criteria_list = input.criteria_list.map(criteria => {
                criteria.function_id = criteria.function_id || undefined;
                criteria.aspect_id = criteria.aspect_id || undefined;
                criteria.device_class_id = criteria.device_class_id || undefined;
                criteria.interaction = criteria.interaction || undefined;
                return criteria;
            });
            properties.push({ id: 'criteria_list', value: JSON.stringify(input.criteria_list) });
        }
        if (input.entity_only && input.iot_selectors && input.iot_selectors.length > 0) {
            properties.push({ id: 'entity_only', value: 'true' });
        }
        if (input.same_entity) {
            properties.push({ id: 'same_entity', value: input.same_entity });
        }
        if (input.order !== null && input.order !== undefined) {
            properties.push({ id: 'order', value: input.order.toString() });
        }
        if (input.multiple) {
            properties.push({ id: 'multiple', value: JSON.stringify(input.multiple) });
        }
        if (input.auto_select_all) {
            properties.push({ id: 'auto_select_all', value: JSON.stringify(input.auto_select_all) });
        }
        if (input.optional) {
            properties.push({ id: 'optional', value: JSON.stringify(input.optional) });
        }
        if (input.characteristic_id) {
            properties.push({ id: 'characteristic_id', value: input.characteristic_id });
        } else if (input.options && input.options.length > 0) {
            const obj: any = {};
            input.options.forEach(element => {
                obj[element.key] = element.value;
            });
            properties.push({ id: 'options', value: JSON.stringify(obj) });
        }
        let defaultValue = input.default_value;
        if (defaultValue === undefined || defaultValue === null) {
            switch (input.type) {
                case 'string':
                    defaultValue = '';
                    break;
                case 'long':
                    defaultValue = 0;
                    break;
                case 'boolean':
                    defaultValue = false;
                    break;
            }
        }
        return {
            id: input.id,
            label: input.label,
            type: input.type,
            default_value: defaultValue,
            properties
        };
    });

    return {
        inputs
    };
}

export function smartServiceInputsDescriptionToAbstractSmartServiceInput(value: SmartServiceInputsDescription): AbstractSmartServiceInput[] {
    return value.inputs.map(input => {
        const result = {
            id: input.id,
            label: input.label,
            type: input.type,
            default_value: input.default_value,
            order: 0,
            multiple: false,
            auto_select_all: false,
            optional: false,
        } as AbstractSmartServiceInput;
        input.properties.forEach(property => {
            try {
                if (property.id === 'description' && property.value !== '') {
                    result.description = property.value;
                }
                if (property.id === 'iot' && property.value !== '') {
                    result.iot_selectors = property.value.split(',').map(value2 => value2.trim());
                }
                if (property.id === 'criteria' && property.value !== '') {
                    result.criteria_list = [JSON.parse(property.value)];
                }
                if (property.id === 'criteria_list' && property.value !== '') {
                    result.criteria_list = JSON.parse(property.value);
                }
                if (property.id === 'entity_only' && property.value !== '') {
                    result.entity_only = JSON.parse(property.value);
                }
                if (property.id === 'same_entity' && property.value !== '') {
                    result.same_entity = property.value;
                }
                if (property.id === 'order' && property.value !== '') {
                    result.order = parseInt(property.value, 10);
                }
                if (property.id === 'multiple' && property.value !== '') {
                    result.multiple = JSON.parse(property.value);
                }
                if (property.id === 'auto_select_all' && property.value !== '') {
                    result.auto_select_all = JSON.parse(property.value);
                }
                if (property.id === 'optional' && property.value !== '') {
                    result.optional = JSON.parse(property.value);
                }
                if (property.id === 'characteristic_id' && property.value !== '') {
                    result.characteristic_id = property.value;
                }
                if (property.id === 'options' && property.value !== '') {
                    const obj = JSON.parse(property.value);
                    result.options = Object.entries(obj).map(([k, v]) => ({ key: k, value: v }));
                }
            } catch (e) {
                console.error(e);
            }
        });
        if (result.characteristic_id) {
            result.options = undefined;
        }
        return result;
    });
}

function isValidCamundaVariableName(variableName: string): boolean {
    if (!variableName) {
        return false;
    }
    // may not start with number
    if (variableName.match(/^\d/)) {
        return false;
    }
    // may not contain whitespaces
    if (variableName.match(/\s/g)) {
        return false;
    }
    // my not contain operators like +, -, *, /, =, >, ?, .
    if (['+', '-', '*', '\\', '/', '=', '>', '<', '?', '.', '&', '|', ',', '%', '!'].some(e => variableName.includes(e))) {
        return false;
    }
    // my not be literals like null, true, false
    if (['null', 'true', 'false'].some(e => variableName === e)) {
        return false;
    }
    // my not contain keywords like function, if, then, else, for, between, instance, of, not
    if (['function', 'if', 'then', 'else', 'for', 'between', 'instance', 'of', 'not'].some(e => variableName === e)) {
        return false;
    }
    return true;
}
