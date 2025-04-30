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

import { Component, OnInit } from '@angular/core';
import { ParserService } from '../shared/parser.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ParseModel } from '../shared/parse.model';
import { DeviceInstanceModel, DeviceInstanceWithDeviceTypeModel, DeviceSelectablesFullModel } from '../../../devices/device-instances/shared/device-instances.model';
import { DeviceInstancesService } from '../../../devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeAspectModel, DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { FlowEngineService } from '../shared/flow-engine.service';
import { NodeConfig, NodeModel, NodeValue, PipelineInputSelectionModel, PipelineRequestModel } from './shared/pipeline-request.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { concatMap, first, map } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { DeviceGroupsService } from '../../../devices/device-groups/shared/device-groups.service';
import { PathOptionsService } from '../shared/path-options.service';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { ConceptsService } from '../../../metadata/concepts/shared/concepts.service';
import { OperatorInputTopic, PipelineModel, PipelineOperatorModel } from '../../pipeline-registry/shared/pipeline.model';
import { PipelineRegistryService } from '../../pipeline-registry/shared/pipeline-registry.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OperatorModel } from '../../operator-repo/shared/operator.model';
import { OperatorRepoService } from '../../operator-repo/shared/operator-repo.service';
import { ImportInstancesService } from '../../../imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../imports/import-instances/shared/import-instances.model';
import { GroupValueFn } from '@ng-matero/extensions/select';

interface CustomSelectable {
    id: string;
    name: string;
    groupName?: string;
}

interface DeviceServicePath {
    devicesOrImports: string[];
    values: NodeValue[];
    topic: string;
}

interface DeviceTypeAspectModelWithRootName extends DeviceTypeAspectModel {
    root_name?: string;
}

@Component({
    selector: 'senergy-deploy-flow',
    templateUrl: './deploy-flow.component.html',
    styleUrls: ['./deploy-flow.component.css'],
})
export class DeployFlowComponent implements OnInit {
    constructor(
        private parserService: ParserService,
        private route: ActivatedRoute,
        private router: Router,
        public snackBar: MatSnackBar,
        private deviceInstanceService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        private deviceGroupsService: DeviceGroupsService,
        private pathOptionsService: PathOptionsService,
        private pipelineRegistryService: PipelineRegistryService,
        private fb: UntypedFormBuilder,
        private conceptsService: ConceptsService,
        private sanitizer: DomSanitizer,
        private operatorRepoService: OperatorRepoService,
        private importInstancesService: ImportInstancesService,
        private flowEngineService: FlowEngineService,
    ) { }

    static DEVICE_KEY = 'Devices';
    static GROUP_KEY = 'Device Groups';
    static IMPORT_KEY = 'Imports';
    static GROUP_PREFIX = 'urn:infai:ses:device-group:';
    static IMPORT_PREFIX = 'urn:infai:ses:import:';

    ready = false;
    flowId = '';
    pipelineId = '';
    editMode = false;
    allDevices: DeviceInstanceWithDeviceTypeModel[] = [];
    pipelines: PipelineModel[] = [];
    aspects: DeviceTypeAspectModelWithRootName[] = [];
    rootAspects = new Map<string, string>();
    aspectFunctions = new Map<string, DeviceTypeFunctionModel[]>();
    selectables = new Map<string, DeviceSelectablesFullModel[]>();
    selectablesCharacteristics = new Map<string, Map<string, CustomSelectable[]>>();
    deviceGroupDevices = new Map<string, string[]>();
    serviceOptions: Map<string, Map<string, Map<string, Map<string, Map<string, { path: string; service_id: string }[]>>>>> = new Map();
    services = new Map<string, DeviceTypeServiceModel>();
    functionCharacteristics: Map<string, DeviceTypeCharacteristicsModel[]> = new Map();
    operators: Map<string, OperatorModel> = new Map();
    importInstances: ImportInstancesModel[] = [];

    form = this.fb.group({
        name: ['', Validators.required],
        description: '',
        nodes: this.fb.array([]),
        windowTime: 30,
        enable_metrics: [{ value: true, disabled: true }],
        consume_all_msgs: false,
        mergeStrategy: '',
    });

    private static stringArrayKey(s: string[] | null | undefined): string {
        if (s === null) {
            return 'null';
        }
        if (s === undefined) {
            return 'undefined';
        }
        const copy = JSON.parse(JSON.stringify(s)) as string[];
        const key = copy.sort().join(',');
        return key;
    }

