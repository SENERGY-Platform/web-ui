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
import {Navigation, Router} from '@angular/router';
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


@Component({
    selector: 'senergy-process-deployments-config',
    templateUrl: './deployments-config.component.html',
    styleUrls: ['./deployments-config.component.css']
})

export class ProcessDeploymentsConfigComponent implements OnInit {

    @ViewChild('autosize', {static: false}) autosize!: CdkTextareaAutosize;

    processId = '';
    deploymentId = '';
    deployment: V2DeploymentsPreparedModel | null = null;
    deploymentFormGroup!: FormGroup;
    flowList: FlowModel[] = [];
    ready = false;
    optionGroups: Map<number, Map<string, V2DeploymentsPreparedSelectionOptionModel[]>> = new Map();

    constructor(private _formBuilder: FormBuilder,
                private processRepoService: ProcessRepoService,
                private utilService: UtilService,
                private deploymentsService: DeploymentsService,
                private snackBar: MatSnackBar,
                private router: Router,
                private deploymentsConfigInitializerService: DeploymentsConfigInitializerService,
                private flowRepoService: FlowRepoService) {
        this.getRouterParams();
        this.getFlows();
    }

    ngOnInit() {
        if (this.processId !== '') {
            this.deploymentsService.getPreparedDeployments(this.processId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                this.initOptionGroups(deployment);
                this.initFormGroup(deployment);
            });
        } else {
            if (this.deploymentId !== '') {
                this.deploymentsService.v2getDeployments(this.deploymentId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                    if (deployment) {
                        deployment.id = '';
                        this.initOptionGroups(deployment);
                        this.initFormGroup(deployment);
                    } else {
                        this.snackBar.open('Error while copying the deployment! Probably old version', undefined, {duration: 2000});
                    }
                });
            }
        }
    }

    initFormGroup(deployment: V2DeploymentsPreparedModel | null): void {
        if (deployment !== null) {
            this.deployment = deployment;
            this.deploymentFormGroup = this.deploymentsConfigInitializerService.initFormGroup(this.deployment);
            this.selectedServiceIdchangeListener();
            this.ready = true;
        }
    }

    trackByFn(index: any) {
        return index;
    }

    save(): void {
        this.deploymentsService.v2postDeployments(this.deploymentFormGroup.getRawValue()).subscribe((resp: { status: number }) => {
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

        const setOption = function(elementIndex: number) {
            const selectedDeviceGroupId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_group_id');
            const selectedDeviceId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_id');
            if (option && option.device_group) {
                if (selectedDeviceGroupId) {
                    selectedDeviceGroupId.patchValue(option.device_group.id);
                }
                if (selectedDeviceId) {
                    selectedDeviceId.patchValue(null);
                }
            }
            if (option && option.device) {
                if (selectedDeviceGroupId) {
                    selectedDeviceGroupId.patchValue(null);
                }
                if (selectedDeviceId) {
                    selectedDeviceId.patchValue(option.device.id);
                }
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
            return element.message_event?.selection.selection_options.findIndex(o =>
                (o.device && o.device.id === option.device?.id)
                || o.device_group && (o.device_group.id === option.device_group?.id));
        };
    }

    getViewValue(option: any): string {
        return (option.device && option.device.name) || (option.device_group && option.device_group.name);
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const params = navigation.extras.state as { processId: string, deploymentId: string };
                this.processId = params.processId;
                this.deploymentId = params.deploymentId;
            }
        }
    }

    private getOption(element: V2DeploymentsPreparedElementModel, selectionOptionIndex: number): V2DeploymentsPreparedSelectionOptionModel | null {
        if ( element.task && element.task.selection.selection_options ) {
            return element.task.selection.selection_options[selectionOptionIndex];
        }
        if ( element.message_event && element.message_event.selection.selection_options ) {
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


    displayParameter(value: string): boolean {
        const matches = value.match(/^\${.*}$/);
        return !(matches && matches.length);
    }

    private getOptionGroups(selection_options: V2DeploymentsPreparedSelectionOptionModel[]): Map<string, V2DeploymentsPreparedSelectionOptionModel[]> {
        const devices: V2DeploymentsPreparedSelectionOptionModel[] = [];
        const deviceGroups: V2DeploymentsPreparedSelectionOptionModel[] = [];
        for (const option of selection_options ) {
            if (option.device) {
                devices.push(option);
            }
            if (option.device_group) {
                deviceGroups.push(option);
            }
        }
        const result = new Map<string, V2DeploymentsPreparedSelectionOptionModel[]>();
        result.set('Devices', devices);
        result.set('Device-Groups', deviceGroups);
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
}
