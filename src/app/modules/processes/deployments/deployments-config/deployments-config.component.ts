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
                this.initFormGroup(deployment);
            });
        } else {
            if (this.deploymentId !== '') {
                this.deploymentsService.v2getDeployments(this.deploymentId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                    if (deployment) {
                        deployment.id = '';
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

        this.setSelectedServiceId(selectedElementIndex, selectionOptionIndex, 'task');

        const elementClicked = this.getElement(selectedElementIndex);
        if (elementClicked.group) {
            this.elements.forEach((element: V2DeploymentsPreparedElementModel, elementIndex: number) => {
                if (element.task !== null && elementClicked.bpmn_id !== element.bpmn_id) {
                    if (elementClicked.group === (this.getElement(elementIndex).group)) {
                        const selectedDeviceId = this.elementsFormArray.at(elementIndex).get('task.selection.selected_device_id');
                        if (selectedDeviceId) {
                            if (elementClicked.task) {
                                selectedDeviceId.patchValue(elementClicked.task.selection.selected_device_id);
                                this.setSelectedServiceId(elementIndex, this.getSelectionOptionIndex(selectedElementIndex, elementClicked.task.selection.selected_device_id), 'task');
                            }
                        }
                    }
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
        if (services.value.length <= 1) {
            selection.patchValue({'selected_service_id': services.value[0].id});
            selection.patchValue({'show': false});
        } else {
            selection.patchValue({'selected_service_id': ''});
            selection.patchValue({'show': true});
        }
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

    private getSelectionOptionIndex(elementIndex: number, selectedDeviceId: string): number {
        const selectionOptions: V2DeploymentsPreparedSelectionOptionModel[] = (<FormArray>this.deploymentFormGroup.get(['elements', elementIndex, 'task', 'selection', 'selection_options'])).value;
        let index = -1;
        selectionOptions.forEach((selectionOption: V2DeploymentsPreparedSelectionOptionModel, selectionOptionIndex: number) => {
            if (selectionOption.device.id === selectedDeviceId) {
                index = selectionOptionIndex;
            }
        });
        return index;
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


}