    ngOnInit() {
        const obs: Observable<unknown>[] = [];
        obs.push(this.deviceTypeService.getAspects().pipe(map(aspects => {
            const tmp: DeviceTypeAspectModelWithRootName[] = [];
            aspects.forEach(root => {
                const rootWithName = root as DeviceTypeAspectModelWithRootName;
                if (rootWithName.sub_aspects !== undefined && rootWithName.sub_aspects !== null && rootWithName.sub_aspects.length > 0) {
                    const addSubs = (a: DeviceTypeAspectModel) => {
                        a.sub_aspects?.forEach(sub => {
                            const subn = sub as DeviceTypeAspectModelWithRootName;
                            subn.root_name = rootWithName.name;
                            tmp.push(sub);
                            addSubs(sub);
                            this.rootAspects.set(sub.id, rootWithName.id);
                        });
                    };
                    addSubs(rootWithName);
                } else {
                    tmp.push(rootWithName);
                }
            });
            this.aspects = tmp;
        })));
        obs.push(this.pipelineRegistryService.getPipelines().pipe(map(pipelines => (this.pipelines = pipelines))));
        obs.push(this.importInstancesService
            .listImportInstances('', undefined, undefined, 'name.asc')
            .pipe(map(instances => (this.importInstances = instances))));
        obs.push(this.route.url.pipe(first(), concatMap(url => {
            this.ready = false;
            this.resetForm();
            let id = this.route.snapshot.paramMap.get('id');
            if (id === null) {
                console.error('id not set!');
                return of(null);
            }
            if (url[url.length - 2]?.path === 'edit') {
                this.editMode = true;
                return this.pipelineRegistryService.getPipeline(id || '').pipe(map((pipeline: PipelineModel | null) => {
                    if (pipeline === null || pipeline.id.length === 0) {
                        // does not 404
                        this.snackBar.open('Unknown pipeline', undefined, {
                            duration: 2000,
                        });
                        return;
                    }
                    id = pipeline.flowId;
                    this.flowId = pipeline.flowId;
                    this.pipelineId = pipeline.id;
                    this.form.patchValue({
                        name: pipeline.name,
                        description: pipeline.description,
                        windowTime: pipeline.windowTime || 30,
                        enable_metrics: pipeline.metrics || true,
                        consume_all_msgs: pipeline.consumeAllMessages || false,
                        mergeStrategy: pipeline.mergeStrategy || 'inner',
                    });
                    return { pipeline, id };
                }), concatMap(res => {
                    if (res === undefined) {
                        return of(null);
                    }
                    return this.parserService.getInputs(res.id).pipe(concatMap((parseModels: ParseModel[]) => {
                        return this.deviceInstanceService
                            .getDeviceInstancesWithDeviceType({ limit: 9999, offset: 0 })
                            .pipe(concatMap(deviceTotal => {
                                this.allDevices = deviceTotal.result;
                                const observables: Observable<any>[] = [];
                                parseModels.forEach((input) => {
                                    const operator = res.pipeline.operators.find((o) => o.id === input.id);
                                    observables.push(
                                        this.addNode(input, operator?.inputSelections || [], operator?.config, operator?.inputTopics, operator?.persistData),
                                    );
                                });
                                return forkJoin(observables);
                            }));
                    }));
                }));
            } else {
                this.flowId = id || '';
                return this.parserService.getInputs(this.flowId).pipe(concatMap((resp: ParseModel[]) => {
                    return this.deviceInstanceService
                        .getDeviceInstancesWithDeviceType({ limit: 9999, offset: 0 })
                        .pipe(map(deviceTotal => {
                            this.allDevices = deviceTotal.result;
                            resp.forEach((input) => {
                                this.addNode(input, []);
                            });
                        }));
                }));
            }
        })));
        forkJoin(obs).subscribe(_ => this.ready = true);
    }

    private resetForm() {
        this.form = this.fb.group({
            name: '',
            description: '',
            nodes: this.fb.array([]),
            windowTime: 30,
            enable_metrics: [{ value: true, disabled: true }],
            consume_all_msgs: false,
            mergeStrategy: 'inner',
        });
    }

