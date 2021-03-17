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

import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ProcessRepoService} from '../../process-repo/shared/process-repo.service';
import {DeploymentsService} from '../shared/deployments.service';
import {UtilService} from '../../../../core/services/util.service';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {CdkTextareaAutosize} from '@angular/cdk/text-field';
import {DeploymentsConfigInitializerService} from './shared/deployments-config-initializer.service';
import {
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedElementModel,
    V2DeploymentsPreparedFilterCriteriaModel,
    V2DeploymentsPreparedModel,
    V2DeploymentsPreparedSelectionOptionModel
} from '../shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../data/flow-repo/shared/flow.model';
import {FunctionsPermSearchModel} from '../../../metadata/functions/shared/functions-perm-search.model';
import {FunctionsService} from '../../../metadata/functions/shared/functions.service';
import {forkJoin, Observable} from 'rxjs';
import {ConceptsService} from '../../../metadata/concepts/shared/concepts.service';
import {
    DeviceTypeCharacteristicsModel,
    DeviceTypeContentVariableModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {map} from 'rxjs/internal/operators';
import {ImportTypeContentVariableModel, ImportTypeModel} from '../../../imports/import-types/shared/import-types.model';
import {ImportTypesService} from '../../../imports/import-types/shared/import-types.service';


@Component({
    selector: 'senergy-process-deployments-config',
    templateUrl: './deployments-config.component.html',
    styleUrls: ['./deployments-config.component.css']
})

export class ProcessDeploymentsConfigComponent implements OnInit {

    @ViewChild('autosize', {static: false}) autosize!: CdkTextareaAutosize;

    processId: string| undefined;
    deploymentId: string| undefined;
    deployment: V2DeploymentsPreparedModel | null = null;
    deploymentFormGroup!: FormGroup;
    flowList: FlowModel[] = [];
    ready = false;
    optionGroups: Map<number, Map<string, V2DeploymentsPreparedSelectionOptionModel[]>> = new Map();
    functions: FunctionsPermSearchModel[] = [];
    functionCharacteristics: Map<string, DeviceTypeCharacteristicsModel[]> = new Map();
    importTypes: Map<string, ImportTypeModel> = new Map();
    functionImportTypePathOptions: Map<string, { path: string, characteristicId: string }[]> = new Map();

    constructor(private _formBuilder: FormBuilder,
                private processRepoService: ProcessRepoService,
                private utilService: UtilService,
                private deploymentsService: DeploymentsService,
                private snackBar: MatSnackBar,
                private router: Router,
                private route: ActivatedRoute,
                private deploymentsConfigInitializerService: DeploymentsConfigInitializerService,
                private flowRepoService: FlowRepoService,
                private conceptsService: ConceptsService,
                private functionsService: FunctionsService,
                private importTypesService: ImportTypesService,
    ) {
        this.getRouterParams();
        this.getFlows();
    }

    ngOnInit() {
        if (this.processId !== undefined) {
            const s1 = this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').pipe(map(f => this.functions = f));
            const s2 = this.deploymentsService.getPreparedDeployments(this.processId)
                .pipe(map((deployment: V2DeploymentsPreparedModel | null) => {
                    this.deployment = deployment;
                    this.initOptionGroups(deployment);
                    this.initFormGroup(deployment);
                }));
            forkJoin([s1, s2]).subscribe(() => {
                const subs: Observable<any>[] = [];
                this.deployment?.elements.forEach(element => {
                    if (element.message_event?.selection.filter_criteria.function_id !== undefined
                        && element.message_event.selection.filter_criteria.function_id !== null
                        && !this.functionCharacteristics.has(element.message_event.selection.filter_criteria.function_id)) {
                        const functionId = element.message_event?.selection.filter_criteria.function_id;
                        this.functionCharacteristics.set(functionId, []);
                        const conceptId = this.functions.find(fu => fu.id === functionId)?.concept_id;
                        if (conceptId !== undefined) {
                            subs.push(this.conceptsService.getConceptWithCharacteristics(conceptId)
                                .pipe(map(concept => this.functionCharacteristics.set(functionId, concept?.characteristics || []))));
                        }
                    }
                    element.message_event?.selection.selection_options?.forEach(o => {
                        if (o.import !== null && !this.importTypes.has(o.import.import_type_id)) {
                            const importTypeId = o.import.import_type_id;
                            this.importTypes.set(importTypeId, {} as ImportTypeModel);
                            subs.push(this.importTypesService.getImportType(importTypeId).pipe(map(it => {
                                this.importTypes.set(importTypeId, it);
                            })));
                        }
                    });
                });
                forkJoin(subs).subscribe(() => {
                    this.functionCharacteristics.forEach((characteristics, functionId) => {
                        this.importTypes.forEach((importType, importTypeId) => {
                            const key = functionId + importTypeId;
                            if (!this.functionImportTypePathOptions.has(key)) {
                                this.functionImportTypePathOptions.set(key,
                                    this.getPathOptionsLocalImport(importType, characteristics.map(c => c.id || '')));
                            }
                        });
                    });
                });
                this.ready = true;
            });
        } else if (this.deploymentId !== undefined) {
            this.deploymentsService.v2getDeployments(this.deploymentId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                if (deployment) {
                    deployment.id = '';
                    this.initOptionGroups(deployment);
                    this.initFormGroup(deployment);
                    this.deployment = deployment;
                    this.ready = true;
                } else {
                    this.snackBar.open('Error while copying the deployment! Probably old version', undefined, {duration: 2000});
                }
            });
        } else {
            this.router.navigateByUrl('processes/repository');
        }
    }

    initFormGroup(deployment: V2DeploymentsPreparedModel | null): void {
        if (deployment !== null) {
            this.deployment = deployment;
            this.deploymentFormGroup = this.deploymentsConfigInitializerService.initFormGroup(this.deployment);
            this.selectedServiceIdchangeListener();
        }
    }

    trackByFn(index: any) {
        return index;
    }

    save(): void {
        const raw: V2DeploymentsPreparedModel = this.deploymentFormGroup.getRawValue();
        raw?.elements?.forEach((element: V2DeploymentsPreparedElementModel) => {
            if (element.message_event?.selection?.selection_options !== undefined) {
                element.message_event.selection.selection_options = [];
            }
            if (element.task?.selection?.selection_options !== undefined) {
                element.task.selection.selection_options = [];
            }
            delete (element.task?.selection as any).selected_path_option;
        });
        this.deploymentsService.v2postDeployments(raw).subscribe((resp: { status: number }) => {
            if (resp.status === 200) {
                this.snackBar.open('Deployment stored successfully.', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Error while storing the deployment!', undefined, {duration: 2000});
            }
        });
    }

    selectedServiceIdchangeListener(): void {
        this.elementsFormArray.controls.forEach((element: AbstractControl) => {

            const filterCriteriaFormControl = <FormGroup>element.get(['task', 'selection', 'filter_criteria']);
            if (filterCriteriaFormControl) {
                const filterCriteria = <V2DeploymentsPreparedFilterCriteriaModel>filterCriteriaFormControl.value;
                if (filterCriteria.characteristic_id !== null && filterCriteria.characteristic_id !== '') {
                    if (filterCriteria.function_id !== null) {
                        if (filterCriteria.function_id.startsWith('urn:infai:ses:controlling-function:')) {
                            const selectedServiceFormControl = <FormControl>element.get(['task', 'selection', 'selected_service_id']);
                            selectedServiceFormControl.valueChanges.subscribe((selectedServiceId: string) => {
                                this.deploymentsService.getConfigurables(<string>filterCriteria.characteristic_id, selectedServiceId).subscribe(
                                    (configurables: (V2DeploymentsPreparedConfigurableModel[] | null)) => {
                                        const taskFormGroup = <FormGroup>element.get(['task']);
                                        const configurablesFormArray = this.deploymentsConfigInitializerService.initConfigurablesArray(configurables);
                                        taskFormGroup.setControl('configurables', configurablesFormArray);
                                    });
                            });
                        }
                    }
                }
            }
        });
    }

    changeTaskSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'task');
    }

    changeEventSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'message_event');
    }


    changeElementSelectionOption(selectedElementIndex: number, selectionOptionIndex: number, elementType: string): void {
        const elementClicked = this.getElement(selectedElementIndex);
        const option = this.getOption(elementClicked, selectionOptionIndex);

        const that = this;

        const setOption = function (elementIndex: number) {
            const selectedDeviceGroupId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_group_id');
            const selectedDeviceId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_id');
            const selectedImportId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_import_id');
            if (option && option.device_group) {
                selectedDeviceGroupId?.patchValue(option.device_group.id);
                selectedDeviceId?.patchValue(null);
                selectedImportId?.patchValue(null);
            }
            if (option && option.device) {
                selectedDeviceGroupId?.patchValue(null);
                selectedDeviceId?.patchValue(option.device.id);
                selectedImportId?.patchValue(null);
            }
            if (option && option.import) {
                selectedDeviceGroupId?.patchValue(null);
                selectedDeviceId?.patchValue(null);
                selectedImportId?.patchValue(option.import.id);
            }
            that.setSelectedServiceId(elementIndex, selectionOptionIndex, elementType);
        };

        // set option for this element
        setOption(selectedElementIndex);

        // set options for tasks of the same group
        if (elementClicked.group && elementType === 'task') {
            this.elements.forEach((element: V2DeploymentsPreparedElementModel, elementIndex: number) => {
                if (element.task !== null && elementClicked.bpmn_id !== element.bpmn_id && elementClicked.group === element.group) {
                    setOption(elementIndex);
                }
            });
        }
    }

    getElement(elementIndex: number): V2DeploymentsPreparedElementModel {
        return this.elements[elementIndex];
    }

    elementsTimeEvent(elementIndex: number): FormGroup {
        return this.deploymentFormGroup.get(['elements', elementIndex, 'time_event']) as FormGroup;
    }

    setSelectedServiceId(elementIndex: number, selectionOptionIndex: number, elementType: string): void {
        const selection = <FormGroup>this.deploymentFormGroup.get(['elements', elementIndex, elementType, 'selection']);
        const services = <FormArray>this.deploymentFormGroup.get(['elements', elementIndex, elementType, 'selection', 'selection_options', selectionOptionIndex, 'services']);
        selection.patchValue({'selection_options_index': selectionOptionIndex});
        switch (services.value.length) {
            case 0:
                selection.patchValue({'selected_service_id': null});
                selection.patchValue({'show': false});
                break;
            case 1:
                selection.patchValue({'selected_service_id': services.value[0].id});
                selection.patchValue({'show': false});
                break;
            default:
                selection.patchValue({'selected_service_id': null});
                selection.patchValue({'show': true});
        }
    }

    getTaskIndex(element: V2DeploymentsPreparedElementModel): (option: V2DeploymentsPreparedSelectionOptionModel) => number {
        return option => {
            if (element.task?.selection.selection_options === undefined) {
                return -1;
            }
            return element.task?.selection.selection_options.findIndex(o =>
                (o.device && o.device.id === option.device?.id)
                || o.device_group && (o.device_group.id === option.device_group?.id));
        };
    }

    getMsgEventIndex(element: V2DeploymentsPreparedElementModel): (option: V2DeploymentsPreparedSelectionOptionModel) => number {
        return option => {
            if (element.message_event?.selection.selection_options === undefined) {
                return -1;
            }
            const idx = element.message_event?.selection.selection_options.findIndex(o =>
                (o.device && o.device.id === option.device?.id)
                || (o.device_group && (o.device_group.id === option.device_group?.id))
                || (o.import && (o.import.id === option.import?.id)));
            return idx;
        };
    }

    getViewValue(option: any): string {
        if (option.device) {
            return option.device.name;
        }
        if (option.device_group) {
            return option.device_group.name;
        }
        if (option.import) {
            return option.import.name;
        }
        return '';
    }

    private getRouterParams(): void {
        this.processId = this.route.snapshot.queryParams.processId;
        this.deploymentId = this.route.snapshot.queryParams.deploymentId;
    }

    private getOption(element: V2DeploymentsPreparedElementModel, selectionOptionIndex: number): V2DeploymentsPreparedSelectionOptionModel | null {
        if (element.task && element.task.selection.selection_options) {
            return element.task.selection.selection_options[selectionOptionIndex];
        }
        if (element.message_event && element.message_event.selection.selection_options) {
            return element.message_event.selection.selection_options[selectionOptionIndex];
        }
        return null;
    }

    private getFlows(): void {
        this.flowRepoService.getFlows('', 9999, 0, 'name', 'asc').subscribe((resp: { flows: FlowModel[] }) => {
            this.flowList = resp.flows;
        });
    }

    get elements(): V2DeploymentsPreparedElementModel[] {
        const elements = this.deploymentFormGroup.get(['elements']) as FormArray;
        return elements.value;
    }

    get elementsFormArray(): FormArray {
        return this.deploymentFormGroup.get(['elements']) as FormArray;
    }


    displayParameter(value: unknown): boolean {
        const s = value as string;
        const matches = s.match(/^\${.*}$/);
        return !(matches && matches.length);
    }

    private getOptionGroups(selection_options: V2DeploymentsPreparedSelectionOptionModel[]): Map<string, V2DeploymentsPreparedSelectionOptionModel[]> {
        const devices: V2DeploymentsPreparedSelectionOptionModel[] = [];
        const deviceGroups: V2DeploymentsPreparedSelectionOptionModel[] = [];
        const imports: V2DeploymentsPreparedSelectionOptionModel[] = [];
        for (const option of selection_options) {
            if (option.device) {
                devices.push(option);
            }
            if (option.device_group) {
                deviceGroups.push(option);
            }
            if (option.import) {
                imports.push(option);
            }
        }
        const result = new Map<string, V2DeploymentsPreparedSelectionOptionModel[]>();
        result.set('Devices', devices);
        result.set('Device-Groups', deviceGroups);
        result.set('Imports', imports);
        return result;
    }

    private initOptionGroups(deployment: V2DeploymentsPreparedModel | null) {
        if (deployment) {
            deployment.elements.forEach((element, index) => {
                if (element.task) {
                    this.optionGroups.set(index, this.getOptionGroups(element.task.selection.selection_options));
                }
                if (element.message_event) {
                    this.optionGroups.set(index, this.getOptionGroups(element.message_event.selection.selection_options));
                }
            });
        }
    }

    private getPathOptionsLocalImport(type: ImportTypeModel,
                                      characteristic_id_filter: string[] = []): { path: string, characteristicId: string }[] {
        const paths: { path: string, characteristicId: string }[] = [];
        type.output.sub_content_variables?.forEach(sub => {
            this.getPathOptionsRecursive('', paths,
                sub, characteristic_id_filter);
        });
        return paths;
    }

    private getPathOptionsRecursive(parentPath: string, pathArray: { path: string, characteristicId: string }[],
                                    contentVariable: DeviceTypeContentVariableModel | ImportTypeContentVariableModel,
                                    characteristic_id_filter: string[]) {
        const path = (parentPath.length > 0 ? parentPath + '.' : '') + contentVariable.name;
        if (contentVariable.characteristic_id !== undefined
            && characteristic_id_filter.findIndex(c => c === contentVariable.characteristic_id) !== -1) {
            pathArray.push({path, characteristicId: contentVariable.characteristic_id});
        }
        contentVariable.sub_content_variables?.forEach((sub: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) =>
            this.getPathOptionsRecursive(path, pathArray, sub, characteristic_id_filter));
    }

    getPathOptions(elementIndex: number): { path: string, characteristicId: string }[] {
        const element = (this.deploymentFormGroup.get('elements') as FormArray).at(elementIndex);
        if (element.get('message_event.selection.selected_import_id')?.value !== null
            && element.get('message_event.selection.selected_import_id')?.value !== undefined) {
            const idx = element.get('message_event.selection.selection_options_index')?.value;
            if (idx === undefined) {
                return [];
            }
            const key = '' + element.get('message_event.selection.filter_criteria')?.value.function_id
                + element.get('message_event.selection.selection_options')?.value[idx]?.import.import_type_id;
            return this.functionImportTypePathOptions.get(key) || [];
        } else {
            return [];
        }
    }
}
