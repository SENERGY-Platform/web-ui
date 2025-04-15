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
import {Location} from '@angular/common';
import {DeviceInstancesService} from '../../devices/device-instances/shared/device-instances.service';
import {DeviceInstanceModel} from '../../devices/device-instances/shared/device-instances.model';
import {DeviceTypeService} from '../../metadata/device-types-overview/shared/device-type.service';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../metadata/device-types-overview/shared/device-type.model';
import {DatabaseType, ExportDatabaseModel, ExportModel, ExportValueModel} from '../shared/export.model';
import {ExportService} from '../shared/export.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {PipelineModel, PipelineOperatorModel} from '../../data/pipeline-registry/shared/pipeline.model';
import {PipelineRegistryService} from '../../data/pipeline-registry/shared/pipeline-registry.service';
import {ActivatedRoute, Router} from '@angular/router';
import {IOModel, OperatorModel} from '../../data/operator-repo/shared/operator.model';
import {OperatorRepoService} from '../../data/operator-repo/shared/operator-repo.service';
import {environment} from '../../../../environments/environment';
import {forkJoin, Observable, of} from 'rxjs';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ImportInstancesService} from '../../imports/import-instances/shared/import-instances.service';
import {ImportInstancesModel} from '../../imports/import-instances/shared/import-instances.model';
import {ImportTypeContentVariableModel, ImportTypeModel} from '../../imports/import-types/shared/import-types.model';
import {ImportTypesService} from '../../imports/import-types/shared/import-types.service';
import {map, startWith} from 'rxjs/operators';
import {AbstractControl, FormArray, FormControl, UntypedFormBuilder, Validators} from '@angular/forms';
import * as _ from 'lodash';
import {BrokerExportService} from '../shared/broker-export.service';
import {PageEvent} from '@angular/material/paginator';

@Component({
    selector: 'senergy-new-export',
    templateUrl: './new-export.component.html',
    styleUrls: ['./new-export.component.css'],
})
export class NewExportComponent implements OnInit {
    targetDb = 'db';
    targetBroker = 'broker';
    defaultPageSize = 5;
    offset = 0;
    lastPageEvent: PageEvent | undefined;

    formatControl = new FormControl('');
    timestamp_formats: string[] = ['%Y-%m-%dT%H:%M:%S.%fZ'];
    filtered_formats: Observable<string[]> = new Observable();

    exportForm = this.fb.group({
        selector: ['', Validators.required],
        targetSelector: [this.targetDb, Validators.required],
        customBrokerEnabled: [''],
        customMqttBroker: undefined,
        customMqttUser: undefined,
        customMqttPassword: undefined,
        customMqttBaseTopic: undefined,
        name: ['', Validators.required],
        description: '',
        device: [null, Validators.required],
        service: [
            {
                value: null,
                disabled: true,
            },
            Validators.required,
        ],
        timePath: {value: '', disabled: true},
        allMessages: false,
        import: [{value: null, disabled: true}, Validators.required],
        operator: [{value: null, disabled: true}, Validators.required],
        pipeline: [{value: null, disabled: true}, Validators.required],
        exportDatabaseId: [{value: environment.exportDatabaseIdInternalTimescaleDb}, Validators.required],
        timestampFormat: ['', Validators.required],
        exportValues: this.fb.array([] as ExportValueModel[]),
    });

    ready = true;
    export = {} as ExportModel;
    deviceType = {} as DeviceTypeModel;
    operator = {} as PipelineOperatorModel;
    devices: DeviceInstanceModel[] = [];
    pipelines: PipelineModel[] = [];
    paths = new Map<string, string | undefined>();
    image: SafeHtml = {};
    showImage = false;
    imports: ImportInstancesModel[] = [];
    importTypes: Map<string, ImportTypeModel> = new Map();

    timeSuggest = '';

    dropdown = ['float', 'string', 'int', 'bool', 'string_json'];

    typeString = 'https://schema.org/Text';
    typeInteger = 'https://schema.org/Integer';
    typeFloat = 'https://schema.org/Float';
    typeBoolean = 'https://schema.org/Boolean';
    typeList = 'https://schema.org/ItemList';
    typeStructure = 'https://schema.org/StructuredValue';

    id: string | null = null;