    private addNode(
        newNode: ParseModel,
        inputSelections: PipelineInputSelectionModel[],
        configs: Map<string, string> = new Map(),
        inputTopics: OperatorInputTopic[] = [],
        persistData = false,
    ): Observable<null[]> {
        const observables: Observable<null>[] = [];
        const node = this.fb.group({
            id: '',
            name: '',
            inputs: this.fb.array([]),
            deploymentType: '',
            operatorId: '',
            persistData,
            configs: this.fb.array([]),
        });
        node.patchValue(newNode);
        newNode.config?.forEach((config) => {
            const configGroup = this.fb.group({
                name: config.name,
                type: config.type,
                value: configs.get(config.name) || '',
            });
            (node.get('configs') as FormArray).push(configGroup);
        });
        newNode.inPorts?.forEach((input) => {
            const inputGroup = this.fb.group({
                aspectId: null,
                functionId: null,
                characteristics: [],
                selectableId: null,
                filter: new Map<string, { serviceId: string; path: string }>(), // deviceId to serviceId and path
                devices: [],
                deviceTypes: this.fb.array([]),
                name: input,
                pipelines: this.fb.array([]),
            });
            inputGroup.get('aspectId')?.valueChanges.subscribe((aspectId) => {
                if (aspectId === null) {
                    return;
                }
                this.loadAspectFunctions(aspectId).subscribe();
                inputGroup.patchValue({
                    functionId: null,
                });
            });
            inputGroup.get('functionId')?.valueChanges.subscribe((functionId) => {
                this.prepareSelectables(inputGroup).subscribe();
                const aspectId = inputGroup.get('aspectId')?.value;
                const func = this.aspectFunctions.get(aspectId)?.find((f) => f.id === functionId);
                if (func !== undefined) {
                    this.loadFunctionCharacteristics(func).subscribe(chars => {
                        inputGroup.patchValue({
                            characteristics: chars.map(c => c.id),
                        });
                    });
                }
               
            });
            inputGroup.get('characteristics')?.valueChanges.subscribe((_) => {
                this.prepareSelectables(inputGroup).subscribe();
                inputGroup.patchValue({
                    selectableId: null,
                });
            });
            inputGroup.get('selectableId')?.valueChanges.subscribe((selectableId) => {
                inputGroup.patchValue({
                    filter: new Map<string, { serviceId: string; path: string }>(), // deviceId to serviceId and path
                    devices: [],
                });
                (inputGroup.get('deviceTypes') as FormArray).clear();
                this.selectableSelected(inputGroup, selectableId);
            });
            inputGroup.get('devices')?.valueChanges.subscribe((_) => {
                const formArray = inputGroup.get('deviceTypes') as FormArray;
                formArray.clear();
                const deviceTypes = this.getDeviceTypes(inputGroup);
                deviceTypes.forEach((deviceType) => {
                    const deviceTypeGroup = this.fb.group({
                        id: deviceType.id,
                        name: deviceType.name,
                        selection: [],
                    });
                    formArray.push(deviceTypeGroup);
                    deviceTypeGroup
                        .get('selection')
                        ?.valueChanges.subscribe((value) => this.servicePathSelected(inputGroup, deviceTypeGroup.get('id')?.value, value));
                    const options = this.getServiceOptions(inputGroup, deviceTypeGroup.get('id')?.value);
                    if (options.length === 1) {
                        deviceTypeGroup.patchValue({ selection: options });
                        deviceTypeGroup.disable();
                    } else {
                        deviceTypeGroup.enable();
                    }
                });
            });

            // Fill previous pipeline selections
            inputTopics.forEach((inputTopic) => {
                if (inputTopic.filterType === 'OperatorId') {
                    const split = inputTopic.filterValue.split(':');
                    if (split.length !== 2) {
                        console.error('Unexpected filterValue not in format operatorId:pipelineId', inputTopic.filterValue);
                        return;
                    }
                    const pipelineId = split[1];
                    const operatorId = split[0];
                    inputTopic.mappings.forEach((mapping) => {
                        if (mapping.dest === input) {
                            this.addPipeline(inputGroup, pipelineId, operatorId, mapping.source);
                        }
                    });
                }
            });

            const inputSelection = inputSelections?.find((s) => s.inputName === input);
            if (inputSelection !== undefined) {
                observables.push(
                    new Observable<null>((obs) => {
                        this.loadAspectFunctions(inputSelection.aspectId).subscribe((functions) => {
                            const selectedFunction = functions.find((f) => f.id === inputSelection.functionId);
                            if (selectedFunction !== undefined) {
                                return this.loadFunctionCharacteristics(selectedFunction).subscribe((_) => {
                                    inputGroup.patchValue({
                                        aspectId: inputSelection.aspectId,
                                        functionId: inputSelection.functionId,
                                        characteristics: inputSelection.characteristicIds,
                                        selectableId: inputSelection.selectableId,
                                    });
                                    return this.prepareSelectables(inputGroup).subscribe((_1) => {
                                        let o: Observable<any>;
                                        if (inputSelection.selectableId?.startsWith(DeployFlowComponent.GROUP_PREFIX)) {
                                            o = this.loadDeviceGroup(inputSelection.selectableId);
                                        } else {
                                            o = of(null);
                                        }
                                        return o.subscribe((_2) => {
                                            inputGroup.patchValue({
                                                aspectId: inputSelection.aspectId,
                                                functionId: inputSelection.functionId,
                                                characteristics: inputSelection.characteristicIds,
                                                selectableId: inputSelection.selectableId,
                                            });
                                            this.getDeviceTypes(inputGroup).forEach((deviceType) => {
                                                if (!('services' in deviceType)) {
                                                    return;
                                                }
                                                const serviceIds: string[] = [];
                                                if (!Array.isArray(deviceType.services)) {
                                                    serviceIds.push(deviceType.services);
                                                } else {
                                                    serviceIds.push(...deviceType.services.map(s => s.id));
                                                }
                                                const matchingTopics = inputTopics?.filter((topic) =>
                                                    serviceIds.includes(topic.name.replace(/_/g, ':')),
                                                );
                                                matchingTopics?.forEach((matchingTopic) => {
                                                    const matchingInput = matchingTopic.mappings.find((mapping) => mapping.dest === input);
                                                    if (matchingInput !== undefined) {
                                                        const deviceTypeGroups = this.getSubElementAsGroupArray(inputGroup, 'deviceTypes');
                                                        const matchingDeviceTypeGroup = deviceTypeGroups.find(
                                                            (deviceTypeGroup) => deviceTypeGroup.get('id')?.value === deviceType.id,
                                                        );
                                                        let selections = matchingDeviceTypeGroup?.get('selection')?.value as
                                                            | { path: string; service_id: string }[]
                                                            | null;
                                                        if (selections === null) {
                                                            selections = [];
                                                        }
                                                        const serviceId = matchingTopic.name.replace(/_/g, ':');
                                                        if (
                                                            selections.findIndex(
                                                                (s) => s.path === matchingInput.source && s.service_id === serviceId,
                                                            ) === -1
                                                        ) {
                                                            selections.push({
                                                                service_id: serviceId,
                                                                path: matchingInput.source,
                                                            });
                                                            matchingDeviceTypeGroup?.patchValue({
                                                                selection: selections,
                                                            });
                                                        }
                                                    }
                                                });
                                            });
                                            obs.next(null);
                                            obs.complete();
                                        });
                                    });
                                });
                            } else {
                                obs.next(null);
                                obs.complete();
                            }
                            return;
                        });
                    }),
                );
            }
            (node.get('inputs') as FormArray).push(inputGroup);
        });

        (this.form.get('nodes') as FormArray).push(node);
        return observables.length > 0 ? forkJoin(observables) : of([null]);
    }

    getAspectFunctions(aspectId: string): DeviceTypeFunctionModel[] {
        return this.aspectFunctions.get(aspectId) || [];
    }

    loadAspectFunctions(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        if (this.aspectFunctions.has(aspectId)) {
            return of(this.aspectFunctions.get(aspectId) || []);
        }
        return this.deviceTypeService.getAspectsMeasuringFunctionsWithImports(aspectId).pipe(
            map((functions) => {
                this.aspectFunctions.set(aspectId, functions);
                return functions;
            }),
        );
    }

