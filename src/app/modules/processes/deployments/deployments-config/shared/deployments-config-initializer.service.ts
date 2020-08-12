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

import {Injectable} from '@angular/core';
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import * as moment from 'moment';
import {
    V2DeploymentsPreparedElementModel,
    V2DeploymentsPreparedModel,
    V2DeploymentsPreparedSelectionModel,
    V2DeploymentsPreparedSelectionOptionModel,
    V2DeploymentsPreparedTaskModel,
    V2DeploymentsPreparedTimeEventModel
} from '../../shared/deployments-prepared-v2.model';


@Injectable({
    providedIn: 'root'
})
export class DeploymentsConfigInitializerService {

    constructor(private _formBuilder: FormBuilder) {
    }


    initFormGroup(deployment: V2DeploymentsPreparedModel): FormGroup {
        return this._formBuilder.group({
            id: deployment.id,
            name: deployment.name,
            description: [{value: deployment.description || 'no description', disabled: true}],
            diagram: deployment.diagram,
            elements: this.initElementsArray(deployment.elements),
            executable: deployment.executable,
        });
    }

    private initElementsArray(elements: V2DeploymentsPreparedElementModel[]): FormArray {
        const array = new FormArray([]);
        if (elements) {
            elements.forEach((el: V2DeploymentsPreparedElementModel) => {
                array.push(this.initElementFormGroup(el));
            });
        }
        return array;
    }

    private initElementFormGroup(element: V2DeploymentsPreparedElementModel): FormGroup {
        return this._formBuilder.group({
            bpmn_id: element.bpmn_id,
            group: element.group,
            name: element.name,
            order: element.order,
            time_event: element.time_event ? this.initTimeEventFormGroup(element.time_event) : null,
            message_event: element.message_event,
            notification: element.notification,
            task: element.task ? this.initTaskFormGroup(element.task) : null,
        });
    }

    private initTimeEventFormGroup(timeEvent: V2DeploymentsPreparedTimeEventModel): FormGroup {
        return this._formBuilder.group({
            type: timeEvent.type,
            time: timeEvent.time,
            time_raw: this.initTimeRawFormGroup(timeEvent.time)
        });
    }

    private initTaskFormGroup(task: V2DeploymentsPreparedTaskModel): FormGroup {
        return this._formBuilder.group({
            retries: task.retries,
            parameter: this.initParameterFormGroup(task.parameter),
            selection: this.initSelectionFormGroup(task.selection),
            configurables: task.configurables,
        });
    }

    private initTimeRawFormGroup(timeEvent: string): FormGroup {
        return this._formBuilder.group({
            years: [moment.duration(timeEvent).years()],
            months: [moment.duration(timeEvent).months()],
            days: [moment.duration(timeEvent).days()],
            hours: [moment.duration(timeEvent).hours()],
            minutes: [moment.duration(timeEvent).minutes()],
            seconds: [moment.duration(timeEvent).seconds()],
        });
    }

    private initSelectionFormGroup(selection: V2DeploymentsPreparedSelectionModel): FormGroup {
        return this._formBuilder.group({
            filter_criteria: selection.filter_criteria,
            selection_options: this.initSelectionFormArray(selection.selection_options),
            selected_device_id: selection.selected_device_id,
            selected_service_id: selection.selected_service_id,
            show: [{value: false}]
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

    private  initDeviceSelectionOptionGroup(selectionOption: V2DeploymentsPreparedSelectionOptionModel): FormGroup {
        return this._formBuilder.group({
            device: [selectionOption.device],
            services: this._formBuilder.array(selectionOption.services)
        });
    }

}
