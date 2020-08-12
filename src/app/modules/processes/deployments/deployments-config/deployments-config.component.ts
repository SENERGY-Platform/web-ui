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
import {ActivatedRoute, Navigation, Router} from '@angular/router';
import {
    DeploymentsPreparedElementModel,
    DeploymentsPreparedModel,
} from '../shared/deployments-prepared.model';
import {ProcessRepoService} from '../../process-repo/shared/process-repo.service';
import {DeploymentsService} from '../shared/deployments.service';
import {UtilService} from '../../../../core/services/util.service';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceTypeServiceModel} from '../../../devices/device-types-overview/shared/device-type.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {CdkTextareaAutosize} from '@angular/cdk/text-field';
import {DeploymentsConfigInitializerService} from './shared/deployments-config-initializer.service';
import {V2DeploymentsPreparedModel} from '../shared/deployments-prepared-v2.model';


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
    ready = false;

    constructor(private _formBuilder: FormBuilder,
                private route: ActivatedRoute,
                private processRepoService: ProcessRepoService,
                private utilService: UtilService,
                private deploymentsService: DeploymentsService,
                private snackBar: MatSnackBar,
                private router: Router,
                private deploymentsConfigInitializerService: DeploymentsConfigInitializerService) {
        this.getRouterParams();
    }

    ngOnInit() {
        if (this.processId !== '') {
            this.deploymentsService.getPreparedDeployments(this.processId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                this.initFormGroup(deployment);
            });
        } else {
            if (this.deploymentId !== '') {
                // todo copy or edit function
                // this.deploymentsService.getDeployments(this.deploymentId).subscribe((deployment: DeploymentsPreparedModel | null) => {
                //     if (deployment) {
                //         deployment.id = '';
                //     }
                //     this.initFormGroup(deployment);
                // });
            }
        }
    }

    initFormGroup(deployment: V2DeploymentsPreparedModel | null): void {
        if (deployment !== null) {
            this.deployment = deployment;
            this.deploymentFormGroup = this.deploymentsConfigInitializerService.initFormGroup(this.deployment);
            this.ready = true;
        }
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    trackByFn(index: any) {
        return index;
    }

    save(): void {
        this.deploymentsService.postDeployments(this.deploymentFormGroup.value).subscribe((resp: { status: number }) => {
            if (resp.status === 200) {
                this.snackBar.open('Deployment stored successfully.', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Error while storing the deployment!', undefined, {duration: 2000});
            }
        });
    }

    changeTaskSelectables(elementIndex: number, selectableIndex: number): void {
        const task = <FormGroup>this.deploymentFormGroup.get(['elements', elementIndex, 'task']);
        const selection = <FormGroup>this.deploymentFormGroup.get(['elements', elementIndex, 'task', 'selection']);
        const services = <FormArray>this.deploymentFormGroup.get(['elements', elementIndex, 'task', 'selectables', selectableIndex, 'services']);
        task.patchValue({'selectableIndex': selectableIndex});
        if (services.value.length <= 1) {
            selection.patchValue({'service': services.value[0]});
            selection.patchValue({'show': false});
        } else {
            selection.patchValue({'service': []});
            selection.patchValue({'show': true});
        }
    }

    changeLaneSelectables(lanesIndex: number, selectableIndex: number): void {
        const selectables = <FormGroup>this.deploymentFormGroup.get(['lanes', lanesIndex, 'lane', 'selectables', selectableIndex]);
        const selectableServices = <FormArray>this.deploymentFormGroup.get(['lanes', lanesIndex, 'lane', 'selectables', selectableIndex, 'services']);
        const selection = <FormGroup>this.deploymentFormGroup.get(['lanes', lanesIndex, 'lane', 'selection']);
        selection.setValue(selectables.value.device);
        const elements = <FormArray>this.deploymentFormGroup.get(['lanes', lanesIndex, 'lane', 'elements']);
        for (let i = 0; i < elements.length; i++) {
            const element = <FormGroup>elements.controls[i];
            const task = <FormGroup>element.controls['task'];
            if (task.value) {
                const deviceDescription = task.controls['device_description'];
                const selectedService = task.controls['selected_service'];
                for (let k = 0; k < selectableServices.length; k++) {
                    const selectableService = <DeviceTypeServiceModel>selectableServices.controls[k].value;
                    if (selectableService.functions.length > 1) {
                        console.log('todo Error: Multiple Functions');
                    }
                    if (selectableService.functions[0].id === deviceDescription.value.function.id) {
                        selectedService.setValue(selectableService);
                    }
                }
            }
        }
    }

    elementsTimeEvent(elementIndex: number): FormGroup {
        return this.deploymentFormGroup.get(['elements', elementIndex, 'time_event']) as FormGroup;
    }

    lanesTimeEvent(elementLanesIndex: number, elementsIndex: number): FormGroup {
        return this.deploymentFormGroup.get(['lanes', elementLanesIndex, 'lane', 'elements', elementsIndex, 'time_event']) as FormGroup;
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


    get elements(): DeploymentsPreparedElementModel[] {
        const elements = this.deploymentFormGroup.get(['elements']) as FormArray;
        return elements.value;
    }

}
