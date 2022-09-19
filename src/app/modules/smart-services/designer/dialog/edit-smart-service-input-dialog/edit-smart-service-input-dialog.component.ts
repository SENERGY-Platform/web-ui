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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    SmartServiceTaskInputDescription,
    SmartServiceTaskDescription,
    SmartServiceInputsDescription,
    SmartServiceInput, SmartServiceInputProperty
} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';
import {FlowEngineService} from '../../../../data/flow-repo/shared/flow-engine.service';
import {ParserService} from '../../../../data/flow-repo/shared/parser.service';
import {ParseModel} from '../../../../data/flow-repo/shared/parse.model';
import {BpmnElement, BpmnParameter, BpmnParameterWithLabel} from '../../../../processes/designer/shared/designer.model';
import {AspectsPermSearchModel} from '../../../../metadata/aspects/shared/aspects-perm-search.model';
import {FunctionsPermSearchModel} from '../../../../metadata/functions/shared/functions-perm-search.model';
import {DeviceClassesPermSearchModel} from '../../../../metadata/device-classes/shared/device-classes-perm-search.model';
import {FunctionsService} from '../../../../metadata/functions/shared/functions.service';
import {AspectsService} from '../../../../metadata/aspects/shared/aspects.service';
import {DeviceClassesService} from '../../../../metadata/device-classes/shared/device-classes.service';
import {DeviceTypeService} from '../../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceTypeAspectModel, DeviceTypeAspectNodeModel} from '../../../../metadata/device-types-overview/shared/device-type.model';
import {CharacteristicsPermSearchModel} from '../../../../metadata/characteristics/shared/characteristics-perm-search.model';
import {CharacteristicsService} from '../../../../metadata/characteristics/shared/characteristics.service';

@Component({
    templateUrl: './edit-smart-service-input-dialog.component.html',
    styleUrls: ['./edit-smart-service-input-dialog.component.css'],
})
export class EditSmartServiceInputDialogComponent implements OnInit {
    abstract: AbstractSmartServiceInput[] = [];

    functions: (FunctionsPermSearchModel | {name: string})[] = [];
    deviceClasses: (DeviceClassesPermSearchModel | {name: string})[] = [];
    nestedAspects: Map<string, DeviceTypeAspectNodeModel[]> = new Map();

    characteristics: CharacteristicsPermSearchModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceInputDialogComponent>,
        private functionsService: FunctionsService,
        private deviceTypesService: DeviceTypeService,
        private deviceClassService: DeviceClassesService,
        private characteristicsService: CharacteristicsService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceInputsDescription, element: BpmnElement},
    ) {
        this.characteristicsService.getCharacteristics("", 9999, 0, "name", "asc").subscribe(value => {
            this.characteristics = value;
        });
        this.functionsService.getFunctions("", 9999, 0, "name", "asc").subscribe(value => {
            this.functions = value;
        })
        this.deviceClassService.getDeviceClasses("", 9999, 0, "name", "asc").subscribe(value => {
            this.deviceClasses = value;
        })
        this.deviceTypesService.getAspectNodesWithMeasuringFunctionOfDevicesOnly().subscribe((aspects: DeviceTypeAspectNodeModel[]) => {
            const tmp: Map<string, DeviceTypeAspectNodeModel[]> = new Map();
            const asp: Map<string, DeviceTypeAspectNodeModel[]> = new Map();
            aspects.forEach(a => {
                if (!tmp.has(a.root_id)) {
                    tmp.set(a.root_id, []);
                }
                tmp.get(a.root_id)?.push(a);
            });
            tmp.forEach((v, k) => asp.set(aspects.find(a => a.id === k)?.name || '', v));
            this.nestedAspects = asp;
        });
        this.setAbstractByDescription(dialogParams.info);
    }

    ngOnInit() {}

    readAbstractAsDescription(): SmartServiceInputsDescription{
        return abstractSmartServiceInputToSmartServiceInputsDescription(this.abstract)
    }

    setAbstractByDescription(value: SmartServiceInputsDescription){
        this.abstract = smartServiceInputsDescriptionToAbstractSmartServiceInput(value)
    }

    useIotSelectors(condition: boolean, input: AbstractSmartServiceInput) {
        if(condition) {
            if(!input.iot_selectors) {
                input.iot_selectors = [];
            }
            if(!input.criteria_list) {
                input.criteria_list = [];
            }
            if(input.options){
                input.options = undefined;
            }
        } else {
            if(input.iot_selectors) {
                input.iot_selectors = undefined;
            }
            if(input.criteria_list) {
                input.criteria_list = undefined;
            }
            if(!input.options){
                input.options = [];
            }
        }
    }

    isIotInputProvider(input: AbstractSmartServiceInput): boolean {
        return !!input.iot_selectors
    }

    removeOption(input: AbstractSmartServiceInput, optionKey: string) {
        if(input.options) {
            input.options = input.options.filter(value => value.key != optionKey);
        }
    }

    addOption(input: AbstractSmartServiceInput) {
        let value;
        switch(input.type){
            case "string":
                value = "";
                break;
            case "long":
                value = 0;
                break;
            case "boolean":
                value = false;
                break;
        }
        if(input.options) {
            input.options.push({key: "", value: value});
        } else {
            input.options = [{key: "", value: value}];
        }
    }

    removeCriteria(input: AbstractSmartServiceInput, index: number) {
        input.criteria_list?.splice(index, 1);
    }

    addCriteria(input: AbstractSmartServiceInput) {
        if(input.criteria_list) {
            input.criteria_list?.push({});
        } else {
            input.criteria_list = [{}];
        }
    }

    removeInput(index: number){
        this.abstract?.splice(index, 1);
    }

    addInput(){
        this.abstract?.push({
            id: "",
            label: "",
            type: "string",
            order: 0,
            multiple: false,
            optional: false
        });
    }

    compareById(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.readAbstractAsDescription());
    }
}

