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



import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
    DeviceTypeDeviceClassModel,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { FunctionsPermSearchModel } from '../../../../metadata/functions/shared/functions-perm-search.model';
import { AspectClassification, aspectTreeFromAspectNodes, classifyAspects, withStoredAspects } from '../../../../../core/components/aspect-select/aspect-select.model';
import {
    criteriaAspectsLabel,
    criteriaHasAspectClassCollision,
    editableCriteria,
    setCriteriaAspects,
    SmartServiceCriteria,
    storableCriteria,
} from '../../shared/smart-service-criteria';

@Component({
    selector: 'senergy-criteria-list',
    templateUrl: './criteria-list.component.html',
    styleUrls: ['./criteria-list.component.css'],
    standalone: false
})
export class CriteriaListComponent implements OnInit {

    @Input() criteria_json = '[]';
    @Output() changed: EventEmitter<string> = new EventEmitter<string>();

    functions: (FunctionsPermSearchModel | { id?: string; name: string })[] = [];
    deviceClasses: (DeviceTypeDeviceClassModel | { id?: string; name: string })[] = [];
    aspects: DeviceTypeAspectModel[] = [];

    criteriaList: SmartServiceCriteria[] = [];

    private aspectNodes: DeviceTypeAspectNodeModel[] | null = null;
    private aspectNames = new Map<string, string>();
    private classified = new Map<string, AspectClassification>();

    constructor(private functionsService: FunctionsService,
        private deviceTypesService: DeviceTypeService,
        private deviceClassService: DeviceClassesService) {
        this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.functions = value.result;
        });
        this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.deviceClasses = value.result;
        });
        this.deviceTypesService.getAspectNodesWithMeasuringFunctionOfDevicesOnly().subscribe((nodes: DeviceTypeAspectNodeModel[]) => {
            this.aspectNodes = nodes;
            this.aspectNames = new Map(nodes.map((node) => [node.id, node.name]));
            this.rebuildAspects();
        });
    }

    ngOnInit(): void {
        const parsed = JSON.parse(this.criteria_json);
        this.criteriaList = Array.isArray(parsed) ? parsed.map(editableCriteria) : parsed;
        this.rebuildAspects();
    }

    emitUpdate() {
        this.changed.emit(JSON.stringify(this.criteriaList.map(storableCriteria)));
    }

    setAspects(criteria: SmartServiceCriteria, aspectIds: string[] | null) {
        setCriteriaAspects(criteria, aspectIds);
        this.emitUpdate();
    }

    hasAspectClassCollision(criteria: SmartServiceCriteria): boolean {
        return criteriaHasAspectClassCollision(criteria, this.classified);
    }

    removeCriteria(list: SmartServiceCriteria[], index: number): SmartServiceCriteria[] {
        list.splice(index, 1);
        return list;
    }

    addCriteria(list: SmartServiceCriteria[]): SmartServiceCriteria[] {
        list.push({ interaction: 'request', aspect_id: '', device_class_id: '', function_id: '' });
        return list;
    }

    criteriaToLabel(criteria: SmartServiceCriteria): string {
        let functionName = '';
        if (criteria.function_id) {
            functionName = this.functions.find(v => v.id === criteria.function_id)?.name || criteria.function_id;
        }
        let deviceClassName = '';
        if (criteria.device_class_id) {
            deviceClassName = this.deviceClasses.find(v => v.id === criteria.device_class_id)?.name || criteria.device_class_id;
        }
        const aspectName = criteriaAspectsLabel(criteria, this.aspectNames);

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

    /**
     * The listing only holds aspects used with measuring functions, so a stored aspect it lacks (a controlling
     * criteria's, or a deleted one) is offered under its id: this list is re-emitted whole on every edit, and
     * opening it empty would drop that aspect on an unrelated change.
     */
    private rebuildAspects() {
        if (this.aspectNodes === null) {
            return;
        }
        const stored = Array.isArray(this.criteriaList) ? this.criteriaList.flatMap((c) => c?.aspect_ids || []) : [];
        this.aspects = withStoredAspects(aspectTreeFromAspectNodes(this.aspectNodes), stored);
        this.classified = classifyAspects(this.aspects);
    }
}