    private loadSelectables(aspectId: string, functionId: string): Observable<DeviceSelectablesFullModel[]> {
        if (this.selectables.has(aspectId + functionId)) {
            return of(this.selectables.get(aspectId + functionId) || []);
        }
        return this.deviceInstanceService
            .getDeviceSelectionsFull(
                [
                    {
                        function_id: functionId,
                        aspect_id: aspectId,
                    },
                ],
                true,
            )
            .pipe(
                map((selectables) => {
                    this.selectables.set(aspectId + functionId, selectables);
                    return selectables;
                }),
            );
    }

    prepareSelectables(inputGroup: FormGroup): Observable<null> {
        const aspectId = inputGroup.get('aspectId')?.value;
        const functionId = inputGroup.get('functionId')?.value;
        const characteristicIds = inputGroup.get('characteristics')?.value;
        const currentlySelected = inputGroup.get('selectableId')?.value;

        if (functionId.length === 0 || characteristicIds === null || characteristicIds === undefined) {
            inputGroup.patchValue({ selectableId: null });
            return of(null);
        }
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        if (this.selectablesCharacteristics.has(aspectId + functionId + characteristicKey)) {
            for (const selectable of this.selectablesCharacteristics.get(aspectId + functionId + characteristicKey)?.values() || []) {
                if (selectable === currentlySelected) {
                    return of(null);
                }
            }
            // previously selected, but now invalid
            inputGroup.patchValue({ selectableId: null });
            return of(null);
        }
        if (characteristicIds.length === 0) {
            this.selectablesCharacteristics.set(aspectId + functionId + characteristicKey, new Map());
            inputGroup.patchValue({ selectableId: null });
            return of(null);
        }
        // prepare serviceOptions
        const characteristicsKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        if (!this.serviceOptions.has(aspectId)) {
            this.serviceOptions.set(aspectId, new Map());
        }
        if (!this.serviceOptions.get(aspectId)?.get(functionId)) {
            this.serviceOptions.get(aspectId)?.set(functionId, new Map());
        }
        if (!this.serviceOptions.get(aspectId)?.get(functionId)?.get(characteristicsKey)) {
            this.serviceOptions.get(aspectId)?.get(functionId)?.set(characteristicsKey, new Map());
        }
        return this.loadSelectables(aspectId, functionId).pipe(
            map((selectables) => {
                const m: Map<string, CustomSelectable[]> = new Map();
                m.set(DeployFlowComponent.DEVICE_KEY, []);
                m.set(DeployFlowComponent.GROUP_KEY, []);
                m.set(DeployFlowComponent.IMPORT_KEY, []);
                selectables.forEach((selectable) => {
                    if (selectable.device !== undefined && selectable.device !== null) {
                        selectable.services?.forEach((service) => {
                            if (!this.services.has(service.id)) {
                                this.services.set(service.id, service);
                            }
                        });
                        const pathOptions = this.pathOptionsService.getPathOptionsLocal(
                            selectable.services || [],
                            false,
                            characteristicIds,
                        );
                        if (pathOptions.length > 0) {
                            m.get(DeployFlowComponent.DEVICE_KEY)?.push({
                                id: selectable.device.id,
                                name: selectable.device.display_name || selectable.device.name,
                            });
                        } else if (currentlySelected === selectable.device.id) {
                            // previously selected, but now invalid
                            inputGroup.patchValue({ selectableId: null });
                        }
                        if (
                            !this.serviceOptions
                                .get(aspectId)
                                ?.get(functionId)
                                ?.get(characteristicsKey)
                                ?.get(selectable.device?.device_type_id || '')
                        ) {
                            this.serviceOptions
                                .get(aspectId)
                                ?.get(functionId)
                                ?.get(characteristicsKey)
                                ?.set(selectable.device?.device_type_id || '', new Map());
                        }
                        pathOptions.forEach((pathOption) => {
                            const options: { path: string; service_id: string }[] = [];
                            pathOption.json_path.forEach((path) => options.push({ path, service_id: pathOption.service_id }));
                            this.serviceOptions
                                .get(aspectId)
                                ?.get(functionId)
                                ?.get(characteristicsKey)
                                ?.get(selectable.device?.device_type_id || '')
                                ?.set(pathOption.service.name, options);
                        });
                    } else if (selectable.device_group !== undefined && selectable.device_group !== null) {
                        this.loadDeviceGroup(selectable.device_group.id).subscribe((groupDevices) => {
                            const matchingDevices = groupDevices.filter((deviceId) => {
                                const device = this.allDevices.find((d) => d.id === deviceId);
                                if (device === undefined) {
                                    return false;
                                }
                                const services: DeviceTypeServiceModel[] = [];
                                device.device_type.services.forEach((service) => {
                                    if (this.services.has(service.id)) {
                                        services.push(this.services.get(service.id) || ({} as DeviceTypeServiceModel));
                                    }
                                });
                                const pathOptions = this.pathOptionsService.getPathOptionsLocal(services, false, characteristicIds);
                                return pathOptions.length > 0;
                            });

                            if (matchingDevices.length > 0) {
                                m.get(DeployFlowComponent.GROUP_KEY)?.push({
                                    id: selectable.device_group?.id || '',
                                    name: selectable.device_group?.name || '',
                                });
                            } else {
                                if (currentlySelected === selectable.device_group?.id) {
                                    // previously selected, but now invalid
                                    inputGroup.patchValue({ selectableId: null });
                                }
                            }
                        });
                    } else if (selectable.import !== undefined && selectable.import !== null && selectable.importType !== undefined) {
                        const pathOption = this.pathOptionsService.getPathOptionsLocalImport(
                            selectable.importType,
                            selectable.import,
                            characteristicIds,
                        );
                        if (pathOption.json_path.length > 0) {
                            m.get(DeployFlowComponent.IMPORT_KEY)?.push({
                                id: selectable.import.id,
                                name: selectable.import.name,
                            });
                        } else if (currentlySelected === selectable.import.id) {
                            // previously selected, but now invalid
                            inputGroup.patchValue({ selectableId: null });
                        }

                        if (
                            !this.serviceOptions
                                .get(aspectId)
                                ?.get(functionId)
                                ?.get(characteristicsKey)
                                ?.get(selectable.import.kafka_topic)
                        ) {
                            this.serviceOptions
                                .get(aspectId)
                                ?.get(functionId)
                                ?.get(characteristicsKey)
                                ?.set(selectable.import.kafka_topic, new Map());
                        }
                        const options: { path: string; service_id: string }[] = [];
                        pathOption.json_path.forEach((path) => options.push({ path, service_id: pathOption.service_id }));
                        this.serviceOptions
                            .get(aspectId)
                            ?.get(functionId)
                            ?.get(characteristicsKey)
                            ?.get(selectable.import.kafka_topic)
                            ?.set(selectable.importType.name, options);
                    }
                });
                this.selectablesCharacteristics.set(aspectId + functionId + characteristicKey, m);
                return null;
            }),
        );
    }