export interface AbstractSmartServiceInput {
    id: string,
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
    options?:{key: string, value: any}[];
    characteristic_id?: string;
    order: number;
    multiple: boolean;
    optional: boolean;
}

export function abstractSmartServiceInputToSmartServiceInputsDescription(abstract: AbstractSmartServiceInput[]): SmartServiceInputsDescription{
    let inputs: SmartServiceInput[] = abstract.map(input => {
        let properties: SmartServiceInputProperty[] = [];
        if(input.description) {
            properties.push({id: "description", value: input.description});
        }
        if(input.iot_selectors && input.iot_selectors.length > 0) {
            properties.push({id: "iot", value: input.iot_selectors.join(",")});
        }
        if(input.criteria_list && input.criteria_list.length > 0) {
            input.criteria_list = input.criteria_list.map(criteria => {
                criteria.function_id = criteria.function_id || undefined;
                criteria.aspect_id = criteria.aspect_id || undefined;
                criteria.device_class_id = criteria.device_class_id || undefined;
                criteria.interaction = criteria.interaction || undefined;
                return criteria;
            })
            properties.push({id: "criteria_list", value: JSON.stringify(input.criteria_list)});
        }
        if(input.entity_only && input.iot_selectors && input.iot_selectors.length > 0) {
            properties.push({id: "entity_only", value: "true"});
        }
        if(input.same_entity) {
            properties.push({id: "same_entity", value: input.same_entity});
        }
        if(input.order !== null && input.order !== undefined) {
            properties.push({id: "order", value: input.order.toString()});
        }
        if(input.multiple) {
            properties.push({id: "multiple", value: JSON.stringify(input.multiple)});
        }
        if(input.optional) {
            properties.push({id: "optional", value: JSON.stringify(input.optional)});
        }
        if(input.characteristic_id) {
            properties.push({id: "characteristic_id", value: input.characteristic_id});
        } else if(input.options && input.options.length > 0) {
            let obj: any = {};
            input.options.forEach(element => {
                obj[element.key] = element.value;
            })
            properties.push({id: "options", value: JSON.stringify(obj)});
        }
        var defaultValue = input.default_value;
        if(defaultValue === undefined || defaultValue === null) {
            switch (input.type) {
                case "string":
                    defaultValue = "";
                    break;
                case "long":
                    defaultValue = 0;
                    break;
                case "boolean":
                    defaultValue = false;
                    break;
            }
        }
        return {
            id: input.id,
            label: input.label,
            type: input.type,
            default_value: defaultValue,
            properties: properties
        }
    });

    return {
        inputs: inputs
    }
}

export function smartServiceInputsDescriptionToAbstractSmartServiceInput(value: SmartServiceInputsDescription): AbstractSmartServiceInput[]{
    return value.inputs.map(input => {
        let result = {
            id: input.id,
            label: input.label,
            type: input.type,
            default_value: input.default_value,

            order: 0,
            multiple: false,
            optional: false,
        } as AbstractSmartServiceInput;
        input.properties.forEach(property => {
            try {
                if(property.id == "description" && property.value != "") {
                    result.description = property.value;
                }
                if(property.id == "iot" && property.value != "") {
                    result.iot_selectors = property.value.split(",").map(value => value.trim());
                }
                if(property.id == "criteria" && property.value != "") {
                    result.criteria_list = [JSON.parse(property.value)];
                }
                if(property.id == "criteria_list" && property.value != "") {
                    result.criteria_list = JSON.parse(property.value);
                }
                if(property.id == "entity_only" && property.value != "") {
                    result.entity_only = JSON.parse(property.value);
                }
                if(property.id == "same_entity" && property.value != "") {
                    result.same_entity = property.value;
                }
                if(property.id == "order" && property.value != "") {
                    result.order = parseInt(property.value);
                }
                if(property.id == "multiple" && property.value != "") {
                    result.multiple = JSON.parse(property.value);
                }
                if(property.id == "optional" && property.value != "") {
                    result.optional = JSON.parse(property.value);
                }
                if(property.id == "characteristic_id" && property.value != "") {
                    result.characteristic_id = property.value;
                }
                if(property.id == "options" && property.value != "") {
                    let obj = JSON.parse(property.value);
                    result.options = Object.entries(obj).map(([k,v]) =>{ return {key: k, value: v}});
                }
            } catch (e){
                console.error(e);
            }
        })
        if (result.characteristic_id) {
            result.options = undefined;
        }
        return result
    });
}