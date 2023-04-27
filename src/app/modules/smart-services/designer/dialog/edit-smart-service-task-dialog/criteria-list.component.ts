/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import {Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {DeviceTypeAspectNodeModel} from '../../../../metadata/device-types-overview/shared/device-type.model';
import {FunctionsService} from '../../../../metadata/functions/shared/functions.service';
import {DeviceTypeService} from '../../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceClassesService} from '../../../../metadata/device-classes/shared/device-classes.service';
import {FunctionsPermSearchModel} from '../../../../metadata/functions/shared/functions-perm-search.model';
import {DeviceClassesPermSearchModel} from '../../../../metadata/device-classes/shared/device-classes-perm-search.model';

interface Criteria {
    interaction?: string;
    function_id?: string;
    device_class_id?: string;
    aspect_id?: string;
}

@Component({
    selector: 'senergy-criteria-list',
    templateUrl: './criteria-list.component.html',
    styleUrls: ['./criteria-list.component.css'],
})
export class CriteriaListComponent implements OnInit {

    @Input() criteria_json = '[]';
    @Output() changed: EventEmitter<string> = new EventEmitter<string>();

    functions: (FunctionsPermSearchModel | {id?: string; name: string})[] = [];
    deviceClasses: (DeviceClassesPermSearchModel | {id?: string; name: string})[] = [];
    nestedAspects: Map<string, DeviceTypeAspectNodeModel[]> = new Map();

    criteriaList: Criteria[] = [];

    constructor(private functionsService: FunctionsService,
                private deviceTypesService: DeviceTypeService,
                private deviceClassService: DeviceClassesService) {
        this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.functions = value;
        });
        this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.deviceClasses = value;
        });
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
    }

    ngOnInit(): void {
        this.criteriaList = JSON.parse(this.criteria_json);
    }

    emitUpdate() {
        this.changed.emit(JSON.stringify(this.criteriaList));
    }

    removeCriteria(list: Criteria[], index: number): Criteria[] {
        list.splice(index, 1);
        return list;
    }

    addCriteria(list: Criteria[]): Criteria[] {
        list.push({interaction: 'request', aspect_id: '', device_class_id: '', function_id: ''});
        return list;
    }

    criteriaToLabel(criteria: {interaction?: string; function_id?: string; device_class_id?: string; aspect_id?: string}): string {
        let functionName = '';
        if(criteria.function_id) {
            functionName = this.functions.find(v => v.id === criteria.function_id)?.name || criteria.function_id;
        }
        let deviceClassName = '';
        if(criteria.device_class_id) {
            deviceClassName = this.deviceClasses.find(v => v.id === criteria.device_class_id)?.name || criteria.device_class_id;
        }
        let aspectName = '';
        if(criteria.aspect_id) {
            this.nestedAspects.forEach((value, _) => {
                const temp = value.find(v => v.id === criteria.aspect_id)?.name;
                if(temp) {
                    aspectName = temp;
                }
            });
            if(!aspectName) {
                aspectName = criteria.aspect_id;
            }
        }

        const parts: string[] = [];
        if(criteria.interaction) {
            parts.push(criteria.interaction);
        }
        if(aspectName) {
            parts.push(aspectName);
        }
        if(deviceClassName) {
            parts.push(deviceClassName);
        }
        if(functionName) {
            parts.push(functionName);
        }
        return parts.join(' | ');
    }
}