    getSelectables(aspectId: string, functionId: string, characteristicIds: string[]): CustomSelectable[] {
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        const values = this.selectablesCharacteristics.get(aspectId + functionId + characteristicKey);
        const res: CustomSelectable[] = [];
        values?.forEach((v, k) => {
            v.forEach(v2 => {
                v2.groupName = k;
                res.push(v2);
            });
        });
        return res;
    }

    loadDeviceGroup(id: string): Observable<string[]> {
        if (!this.deviceGroupDevices.has(id)) {
            // unknown device group
            return this.deviceGroupsService.getDeviceGroup(id).pipe(
                map((group) => {
                    if (group === null) {
                        console.error('Selected group does not exist!');
                        return [];
                    }
                    this.deviceGroupDevices.set(id, group.device_ids);
                    return group.device_ids;
                }),
            );
        } else {
            return of(this.deviceGroupDevices.get(id) || []);
        }
    }

    selectableSelected(input: FormGroup, selectableId: string | null | undefined) {
        if (selectableId === null || selectableId === undefined) {
            return;
        }
        if (selectableId.startsWith(DeployFlowComponent.GROUP_PREFIX)) {
            if (!this.deviceGroupDevices.has(selectableId)) {
                // unknown device group
                this.loadDeviceGroup(selectableId).subscribe((deviceIds) => {
                    const devices = this.getDeviceInstances(deviceIds);
                    input.patchValue({ devices });
                });
            } else {
                // known device group
                const devices = this.getDeviceInstances(this.deviceGroupDevices.get(selectableId) || []);
                input.patchValue({ devices });
            }
        } else if (selectableId.startsWith(DeployFlowComponent.IMPORT_PREFIX)) {
            input.patchValue({ devices: [] });
        } else {
            // single device
            const devices = this.getDeviceInstances([selectableId]);
            input.patchValue({ devices });
        }
    }

    private getDeviceInstances(ids: string[]): DeviceInstanceModel[] {
        return this.allDevices.filter((d) => ids.findIndex((id) => id === d.id) !== -1);
    }

