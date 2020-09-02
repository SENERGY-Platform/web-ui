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
import {MatSnackBar} from '@angular/material/snack-bar';
import {PipelineModel, PipelineOperatorModel} from '../../pipeline-registry/shared/pipeline.model';
import {PipelineRegistryService} from '../../pipeline-registry/shared/pipeline-registry.service';
import {ActivatedRoute, Router} from '@angular/router';
import {IOModel, OperatorModel} from '../../operator-repo/shared/operator.model';
import {OperatorRepoService} from '../../operator-repo/shared/operator-repo.service';
import {environment} from '../../../../../environments/environment';
import {forkJoin, Observable} from 'rxjs';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

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
    image: SafeHtml = {};
    showImage = false;

    timeSuggest = '';

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

    id = null as any;


    constructor(
        private route: ActivatedRoute,
        private pipelineRegistryService: PipelineRegistryService,
        private deviceInstanceService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        private exportService: ExportService,
        private operatorRepoService: OperatorRepoService,
        private router: Router,
        private sanitizer: DomSanitizer,
        public snackBar: MatSnackBar
    ) {
        this.id = this.route.snapshot.paramMap.get('id');
    }

    ngOnInit() {
        const array: Observable<(DeviceInstancesModel[] | PipelineModel[])>[] = [];

        array.push(this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc'));
        array.push(this.pipelineRegistryService.getPipelines());

        forkJoin(array).subscribe(response => {
            this.devices = response [0] as DeviceInstancesModel[];
            this.pipelines = response [1] as PipelineModel[];
            setTimeout(() => {
                const id = this.route.snapshot.paramMap.get('id');
                if (id !== null) {
                    this.exportService.getExport(id).subscribe((exp: ExportModel | null) => {
                        if (exp !== null) {
                            if (exp.FilterType === 'deviceId') {
                                this.selector = 'device';
                                setTimeout(() => {
                                    this.devices.forEach(device => {
                                        if (device.id === exp.Filter) {
                                            this.device = device;
                                            this.deviceTypeService.getDeviceType(device.device_type.id)
                                                .subscribe((resp: DeviceTypeModel | null) => {
                                                    if (resp !== null) {
                                                        this.deviceType = resp;
                                                        this.deviceType.services.forEach(service => {
                                                            // @ts-ignore
                                                            if (service.id === exp.Topic.replace(/_/g, ':')) {
                                                                this.service = service;
                                                                service.outputs.forEach((out: DeviceTypeContentModel) => {
                                                                    const pathString = 'value';
                                                                    this.traverseDataStructure(pathString, out.content_variable);
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                        }
                                    });
                                });
                            } else if (exp.FilterType === 'operatorId') {
                                this.selector = 'pipe';
                                this.pipelines.forEach(pipeline => {
                                    if (pipeline.id === exp.Filter.split(':')[0]) {
                                        this.pipeline = pipeline;
                                        this.pipeline.operators.forEach(operator => {
                                            if (operator.id === exp.Filter.split(':')[1]) {
                                                this.operator = operator;
                                                this.operatorRepoService.getOperator(operator.operatorId)
                                                    .subscribe((resp: OperatorModel | null) => {
                                                        if (resp !== null && resp.outputs !== undefined) {
                                                            resp.outputs.forEach((out: IOModel) => {
                                                                this.paths.set('analytics.' + out.name, out.type);
                                                            });
                                                        }
                                                        this.paths.set('time', 'string');
                                                    });
                                            }
                                        });
                                    }
                                });
                            } else if (exp.FilterType === 'pipeId') {
                                this.snackBar.open('Outdated export version - Please reconfigure and redeploy the export', undefined, {
                                    duration: 5000,
                                    verticalPosition: 'top',
                                });
                                this.selector = 'pipe';
                                this.pipelines.forEach(pipeline => {
                                    if (pipeline.id === exp.Filter) {
                                        this.pipeline = pipeline;
                                        if (this.pipeline.operators.length === 1) {
                                            this.operator = pipeline.operators[0];
                                            this.operatorRepoService.getOperator(this.operator.operatorId)
                                                .subscribe((resp: OperatorModel | null) => {
                                                    if (resp !== null && resp.outputs !== undefined) {
                                                        resp.outputs.forEach((out: IOModel) => {
                                                            this.paths.set('analytics.' + out.name, out.type);
                                                        });
                                                    }
                                                    this.paths.set('time', 'string');
                                                });
                                        }
                                    }
                                });
                            }
                            this.export = exp;
                        }
                    });
                }
            }, 0);
        });
        this.ready = true;
    }

    startExport() {
        const self = this;
        if (this.selector === 'device') {
            this.export.EntityName = this.device.name;
            this.export.Filter = this.device.id;
            this.export.FilterType = 'deviceId';
            this.export.ServiceName = this.service.name;
            this.export.Topic = this.service.id.replace(/#/g, '_').replace(/:/g, '_');
        } else if (this.selector === 'pipe') {
            this.export.EntityName = this.operator.id;
            this.export.Filter = this.pipeline.id + ':' + this.operator.id;
            this.export.FilterType = 'operatorId';
            this.export.ServiceName = this.operator.name;
            this.export.Topic = 'analytics-' + this.operator.name;
        }
        if (this.allMessages) {
            this.export.Offset = 'smallest';
        } else {
            this.export.Offset = 'largest';
        }
        if (this.route.snapshot.paramMap.get('id') !== null) {
            this.ready = false;
            this.exportService.editExport(this.id, this.export).subscribe((response) => {
                if (response.status === 200) {
                    self.router.navigate(['/data/export']);
                    self.snackBar.open('Export updated', undefined, {
                        duration: 2000,
                    });
                } else {
                    this.snackBar.open('Export could not be updated', undefined, {
                        duration: 2000,
                    });
                }
                this.ready = true;
            });
        } else {
            this.exportService.startPipeline(this.export).subscribe(function () {
                self.router.navigate(['/data/export']);
                self.snackBar.open('Export created', undefined, {
                    duration: 2000,
                });
            });
        }
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
        this.autofillValues();
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
            const path = pathString + '.' + field.name;
            this.paths.set(path, field.type);
            if (field.characteristic_id === environment.timeStampCharacteristicId) {
                this.timeSuggest = path;
            }
        }
    }

    pipelineChanged(pipe: PipelineModel) {
        this.pipeline = pipe;
        this.resetVars();
        if (typeof this.pipeline.image === 'string') {
            const parser = new DOMParser();
            const svg = parser.parseFromString(this.pipeline.image, 'image/svg+xml').getElementsByTagName('svg')[0];
            // @ts-ignore
            const viewbox = svg.getAttribute('viewbox').split(' ');
            svg.setAttribute('height', viewbox[3]);
            this.image = this.sanitizer.bypassSecurityTrustHtml(
                new XMLSerializer().serializeToString(svg));
        }
    }

    operatorSelectChanged (opened: boolean) {
        opened ? this.showImage = true : this.showImage = false;
    }

    enterOperatorOption (id: string) {
        if (typeof this.pipeline.image === 'string') {
            const parser = new DOMParser();
            const svg = parser.parseFromString(this.pipeline.image, 'image/svg+xml').getElementsByTagName('svg')[0];
            // @ts-ignore
            const viewbox = svg.getAttribute('viewbox').split(' ');
            svg.setAttribute('height', viewbox[3]);
            const elements = svg.getElementsByClassName('joint-cell');
            // @ts-ignore
            for (const element of elements) {
                if (element.attributes['model-id'].value === id) {
                    for (const node of element.childNodes) {
                        if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                            node.attributes['stroke'].value = 'red';
                        }
                    }
                }
            }
            this.image = this.sanitizer.bypassSecurityTrustHtml(
                new XMLSerializer().serializeToString(svg));
        }
    }

    operatorChanged(operator: PipelineOperatorModel) {
        this.resetVars();
        this.operatorRepoService.getOperator(operator.operatorId).subscribe((resp: OperatorModel | null) => {
            if (resp !== null && resp.outputs !== undefined) {
                resp.outputs.forEach((out: IOModel) => {
                    this.paths.set('analytics.' + out.name, out.type);
                });
            }
            this.paths.set('time', 'string');
            this.autofillValues();
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

    resetVars() {
        this.paths.clear();
        this.export.Values = [];
    }

    autofillValues() {
        if (this.selector === 'pipe') {
            this.export.TimePath = 'time';
        } else if (this.selector === 'device') {
            this.export.TimePath = this.timeSuggest;
        }

        const hasAmbiguousNames = this.hasAmbiguousNames();
        this.export.Values = [];
        this.paths.forEach((_type, path) => {
            if (this.export.TimePath !== path) { // don't add path if it's selected as time
                this.addValue();
                const index = this.export.Values.length - 1;
                this.export.Values[index].Name = hasAmbiguousNames ? path : path.slice(path.lastIndexOf('.') + 1);
                this.export.Values[index].Path = path;
                this.pathChanged(index);
            }
        });
    }

    onTimePathSelected(path: string) {
        // ensure value not also exported
        const i = this.export.Values.findIndex(v => v.Path === this.export.TimePath);
        if (i !== -1) {
            this.export.Values.splice(i, 1);
        }

        if (this.selector === 'device' && this.paths.has(path) && this.service.outputs.length === 1) {
            const values = this.exportService.addCharacteristicToDeviceTypeContentVariable(this.service.outputs[0].content_variable);
            const selectedValue = values.find(v => v.Path === path);
            if (selectedValue !== undefined && selectedValue.characteristicId === environment.timeStampCharacteristicUnixSecondsId) {
                this.export.TimePrecision = 's';
            } else {
                this.export.TimePrecision = undefined; //  No precision for iso string, nanos or unknown
            }
        } else {
            this.export.TimePrecision = undefined; //  No precision for or unknown or pipeline
        }
    }

    private hasAmbiguousNames(): boolean {
        const map = new Map<String, null>();
        for (const path of this.paths.keys()) {
            const name = path.slice(path.lastIndexOf('.') + 1);
            if (map.has(name)) {
                return true;
            }
            map.set(name, null);
        }

        return false;
    }
}