    exportDatabases: ExportDatabaseModel[] = [];

    constructor(
        private route: ActivatedRoute,
        private location: Location,
        private pipelineRegistryService: PipelineRegistryService,
        private deviceInstanceService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        private exportService: ExportService,
        private brokerExportService: BrokerExportService,
        private operatorRepoService: OperatorRepoService,
        private router: Router,
        private sanitizer: DomSanitizer,
        public snackBar: MatSnackBar,
        private importInstancesService: ImportInstancesService,
        private importTypesService: ImportTypesService,
        private fb: UntypedFormBuilder,
    ) {
        this.id = this.route.snapshot.paramMap.get('id');

        if (this.id) {
            this.ready = false;
        }

        this.exportForm.patchValue({selector: 'device'});
    }

    ngOnInit() {
        if (this.id) {
            this.exportForm.controls['selector'].disable({onlySelf: true, emitEvent: false});
            this.exportForm.controls['targetSelector'].setValue(
                this.id.startsWith(BrokerExportService.ID_PREFIX) ? this.targetBroker : this.targetDb,
            );
            this.exportForm.controls['targetSelector'].disable({onlySelf: true, emitEvent: false});
        }
        const array: Observable<DeviceInstanceModel[] | PipelineModel[] | ImportInstancesModel[] | ExportDatabaseModel[]>[] = [];

        array.push(this.deviceInstanceService.getDeviceInstances({limit: 9999, offset: 0}).pipe(map(res => res.result)));
        array.push(this.pipelineRegistryService.getPipelines());
        array.push(this.importInstancesService.listImportInstances('', 9999, 0, 'name.asc'));
        array.push(this.exportService.getExportDatabases());

        forkJoin(array).subscribe((response) => {
            this.devices = response[0] as DeviceInstanceModel[];
            this.pipelines = response[1] as PipelineModel[];
            console.log(this.pipelines);
            this.imports = response[2] as ImportInstancesModel[];
            this.exportDatabases = response[3] as ExportDatabaseModel[];
            this.exportForm.patchValue({exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb});
            setTimeout(() => {
                if (this.id !== null) {
                    const obs = (
                        this.id.startsWith(BrokerExportService.ID_PREFIX) ? this.brokerExportService : this.exportService
                    ).getExport(this.id);
                    obs.subscribe((exp: ExportModel | null) => {
                        if (exp !== null) {
                            this.exportForm.patchValue({
                                name: exp.Name,
                                description: exp.Description,
                                timePath: exp.TimePath,
                                customBrokerEnabled: exp.CustomMqttBroker !== undefined && exp.CustomMqttBroker !== null,
                                customMqttBroker: exp.CustomMqttBroker,
                                customMqttUser: exp.CustomMqttUser,
                                customMqttPassword: exp.CustomMqttPassword,
                                customMqttBaseTopic: exp.CustomMqttBaseTopic,
                                exportDatabaseId: exp.ExportDatabaseID,
                                timestampFormat: exp.TimestampFormat,
                            });
                            exp.Values.forEach(v => this.addValue(v.Name, v.Path, v.Type, v.Tag));
                            if (exp.Offset === 'smallest') {
                                this.exportForm.patchValue({allMessages: true});
                            }
                            if (exp.FilterType === 'deviceId') {
                                this.exportForm.patchValue({selector: 'device'});
                                setTimeout(() => {
                                    this.devices.forEach((device) => {
                                        if (device.id === exp.Filter) {
                                            this.exportForm.patchValue({device});
                                            this.deviceTypeService
                                                .getDeviceType(device.device_type_id)
                                                .subscribe((resp: DeviceTypeModel | null) => {
                                                    if (resp !== null) {
                                                        this.deviceType = resp;
                                                        this.deviceType.services.forEach((service) => {
                                                            if (service.id === exp.Topic!.replace(/_/g, ':')) {
                                                                this.exportForm.patchValue({service});
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
                                this.exportForm.patchValue({selector: 'pipe'});
                                this.pipelines.forEach((pipeline) => {
                                    if (pipeline.id === exp.Filter.split(':')[0]) {
                                        this.exportForm.patchValue({pipeline});
                                        this.exportForm.value.pipeline.operators.forEach((operator: PipelineOperatorModel) => {
                                            if (operator.id === exp.Filter.split(':')[1]) {
                                                this.operator = operator;
                                                this.updateImage(this.operator.id);
                                                this.operatorRepoService
                                                    .getOperator(operator.operatorId)
                                                    .subscribe((resp: OperatorModel | null) => {
                                                        if (resp !== null && resp.outputs !== undefined) {
                                                            resp.outputs.forEach((out: IOModel) => {
                                                                this.paths.set('analytics.' + out.name, out.type);
                                                            });
                                                        }
                                                        this.paths.set('time', 'string');
                                                        this.paths.set('analytics', this.typeStructure);
                                                    });
                                            }
                                        });
                                    }
                                });
                            } else if (exp.FilterType === 'pipeId') {
                                this.snackBar.open('Outdated export version - Please reconfigure and redeploy the export', 'close', {
                                    duration: 5000,
                                    verticalPosition: 'top',
                                    panelClass: 'snack-bar-error'
                                });
                                this.exportForm.patchValue({selector: 'pipe'});
                                this.pipelines.forEach((pipeline) => {
                                    if (pipeline.id === exp.Filter) {
                                        this.exportForm.patchValue({pipeline});
                                        if (this.exportForm.value.pipeline.operators.length === 1) {
                                            this.operator = pipeline.operators[0];
                                            this.operatorRepoService
                                                .getOperator(this.operator.operatorId)
                                                .subscribe((resp: OperatorModel | null) => {
                                                    if (resp !== null && resp.outputs !== undefined) {
                                                        resp.outputs.forEach((out: IOModel) => {
                                                            this.paths.set('analytics.' + out.name, out.type);
                                                        });
                                                    }
                                                    this.paths.set('time', 'string');
                                                    this.paths.set('analytics', this.typeStructure);
                                                });
                                        }
                                    }
                                });
                            } else if (exp.FilterType === 'import_id') {
                                this.exportForm.patchValue({selector: 'import'});
                                const importInstance: ImportInstancesModel =
                                    this.imports.find((i) => i.id === exp.Filter) || ({} as ImportInstancesModel);
                                this.exportForm.patchValue({import: importInstance});
                                this.getImportType(exp.ServiceName).subscribe((type) => {
                                    type.output.sub_content_variables?.forEach((output) => this.traverseDataStructure('', output));
                                });
                            }
                            this.export = exp;
                        }
                        setTimeout(() => this.onChanges(), 100); // delay for async init
                    });
                } else {
                    this.onChanges();
                }
            }, 0);
            this.ready = true;
        });

        this.filtered_formats = this.formatControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value || '')),
        );
    }

    onSubmit() {
        if (this.exportForm.valid) {
            const self = this;

            this.export.Name = this.exportForm.value.name;
            this.export.Description = this.exportForm.value.description;
            this.export.TimePath = this.exportForm.value.timePath;
            this.export.Values = this.exportForm.value.exportValues;
            this.export.CustomMqttBroker = this.exportForm.value.customMqttBroker;
            this.export.CustomMqttUser = this.exportForm.value.customMqttUser;
            this.export.CustomMqttPassword = this.exportForm.value.customMqttPassword;
            this.export.CustomMqttBaseTopic = this.exportForm.value.customMqttBaseTopic;
            this.export.ExportDatabaseID = this.exportForm.value.exportDatabaseId;
            this.export.TimestampFormat = this.exportForm.value.timestampFormat;

            if (this.exportForm.value.selector === 'device') {
                this.export.EntityName = this.exportForm.value.device.name;
                this.export.Filter = this.exportForm.value.device.id;
                this.export.FilterType = 'deviceId';
                this.export.ServiceName = this.exportForm.value.service.name;
                this.export.Topic = this.exportForm.value.service.id.replace(/#/g, '_').replace(/:/g, '_');
            } else if (this.exportForm.value.selector === 'pipe') {
                this.export.EntityName = this.operator.id;
                this.export.Filter = this.exportForm.value.pipeline.id + ':' + this.operator.id;
                this.export.FilterType = 'operatorId';
                this.export.ServiceName = this.operator.name;
                this.export.Topic = 'analytics-' + this.operator.name;
            }

            if (this.exportForm.value.allMessages) {
                this.export.Offset = 'smallest';
            } else {
                this.export.Offset = 'largest';
            }
            if (this.id !== null) {
                this.ready = false;
                const obs = (this.id.startsWith(BrokerExportService.ID_PREFIX) ? this.brokerExportService : this.exportService).editExport(
                    this.id,
                    this.export,
                );
                obs.subscribe((response) => {
                    if (response.status === 200) {
                        self.router.navigate(['/exports', self.id?.startsWith(BrokerExportService.ID_PREFIX) ? 'broker' : 'db']);
                        self.snackBar.open('Export updated', undefined, {
                            duration: 2000,
                        });
                    } else {
                        this.snackBar.open('Export could not be updated', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.ready = true;
                });
            } else {
                const obs = (
                    this.exportForm.get('targetSelector')?.value === this.targetDb ? this.exportService : this.brokerExportService
                ).startPipeline(this.export);
                obs.subscribe(function() {
                    self.router.navigate(['/exports', self.exportForm.get('targetSelector')?.value === self.targetDb ? 'db' : 'broker']);
                    self.snackBar.open('Export created', undefined, {
                        duration: 2000,
                    });
                });
            }
        }
        this.exportForm.markAllAsTouched();
    }

    onChanges(): void {
        if (this.exportForm) {
            if (this.exportForm.get('selector')) {
                this.exportForm.get('selector')?.valueChanges.subscribe((selection) => {
                    if (selection === 'device') {
                        this.exportForm.controls['device'].enable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['service'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['pipeline'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['operator'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['import'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['timePath'].disable({onlySelf: true, emitEvent: false});
                    } else if (selection === 'pipe') {
                        this.exportForm.controls['device'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['service'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['pipeline'].enable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['operator'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['import'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['timePath'].disable({onlySelf: true, emitEvent: false});
                    } else if (selection === 'import') {
                        this.exportForm.controls['device'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['service'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['pipeline'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['operator'].disable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['import'].enable({onlySelf: true, emitEvent: false});
                        this.exportForm.controls['timePath'].disable({onlySelf: true, emitEvent: false});
                    }

                    if (!this.id) {
                        this.resetVars();
                        this.exportForm.reset(
                            {
                                selector: selection,
                                targetSelector: this.targetDb,
                                exportDatabaseId: this.exportForm.get('exportDatabaseId')?.value
                            },
                            {onlySelf: false, emitEvent: false},
                        );
                        this.exportForm.markAsUntouched();

                        this.export = {} as ExportModel;
                        this.deviceType = {} as DeviceTypeModel;
                        this.operator = {} as PipelineOperatorModel;
                    }
                });
            }
            this.exportForm.get('targetSelector')?.valueChanges.subscribe((target) => {
                if (target === this.targetDb) {
                    this.exportForm.patchValue({
                        customBrokerEnabled: false,
                        customMqttBroker: undefined,
                        customMqttUser: undefined,
                        customMqttPassword: undefined,
                        customMqttBaseTopic: undefined,
                    });
                }
                this.autofillValues();
            });
            this.exportForm.get('customBrokerEnabled')?.valueChanges.subscribe((customBrokerEnabled) => {
                if (!customBrokerEnabled) {
                    this.exportForm.patchValue({
                        customMqttBroker: undefined,
                        customMqttUser: undefined,
                        customMqttPassword: undefined,
                        customMqttBaseTopic: undefined,
                    });
                } else {
                    this.exportForm.patchValue({
                        customMqttBroker: '',
                        customMqttUser: '',
                        customMqttPassword: '',
                        customMqttBaseTopic: '',
                    });
                }
            });
            if (this.exportForm.get('device')) {
                this.exportForm.get('device')?.valueChanges.subscribe((device: DeviceInstanceModel) => {
                    if (!_.isEmpty(device)) {
                        if (this.exportForm.value.device !== device) {
                            this.deviceTypeService.getDeviceType(device.device_type_id).subscribe((resp: DeviceTypeModel | null) => {
                                if (resp !== null) {
                                    this.deviceType = resp;
                                    this.exportForm.controls.service.enable();
                                }
                            });
                            if (!this.id || (this.id && this.export.FilterType !== 'device')) {
                                this.resetVars();
                            }
                        }
                    }
                });
            }
            if (this.exportForm.get('service')) {
                this.exportForm.get('service')?.valueChanges.subscribe((service: DeviceTypeServiceModel) => {
                    if (!_.isEmpty(service)) {
                        this.resetVars();
                        const pathString = 'value';
                        service.outputs.forEach((out: DeviceTypeContentModel) => {
                            this.traverseDataStructure(pathString, out.content_variable);
                        });
                        this.exportForm.controls.timePath.enable();
                        this.autofillValues();
                    }
                });
            }
            if (this.exportForm.get('pipeline')) {
                this.exportForm.get('pipeline')?.valueChanges.subscribe((pipe: PipelineModel) => {
                    this.exportForm.patchValue({operator: null, timePath: null});
                    this.operator = {} as PipelineOperatorModel;

                    if (!_.isEmpty(pipe)) {
                        this.exportForm.controls['operator'].enable({onlySelf: true, emitEvent: false});
                    } else {
                        this.exportForm.controls['operator'].disable({onlySelf: true, emitEvent: false});
                    }
                    this.exportForm.value.pipeline = pipe;
                    this.resetVars();
                    if (typeof this.exportForm.value.pipeline.image === 'string') {
                        const parser = new DOMParser();
                        const svg = parser
                            .parseFromString(this.exportForm.value.pipeline.image, 'image/svg+xml')
                            .getElementsByTagName('svg')[0];
                        const viewbox = svg.getAttribute('viewbox')!.split(' ');
                        svg.setAttribute('height', viewbox[3]);
                        this.image = this.sanitizer.bypassSecurityTrustHtml(new XMLSerializer().serializeToString(svg));
                        if (pipe.operators.length === 1) {
                            this.operator = pipe.operators[0];
                            this.operatorChanged(this.operator);
                        }
                    }
                });
            }

            if (this.exportForm.get('import')) {
                this.exportForm.get('import')?.valueChanges.subscribe((i: ImportInstancesModel) => {
                    this.resetVars();
                    if (!_.isEmpty(i)) {
                        this.exportForm.controls['timePath'].enable({onlySelf: true, emitEvent: false});
                    } else {
                        this.exportForm.controls['timePath'].disable({onlySelf: true, emitEvent: false});
                    }
                    this.getImportType(i.import_type_id).subscribe((type) => {
                        type.output.sub_content_variables?.forEach((output) => this.traverseDataStructure('', output));
                        this.autofillValues();
                    });
                    this.export.Filter = i.id;
                    this.export.Topic = i.kafka_topic;
                    this.export.FilterType = 'import_id';
                    this.export.EntityName = i.name;
                    this.export.ServiceName = i.import_type_id;
                });
            }

            if (this.exportForm.get('timePath')) {
                this.exportForm.get('timePath')?.valueChanges.subscribe((path) => {
                    if (path !== '' && path !== null) {
                        // ensure value not also exported
                        const i = this.exportValues.controls.findIndex((v) => v.value.Path === path);
                        if (i !== -1) {
                            this.exportValues.removeAt(i);
                        }

                        if (!_.isEmpty(this.exportForm.value.service)) {
                            if (
                                this.exportForm.value.selector === 'device' &&
                                this.paths.has(path) &&
                                this.exportForm.value.service.outputs.length === 1
                            ) {
                                const values = this.exportService.addCharacteristicToDeviceTypeContentVariable(
                                    this.exportForm.value.service.outputs[0].content_variable,
                                );
                                const selectedValue = values.find((v) => v.Path === path);
                                if (
                                    selectedValue !== undefined &&
                                    selectedValue.characteristicId === environment.timeStampCharacteristicUnixSecondsId
                                ) {
                                    this.export.TimePrecision = 's';
                                } else {
                                    this.export.TimePrecision = undefined; //  No precision for iso string, nanos or unknown
                                }
                            } else {
                                this.export.TimePrecision = undefined; //  No precision for or unknown or pipeline
                            }
                        }

                        this.autofillValues();
                    }
                });
            }

            this.formatControl.valueChanges.subscribe((selection) => {
                this.exportForm.get('timestampFormat')?.setValue(selection);
            });
        }
    }

    traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) {
        if (field.type === this.typeStructure && field.type !== undefined && field.type !== null) {
            if (pathString.length > 0) {
                pathString += '.';
            }
            pathString += field.name;
            this.paths.set(pathString, this.typeStructure);
            if (field.sub_content_variables !== undefined && field.sub_content_variables !== null) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField);
                });
            }
        } else {
            let path = pathString;
            if (pathString.length > 0) {
                path += '.';
            }
            path += field.name;
            this.paths.set(path, field.type);
            if (field.characteristic_id === environment.timeStampCharacteristicId) {
                this.timeSuggest = path;
            }
        }
    }

    operatorSelectChanged(opened: boolean) {
        this.showImage = opened;
    }

    updateImage(id: string) {
        if (typeof this.exportForm.value.pipeline.image === 'string') {
            const parser = new DOMParser();
            const svg = parser.parseFromString(this.exportForm.value.pipeline.image, 'image/svg+xml').getElementsByTagName('svg')[0];
            const viewbox = svg.getAttribute('viewbox')!.split(' ');
            svg.setAttribute('height', viewbox[3]);
            const elements = svg.getElementsByClassName('joint-cell') as any;
            for (const element of elements) {
                if (element.attributes['model-id'].value === id) {
                    for (const node of element.childNodes) {
                        if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                            node.attributes['stroke'].value = 'red';
                        }
                    }
                }
            }
            this.image = this.sanitizer.bypassSecurityTrustHtml(new XMLSerializer().serializeToString(svg));
        }
    }

    operatorChanged(operator: PipelineOperatorModel) {
        this.resetVars();
        this.exportForm.patchValue({operator, timePath: null});
        this.exportForm.controls['timePath'].enable({onlySelf: true, emitEvent: false});
        this.updateImage(operator.id);
        this.operatorRepoService.getOperator(operator.operatorId).subscribe((resp: OperatorModel | null) => {
            if (resp !== null && resp.outputs !== undefined) {
                resp.outputs.forEach((out: IOModel) => {
                    this.paths.set('analytics.' + out.name, out.type);
                });
            }
            this.paths.set('time', 'string');
            this.paths.set('analytics', this.typeStructure);
            this.exportForm.patchValue({timePath: 'time', timeFormat: '%Y-%m-%dT%H:%M:%S.%fZ'});
            this.autofillValues();
        });
    }

    get exportValues(): FormArray {
        return this.exportForm.get('exportValues') as FormArray;
    }

    addValue(name?: string, path?: string, type?: string, tag?: boolean) {
        this.exportValues.push(
            this.fb.group({
                Name: name || '',
                Path: path || '',
                Type: type || '',
                Tag: tag || false,
            }),
        );
    }

    deleteValue(index: number) {
        this.exportValues.removeAt(index);
    }

    pathChanged(id: number) {
        if (id !== undefined) {
            if (this.exportValues.at(id).value.Tag) {
                this.exportValues.at(id).patchValue({Type: 'string'});
            } else {
                let type = this.paths.get(this.exportValues.at(id).value.Path);
                switch (this.paths.get(this.exportValues.at(id).value.Path)) {
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
                case this.typeList:
                case this.typeStructure:
                    type = 'string_json';
                    break;
                }

                this.exportValues.at(id).patchValue({Type: type});
            }
        }
    }

    resetVars() {
        this.paths.clear();
        this.exportValues.clear();
    }

    autofillValues() {
        if (this.exportForm.value.timePath === '' || this.exportForm.value.timePath === null) {
            if (this.exportForm.value.selector === 'pipe') {
                this.exportForm.patchValue({
                    timePath: 'time',
                    timestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ'
                }, {onlySelf: true, emitEvent: false});
                this.formatControl.setValue('%Y-%m-%dT%H:%M:%S.%fZ');
            } else if (this.exportForm.value.selector === 'import') {
                this.exportForm.patchValue({timePath: 'time', timestampFormat: '%Y-%m-%dT%H:%M:%SZ'}, {
                    onlySelf: true,
                    emitEvent: false
                });
                this.formatControl.setValue('%Y-%m-%dT%H:%M:%S.%fZ');
            } else if (this.exportForm.value.selector === 'device') {
                this.exportForm.patchValue({timePath: this.timeSuggest, timestampFormat: null}, {
                    onlySelf: true,
                    emitEvent: false
                });
            }
        }
        if (this.exportForm.value.selector === 'import') {
            if (this.exportForm.value.import === null || this.exportForm.value.import === undefined) {
                return;
            }
            const importType = this.importTypes.get(this.exportForm.value.import.import_type_id);
            if (importType !== undefined) {
                this.exportValues.clear();
                const values = this.importTypesService.parseImportTypeExportValues(
                    importType,
                    this.exportForm.getRawValue().targetSelector === this.targetBroker,
                );
                if (this.exportForm.getRawValue().targetSelector === this.targetBroker) {
                    values.forEach((value) => this.addValue(value.Path.replace(/\./g, '/'), value.Path, value.Type, value.Tag));
                } else {
                    values.forEach((value) => this.addValue(value.Name, value.Path, value.Type, value.Tag));
                }
                this.exportValues.controls.forEach((_2, index) => this.pathChanged(index));
            } else {
                this.exportValues.clear();
            }
        } else {
            const hasAmbiguousNames = this.hasAmbiguousNames();
            this.exportValues.clear();
            this.paths.forEach((_type, path) => {
                if (this.exportForm.getRawValue().targetSelector === this.targetBroker) {
                    this.addValue(path.replace(/\./g, '/'), path);
                    const index = this.exportValues.controls.length - 1;
                    this.pathChanged(index);
                } else if (this.exportForm.value.timePath !== path && path !== 'time' && _type !== this.typeStructure) {
                    // don't add path if it's selected as time
                    this.addValue(hasAmbiguousNames ? path : path.slice(path.lastIndexOf('.') + 1), path);
                    const index = this.exportValues.controls.length - 1;
                    this.pathChanged(index);
                }
            });
        }
    }

    private hasAmbiguousNames(): boolean {
        const m = new Map<string, null>();
        for (const path of this.paths.keys()) {
            const name = path.slice(path.lastIndexOf('.') + 1);
            if (m.has(name)) {
                return true;
            }
            m.set(name, null);
        }

        return false;
    }

    getPathsKeyOptions(): string[] {
        return Array.from(this.paths.keys());
    }

    private getImportType(id: string): Observable<ImportTypeModel> {
        const importType = this.importTypes.get(id);
        if (importType !== undefined) {
            return of(importType);
        }
        return this.importTypesService.getImportType(id).pipe(
            map((type) => {
                this.importTypes.set(id, type);
                return type;
            }),
        );
    }

    selectOperator($event: MouseEvent) {
        for (const operatorNode of ($event.target as any)?.nearestViewportElement?.getElementsByClassName('joint-cells-layer')[0].childNodes || []) {
            if (
                operatorNode.attributes['data-type'] !== undefined &&
                operatorNode.attributes['data-type'].value === 'senergy.NodeElement'
            ) {
                const rect: DOMRect = operatorNode.getBoundingClientRect();
                if ($event.x < rect.right && $event.x > rect.left && $event.y > rect.top && $event.y < rect.bottom) {
                    const clickedOperator = this.exportForm.value.pipeline.operators.find(
                        (o: PipelineOperatorModel) => o.id === operatorNode.attributes['model-id'].value,
                    );
                    if (clickedOperator !== undefined) {
                        this.operator = clickedOperator;
                        this.operatorChanged(this.operator);
                        return;
                    }
                }
            }
        }
    }

    goBack() {
        this.location.back();
    }

    movePage($event: PageEvent) {
        this.lastPageEvent = $event;
        this.offset = this.lastPageEvent.pageIndex * this.lastPageEvent.pageSize;
    }

    getExportValuesControls(): AbstractControl[] {
        if (this.lastPageEvent === undefined) {
            return this.exportValues.controls.slice(0, this.defaultPageSize);
        }
        return this.exportValues.controls.slice(this.offset,
            (this.lastPageEvent.pageIndex + 1) * this.lastPageEvent.pageSize);
    }

    isTimescaleSelected() {
        return this.exportDatabases.find((e: ExportDatabaseModel) => e.ID === this.exportForm.getRawValue().exportDatabaseId)?.Type === DatabaseType.timescaledb;
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.timestamp_formats.filter(format => format.toLowerCase().includes(filterValue));
    }
}