    startPipeline() {
        if (this.form.valid) {
            this.ready = false;
            const pipeReq: PipelineRequestModel = {
                flowId: this.flowId,
            } as PipelineRequestModel;
            pipeReq.id = this.editMode ? this.pipelineId : null;
            pipeReq.name = this.form.get('name')?.value;
            pipeReq.description = this.form.get('description')?.value;
            pipeReq.consumeAllMessages = this.form.get('consume_all_msgs')?.value;
            pipeReq.metrics = this.form.get('enable_metrics')?.value;
            pipeReq.windowTime = JSON.parse(this.form.get('windowTime')?.value);
            pipeReq.mergeStrategy = this.form.get('mergeStrategy')?.value;
            pipeReq.nodes = [];
            this.getSubElementAsGroupArray(this.form, 'nodes').forEach((node) => {
                const nodeModel: NodeModel = {
                    inputSelections: [],
                    inputs: [],
                    config: [],
                    deploymentType: node.get('deploymentType')?.value,
                    nodeId: node.get('id')?.value,
                    persistData: node.get('persistData')?.value,
                };
                this.getSubElementAsGroupArray(node, 'configs').forEach((config) => {
                    const nodeConfig: NodeConfig = {
                        name: config.get('name')?.value,
                        value: config.get('value')?.value,
                    };
                    nodeModel.config?.push(nodeConfig);
                });
                nodeModel.inputSelections = [];
                const inputs = this.getSubElementAsGroupArray(node, 'inputs');
                const flatFilters: DeviceServicePath[] = [];
                const flatPipelineFilters: { topic: string; filters: { pipelineId: string; operatorId: string }[]; values: NodeValue[] }[] = [];
                // Create a filter for each device/topic/value
                inputs.forEach((input) => {
                    const filters = input.get('filter')?.value as Map<string, { serviceId: string; path: string }[]>;
                    filters.forEach((subfilters, deviceOrImportId) => {
                        subfilters.forEach((filter) => {
                            flatFilters.push({
                                devicesOrImports: [deviceOrImportId],
                                topic: filter.serviceId.replace(/:/g, '_'),
                                values: [
                                    {
                                        name: input.get('name')?.value,
                                        path: filter.path,
                                    },
                                ],
                            });
                        });
                    });

                    nodeModel.inputSelections?.push({
                        inputName: input.get('name')?.value,
                        aspectId: input.get('aspectId')?.value,
                        characteristicIds: input.get('characteristics')?.value,
                        functionId: input.get('functionId')?.value,
                        selectableId: input.get('selectableId')?.value,
                    });

                    this.getSubElementAsGroupArray(input, 'pipelines').forEach((pipelineGroup) => {
                        flatPipelineFilters.push({
                            topic: pipelineGroup.get('topic')?.value,
                            values: [
                                {
                                    name: input.get('name')?.value,
                                    path: pipelineGroup.get('path')?.value,
                                },
                            ],
                            filters: [
                                {
                                    pipelineId: pipelineGroup.get('pipelineId')?.value,
                                    operatorId: pipelineGroup.get('operatorId')?.value,
                                },
                            ],
                        });
                    });
                });
                // Create a filter for each pipeline input
                // Join all filters with same topic/value combination
                const joinedOperatorFilters: {
                    topic: string;
                    filters: { pipelineId: string; operatorId: string }[];
                    values: NodeValue[];
                }[] = [];
                flatPipelineFilters.forEach((filter) => {
                    const idx = joinedOperatorFilters.findIndex((joined) => {
                        if (joined.topic !== filter.topic || joined.values.length !== filter.values.length) {
                            return false;
                        }

                        let valuesEqual = true;
                        joined.values.forEach((joinedVal) => {
                            if (
                                filter.values.findIndex(
                                    (filterVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                                ) === -1
                            ) {
                                valuesEqual = false;
                            }
                        });
                        return valuesEqual;
                    });

                    if (idx === -1) {
                        joinedOperatorFilters.push(filter);
                    } else {
                        const missingFilters = filter.filters.filter(
                            (filterFilter) =>
                                joinedOperatorFilters[idx].filters.findIndex(
                                    (joinedFilter) =>
                                        filterFilter.pipelineId === joinedFilter.pipelineId &&
                                        filterFilter.operatorId === joinedFilter.operatorId,
                                ) === -1,
                        );
                        joinedOperatorFilters[idx].filters.push(...missingFilters);
                    }
                });

                // Join all filters with same topic/pipe/operator combination
                const joinedPipelineFilters: {
                    topic: string;
                    filters: { pipelineId: string; operatorId: string }[];
                    values: NodeValue[];
                }[] = [];
                joinedOperatorFilters.forEach((filter) => {
                    const idx = joinedPipelineFilters.findIndex((joined) => {
                        if (joined.topic !== filter.topic || joined.filters.length !== filter.filters.length) {
                            return false;
                        }

                        let filtersEqual = true;
                        joined.filters.forEach((joinedFilter) => {
                            if (
                                filter.filters.findIndex(
                                    (filterFilter) =>
                                        filterFilter.pipelineId === joinedFilter.pipelineId &&
                                        filterFilter.operatorId === joinedFilter.operatorId,
                                ) === -1
                            ) {
                                filtersEqual = false;
                            }
                        });
                        return filtersEqual;
                    });
                    if (idx === -1) {
                        joinedPipelineFilters.push(filter);
                    } else {
                        const missingValues = filter.values.filter(
                            (filterVal) =>
                                joinedPipelineFilters[idx].values.findIndex(
                                    (joinedVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                                ) === -1,
                        );
                        joinedPipelineFilters[idx].values.push(...missingValues);
                    }
                });

                joinedPipelineFilters.forEach((filter) =>
                    nodeModel.inputs?.push({
                        filterType: 'operatorId',
                        filterIds: filter.filters.map((f) => f.operatorId + ':' + f.pipelineId).join(','),
                        topicName: filter.topic,
                        values: filter.values,
                    }),
                );

                // Join all filters with same topic/value combination
                const joinedDeviceFilters: DeviceServicePath[] = [];
                flatFilters.forEach((filter) => {
                    const idx = joinedDeviceFilters.findIndex((joined) => {
                        if (joined.topic !== filter.topic || joined.values.length !== filter.values.length) {
                            return false;
                        }

                        let valuesEqual = true;
                        joined.values.forEach((joinedVal) => {
                            if (
                                filter.values.findIndex(
                                    (filterVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                                ) === -1
                            ) {
                                valuesEqual = false;
                            }
                        });
                        return valuesEqual;
                    });

                    if (idx === -1) {
                        joinedDeviceFilters.push(filter);
                    } else {
                        const missingDevices = filter.devicesOrImports.filter(
                            (filterDevice) =>
                                joinedDeviceFilters[idx].devicesOrImports.findIndex((joinedDevice) => filterDevice === joinedDevice) === -1,
                        );
                        joinedDeviceFilters[idx].devicesOrImports.push(...missingDevices);
                    }
                });
                // Join all filters with same topic/device combination
                const joinedValueFilters: DeviceServicePath[] = [];
                joinedDeviceFilters.forEach((filter) => {
                    const idx = joinedValueFilters.findIndex((joined) => {
                        if (joined.topic !== filter.topic || joined.devicesOrImports.length !== filter.devicesOrImports.length) {
                            return false;
                        }

                        let devicesEqual = true;
                        joined.devicesOrImports.forEach((joinedDevice) => {
                            if (filter.devicesOrImports.findIndex((filterDevice) => filterDevice === joinedDevice) === -1) {
                                devicesEqual = false;
                            }
                        });
                        return devicesEqual;
                    });
                    if (idx === -1) {
                        joinedValueFilters.push(filter);
                    } else {
                        const missingValues = filter.values.filter(
                            (filterVal) =>
                                joinedValueFilters[idx].values.findIndex(
                                    (joinedVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                                ) === -1,
                        );
                        joinedValueFilters[idx].values.push(...missingValues);
                    }
                });

                joinedValueFilters.forEach((filter) =>
                    nodeModel.inputs?.push({
                        filterType: filter.devicesOrImports[0].startsWith(DeployFlowComponent.IMPORT_PREFIX) ? 'ImportId' : 'deviceId',
                        filterIds: filter.devicesOrImports.map(value => value.split('$')[0]).join(','), // trim id modifiers and join with ','
                        topicName: filter.topic,
                        values: filter.values,
                    }),
                );

                pipeReq.nodes.push(nodeModel);
            });

            if (this.editMode) {
                this.flowEngineService.updatePipeline(pipeReq).subscribe((_) => {
                    this.route.queryParams.pipe(first()).subscribe((params) => {
                        if (params.next !== undefined && params.next.length > 0) {
                            const next = (params.next as string).split(',');
                            let url = '/data/pipelines/edit/' + next[0];
                            if (next.length > 1) {
                                url += '?next=' + next.splice(1).join(',');
                            }
                            this.router.navigateByUrl(url);
                            this.snackBar.open('Pipeline updated, preparing next update...', undefined, {
                                duration: 2000,
                            });
                        } else {
                            this.router.navigate(['/data/pipelines']);
                            this.snackBar.open('Pipeline updated', undefined, {
                                duration: 2000,
                            });
                        }
                    });
                });
            } else {
                this.flowEngineService.startPipeline(pipeReq).subscribe((_) => {
                    this.router.navigate(['/data/pipelines']);
                    this.snackBar.open('Pipeline started', undefined, {
                        duration: 2000,
                    });
                });
            }
        }
        this.form.markAllAsTouched();
    }

    switchToClassic() {
        this.router.navigateByUrl('data/flow-repo/deploy-classic/' + this.flowId);
    }

    getServiceOptions(input: FormGroup, id: string): {group?: string; path: string; service_id: string }[] {
        const functionId = input.get('functionId')?.value;
        const aspectId = input.get('aspectId')?.value;
        const characteristicsKey = DeployFlowComponent.stringArrayKey(input.get('characteristics')?.value);
        let key = id;
        if (key.startsWith(DeployFlowComponent.IMPORT_PREFIX)) {
            key = this.importInstances.find((i) => i.id === id)?.kafka_topic || '';
        }
        const preparedOptions = this.serviceOptions.get(aspectId)?.get(functionId)?.get(characteristicsKey)?.get(key);
        const result: {group?: string; path: string; service_id: string }[] = [];;
        preparedOptions?.forEach((v, k) => {
            v.forEach(e => {
                (e as {group?: string; path: string; service_id: string }).group = k;
                result.push(e);
            });
        });
        return result;
    }

    getDeviceTypes(input: AbstractControl): (DeviceTypeModel | ImportInstancesModel)[] {
        const anyTypes = input.get('devices')?.value?.map((x: DeviceInstanceWithDeviceTypeModel) => x.device_type);
        if (anyTypes === undefined) {
            return [];
        }
        const types = anyTypes as (DeviceTypeModel | ImportInstancesModel)[];
        const selectableId = input.get('selectableId')?.value;
        if (selectableId !== undefined && selectableId !== null && (selectableId as string).startsWith(DeployFlowComponent.IMPORT_PREFIX)) {
            const instance = this.importInstances.find((i) => i.id === selectableId);
            if (instance !== undefined) {
                types.push(instance);
            }
        }
        return types.filter((t, index) => types.findIndex((t2) => t2.id === t.id) === index); // unique
    }

    getSubElementAsGroupArray(element: AbstractControl, subElementPath: string): FormGroup[] {
        return ((element.get(subElementPath) as FormArray)?.controls as FormGroup[]) || [];
    }

    servicePathSelected(input: FormGroup, deviceTypeOrImportInstanceId: string, selection: { service_id: string; path: string }[] | null) {
        if (selection === null) {
            return;
        }
        let devices = input.get('devices')?.value as DeviceInstanceModel[];
        devices = devices.filter((d) => d.device_type_id === deviceTypeOrImportInstanceId);
        const filter = input.get('filter')?.value as Map<string, { serviceId: string; path: string }[]>;
        const convertedSelection = selection.map((x) => ({ serviceId: x.service_id, path: x.path }));
        devices.forEach((d) => filter.set(d.id, convertedSelection));
        if (deviceTypeOrImportInstanceId.startsWith(DeployFlowComponent.IMPORT_PREFIX)) {
            filter.set(deviceTypeOrImportInstanceId, convertedSelection);
        }
        input.patchValue({ filter });
    }

    getServiceTriggerValue(selection: MatOption | MatOption[] | undefined): string {
        if (!Array.isArray(selection) || selection === undefined) {
            return ''; // multiple should always be set here
        }
        let r = '';
        selection.forEach((s) => {
            if (r.length > 0) {
                r += ', ';
            }
            r += s.group.label + ': ' + s.value.path;
        });
        return r;
    }

    loadFunctionCharacteristics(func: DeviceTypeFunctionModel): Observable<DeviceTypeCharacteristicsModel[]> {
        if (this.functionCharacteristics.has(func.id)) {
            return of(this.functionCharacteristics.get(func.id) || []);
        }
        return this.conceptsService.getConceptWithCharacteristics(func.concept_id).pipe(
            map((concept) => {
                this.functionCharacteristics.set(func.id, concept?.characteristics || []);
                return concept?.characteristics || [];
            }),
        );
    }

    getFunctionCharacteristics(functionId: string): DeviceTypeCharacteristicsModel[] {
        return this.functionCharacteristics.get(functionId) || [];
    }

    comparePathOptions(a: any, b: any) {
        return a && b && a.path && b.path && a.path === b.path && a.service_id && b.service_id && a.service_id === b.service_id;
    }

    getServiceOptionDisabledFunction(deviceType: FormGroup): (option: { path: string; service_id: string }) => boolean {
        return (option: { path: string; service_id: string }) => {
            const selection = deviceType.get('selection')?.value as { path: string; service_id: string }[] | null;
            if (selection === null) {
                return false;
            }
            return selection.findIndex((s) => s.service_id === option.service_id && s.path !== option.path) !== -1;
        };
    }

    addPipeline(input: FormGroup, pipelineId: string = '', operatorId: string = '', path: string = '') {
        const pipelineOperator = this.getPipelineById(pipelineId)?.operators.find((o) => o.id === operatorId);
        const pipelineGroup = this.fb.group({
            pipelineId: '',
            operatorId: '',
            topic: pipelineOperator !== undefined ? 'analytics-' + pipelineOperator.name : '',
            path: '',
        });
        pipelineGroup.get('pipelineId')?.valueChanges.subscribe((newPipelineId) => {
            const pipeline = this.getPipelineById(newPipelineId);
            if (pipeline !== undefined && pipeline.operators.length === 1) {
                pipelineGroup.patchValue({
                    operatorId: pipeline.operators[0].id,
                    topic: 'analytics-' + pipeline.operators[0].name,
                });
            } else {
                pipelineGroup.patchValue({ operatorId: '', topic: '' });
            }
        });
        pipelineGroup.get('operatorId')?.valueChanges.subscribe((newOperatorId) => {
            const newPipelineId = pipelineGroup.get('pipelineId')?.value;
            if (newPipelineId !== undefined && newPipelineId !== '' && newOperatorId !== '') {
                const newPipelineOperator = this.getPipelineById(newPipelineId)?.operators.find((o) => o.id === newOperatorId);
                if (newPipelineOperator !== undefined) {
                    this.loadOperator(newPipelineOperator.operatorId).subscribe();
                    pipelineGroup.patchValue({ topic: 'analytics-' + newPipelineOperator.name });
                }
            }
            pipelineGroup.patchValue({ path: '' });
        });
        pipelineGroup.patchValue({
            pipelineId,
            operatorId,
            topic: pipelineOperator !== undefined ? 'analytics-' + pipelineOperator.name : '',
            path,
        });
        this.getSubElementAsGroupArray(input, 'pipelines').push(pipelineGroup);
    }

    loadOperator(operatorId: string): Observable<OperatorModel | null> {
        const operator = this.operators.get(operatorId);
        if (operator !== undefined) {
            return of(operator);
        }
        return this.operatorRepoService.getOperator(operatorId).pipe(
            map((resp) => {
                if (resp !== null) {
                    this.operators.set(operatorId, resp);
                }
                return resp;
            }),
        );
    }

    getPipelineById(id: string | undefined | null): PipelineModel | undefined {
        if (id === null || id === undefined) {
            return undefined;
        }
        return this.pipelines.find((p) => p.id === id);
    }

    getImage(pipelineGroup: FormGroup): SafeHtml | undefined {
        const pipeline = this.getPipelineById(pipelineGroup.get('pipelineId')?.value);
        if (pipeline === undefined) {
            return undefined;
        }
        if (typeof pipeline.image !== 'string') {
            return undefined;
        }
        const parser = new DOMParser();
        const svg = parser.parseFromString(pipeline.image, 'image/svg+xml').getElementsByTagName('svg')[0];
        const viewbox = svg.getAttribute('viewbox')!.split(' ');
        svg.setAttribute('height', viewbox[3]);
        const elements = svg.getElementsByClassName('joint-cell') as any;
        for (const element of elements) {
            if (element.attributes['model-id'].value === pipelineGroup.get('operatorId')?.value) {
                for (const node of element.childNodes) {
                    if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                        node.attributes['stroke'].value = 'red';
                    }
                }
            }
        }
        return this.sanitizer.bypassSecurityTrustHtml(new XMLSerializer().serializeToString(svg));
    }

    getOperatorPaths(pipelineId: string, operatorId: string): string[] {
        const pipelineOperator = this.getPipelineById(pipelineId)?.operators.find((o) => o.id === operatorId);
        if (pipelineOperator === undefined) {
            return [];
        }
        return this.operators.get(pipelineOperator.operatorId)?.outputs?.map((x) => x.name) || [];
    }

    getPipelineOperator(pipelineId: string, operatorId: string): PipelineOperatorModel | undefined {
        return this.getPipelineById(pipelineId)?.operators.find((o) => o.id === operatorId);
    }

    removePipeline(inputGroup: FormGroup, index: number) {
        const pipelines = this.getSubElementAsGroupArray(inputGroup, 'pipelines');
        pipelines.splice(index, 1);
        inputGroup.patchValue({ pipelines });
    }

    selectOperator($event: MouseEvent, pipeline: FormGroup) {
        for (const operatorNode of ($event.target as any)?.nearestViewportElement?.childNodes[0]?.childNodes[1]?.childNodes || []) {
            if (
                operatorNode.attributes['data-type'] !== undefined &&
                operatorNode.attributes['data-type'].value === 'senergy.NodeElement'
            ) {
                const rect: DOMRect = operatorNode.getBoundingClientRect();
                if ($event.x < rect.right && $event.x > rect.left && $event.y > rect.top && $event.y < rect.bottom) {
                    pipeline.patchValue({ operatorId: operatorNode.attributes['model-id'].value });
                    return;
                }
            }
        }
    }

    getRootAspect(): GroupValueFn {
        const that = this;
        return (_, children): any => {
            children = children as DeviceTypeAspectModel[];
            const id = that.rootAspects.get(children[0].id);
            if (id !== undefined) {
                return { id };
            }
            return null;
        };
    }
}
