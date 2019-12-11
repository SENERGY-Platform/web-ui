/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, OnInit} from '@angular/core';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceTypeService} from '../../../devices/device-types-overview/shared/device-type.service';
import {
    DeviceTypeContentModel, DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../devices/device-types-overview/shared/device-type.model';
import {ExportModel, ExportValueModel} from '../shared/export.model';
import {ExportService} from '../shared/export.service';
import {MatSnackBar} from '@angular/material';
import {PipelineModel, PipelineOperatorModel} from '../../pipeline-registry/shared/pipeline.model';
import {PipelineRegistryService} from '../../pipeline-registry/shared/pipeline-registry.service';
import {Router} from '@angular/router';
import {IOModel, OperatorModel} from '../../operator-repo/shared/operator.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';


@Component({
    selector: 'senergy-new-export',
    templateUrl: './new-export.component.html',
    styleUrls: ['./new-export.component.css']
})

export class NewExportComponent implements OnInit {

    ready = false;
    export = {} as ExportModel;
    selector = 'device';
    service = {} as DeviceTypeServiceModel;
    device = {} as DeviceInstancesModel;
    deviceType = {} as DeviceTypeModel;
    pipeline = {} as PipelineModel;
    operator = {} as PipelineOperatorModel;
    devices: DeviceInstancesModel [] = [];
    pipelines: PipelineModel [] = [];
    paths = new Map<string, string | undefined>();
    allMessages = true;

    timeSuggest = ['time'];

    dropdown = [
        'float',
        'string',
        'int',
        'bool'
    ];

    typeString = 'https://schema.org/Text';
    typeInteger = 'https://schema.org/Integer';
    typeFloat = 'https://schema.org/Float';
    typeBoolean = 'https://schema.org/Boolean';



    constructor(private pipelineRegistryService: PipelineRegistryService,
                private deviceInstanceService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private exportService: ExportService,
                private operatorRepoService: OperatorRepoService,
                private router: Router,
                public snackBar: MatSnackBar) {

    }

    ngOnInit() {
        this.loadDevices();
        this.loadPipelines();
    }

    startExport() {
        const self =  this;
        if (this.selector === 'device') {
            this.export.EntityName = this.device.name;
            this.export.Filter = this.device.id;
            this.export.FilterType = 'deviceId';
            this.export.ServiceName = this.service.name;
            this.export.Topic = this.service.id.replace(/#/g, '_').replace(/:/g, '_');
        } else if (this.selector === 'pipe') {
            this.export.EntityName = this.pipeline.id;
            this.export.Filter = this.pipeline.id;
            this.export.FilterType = 'pipeId';
            this.export.ServiceName = this.operator.name;
            this.export.Topic = 'analytics-' + this.operator.name;
        }
        if (this.allMessages) {
            this.export.Offset = 'smallest';
        } else {
            this.export.Offset = 'largest';
        }
        this.exportService.startPipeline(this.export).subscribe(function () {
            self.router.navigate(['/data/export']);
            self.snackBar.open('Export created', undefined, {
                duration: 2000,
            });
        });
    }

    exportTypeChanged() {
        this.resetVars();
        this.export = {} as ExportModel;
        this.device = {} as DeviceInstancesModel;
        this.service = {} as DeviceTypeServiceModel;
        this.deviceType = {} as DeviceTypeModel;
        this.pipeline = {} as PipelineModel;
        this.operator = {} as PipelineOperatorModel;
    }

    deviceChanged(device: DeviceInstancesModel) {
        if (this.device !== device) {
            this.deviceTypeService.getDeviceType(device.device_type.id).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceType = resp;
                }
            });
            this.resetVars();
        }
    }

    serviceChanged(service: DeviceTypeServiceModel) {
        this.resetVars();
        const pathString = 'value';
        service.outputs.forEach((out: DeviceTypeContentModel) => {
            this.traverseDataStructure(pathString, out.content_variable);
        });
    }

    traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel) {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            pathString += '.' + field.name;
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField);
                });
            }
        } else {
            this.paths.set(pathString + '.' + field.name, field.type);
        }
    }

    pipelineChanged() {
        this.resetVars();
    }

    operatorChanged(operator: PipelineOperatorModel) {
        this.resetVars();
        this.operatorRepoService.getOperator(operator.operatorId).subscribe((resp: OperatorModel | null) => {
            if (resp !== null && resp.outputs !== undefined) {
                resp.outputs.forEach((out: IOModel) => {
                    this.paths.set('analytics.' + out.name,  out.type);
                });
            }
        });
    }

    addValue() {
        if (this.export.Values === undefined) {
            this.export.Values = [];
        }
        this.export.Values.push({} as ExportValueModel);
    }

    deleteValue(value: ExportValueModel) {
        if (this.export.Values !== undefined) {
            const index = this.export.Values.indexOf(value);
            if (index > -1) {
                this.export.Values.splice(index, 1);
            }
        }
    }

    pathChanged(id: number) {
        if (id !== undefined) {
            let type = this.paths.get(this.export.Values[id].Path);
            switch (this.paths.get(this.export.Values[id].Path)) {
                case this.typeString:
                    type = 'string';
                    break;
                case this.typeFloat:
                    type = 'float';
                    break;
                case this.typeInteger:
                    type = 'int';
                    break;
                case this.typeBoolean:
                    type = 'bool';
                    break;

            }
            // @ts-ignore
            this.export.Values[id].Type = type;
        }
    }

    loadPipelines() {
        this.pipelineRegistryService.getPipelines().subscribe((resp: PipelineModel[]) => {
            this.pipelines = resp;
        });
    }

    loadDevices() {
        this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc').subscribe((resp: DeviceInstancesModel []) => {
            this.devices = resp;
        });
    }

    resetVars() {
        this.paths.clear();
    }
}
