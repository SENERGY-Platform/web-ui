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

import { ChangeDetectorRef, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcessRepoService } from '../../process-repo/shared/process-repo.service';
import { DeploymentsService } from '../shared/deployments.service';
import { UtilService } from '../../../../core/services/util.service';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { DeploymentsConfigInitializerService } from './shared/deployments-config-initializer.service';
import {
    AnalyticsOperatorOptionModel,
    analyticsEventSource,
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedElementModel, V2DeploymentsPreparedModel, V2DeploymentsPreparedSelectionModel,
    V2DeploymentsPreparedSelectionOptionModel, V2DeploymentsPreparedStartParameterModel
} from '../shared/deployments-prepared-v2.model';
import { FlowRepoService } from '../../../data/flow-repo/shared/flow-repo.service';
import { FlowModel } from '../../../data/flow-repo/shared/flow.model';
import { HubModel } from '../../../devices/networks/shared/networks.model';
import { NetworksService } from '../../../devices/networks/shared/networks.service';
import { OperatorRepoService } from '../../../data/operator-repo/shared/operator-repo.service';
import { OperatorModel } from '../../../data/operator-repo/shared/operator.model';
import { CharacteristicsService } from '../../../metadata/characteristics/shared/characteristics.service';
import { DeviceTypeAspectNodeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardSubtitle } from '@angular/material/card';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { DeploymentsConfigTimeEventComponent } from './components/time-event/deployments-config-time-event.component';
import { MatButton } from '@angular/material/button';
import { KeyValuePipe } from '@angular/common';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { PipelineRegistryService } from '../../../data/pipeline-registry/shared/pipeline-registry.service';
import { PipelineModel } from '../../../data/pipeline-registry/shared/pipeline.model';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { forkJoin, map, Observable, of } from 'rxjs';

interface V2DeploymentsPreparedSelectionOptionModelWithGroup extends V2DeploymentsPreparedSelectionOptionModel {
    group?: string;
}

@Component({
    selector: 'senergy-process-deployments-config',
    templateUrl: './deployments-config.component.html',
    styleUrls: ['./deployments-config.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatFormField, MatLabel, MtxSelect, FormsModule, ReactiveFormsModule, MatError, MatErrorMessagesDirective, MatCard, MatCardContent, MatInput, CdkTextareaAutosize, MatCardHeader, MatCardTitle, MatCheckbox, MatCardSubtitle, MtxOption, DeploymentsConfigTimeEventComponent, MatButton, KeyValuePipe]
})
export class ProcessDeploymentsConfigComponent implements OnInit {
    private _formBuilder = inject(FormBuilder);
    private processRepoService = inject(ProcessRepoService);
    private utilService = inject(UtilService);
    private deploymentsService = inject(DeploymentsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private deploymentsConfigInitializerService = inject(DeploymentsConfigInitializerService);
    private flowRepoService = inject(FlowRepoService);
    private operatorRepoService = inject(OperatorRepoService);
    private hubsService = inject(NetworksService);
    private characteristicsService = inject(CharacteristicsService);
    private pipelineRegistryService = inject(PipelineRegistryService);
    private authorizationService = inject(AuthorizationService);
    private cd = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef);

    @ViewChild('autosize', { static: false }) autosize!: CdkTextareaAutosize;

    processId: string | undefined;
    deploymentId: string | undefined;
    /** the gateway a copied deployment runs on, preselected for the copy */
    private requestedHubId: string | undefined;
    deployment: V2DeploymentsPreparedModel | null = null;
    deploymentFormGroup = this.deploymentsConfigInitializerService.initFormGroup({} as V2DeploymentsPreparedModel);
    flowList: FlowModel[] = [];
    operatorImageList: { _id?: string; name: string }[] = [];
    handlerList: { _id?: string; name: string }[] = [];
    ready = false;
    optionGroups: Map<number, V2DeploymentsPreparedSelectionOptionModelWithGroup[]> = new Map();
    /** the hub to deploy to; undefined is the platform */
    private networkId: string | undefined;
    selectedHubForm: FormControl = new FormControl(null);
    hubList: HubModel[] = [];
    characteristicNames: Map<string, string> = new Map();

    constructor() {
        this.getRouterParams();
        this.getFlows();
        this.getOperators();
    }

    ngOnInit() {
        this.handlerList = this.flowList;
        this.selectedHubForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value: HubModel) => {
            if (value && value.id && value.id !== '') {
                this.handlerList = this.operatorImageList;
                this.networkId = value.id;
            } else {
                this.handlerList = this.flowList;
                this.networkId = undefined;
            }
            this.setDeployment();
        });
        this.hubsService.listSyncNetworks().subscribe((result) => {
            if (result && result.length > 0) {
                this.hubList.push({ id: '', name: 'Platform', device_local_ids: null } as HubModel);
                this.hubList.push(...result);
            }
            // a copy of a deployment of a gateway goes to the same gateway unless the user picks
            // another one (SNRGY-3346)
            const requested = this.hubList.find((hub) => this.requestedHubId && hub.id === this.requestedHubId);
            if (requested) {
                this.selectedHubForm.setValue(requested);
            } else if (this.requestedHubId) {
                // the gateway is gone or not shared any more: the copy starts out in the cloud
                this.setDeployment();
            }
        });
        if (!this.requestedHubId) {
            this.setDeployment();
        }
    }

    setDeployment() {
        this.ready = false;
        if (this.processId !== undefined) {
            forkJoin([this.deploymentsService.getPreparedDeployments(this.processId, this.networkId), this.analyticsOptions()]).subscribe(([deployment, analytics]) => {
                ProcessDeploymentsConfigComponent.addAnalyticsOptions(deployment, analytics);
                this.deployment = deployment;
                this.initOptionGroups(deployment);
                this.initFormGroup(deployment);
                this.ready = true;
                this.loadCharacteristicNames(deployment);
                this.cd.detectChanges();
            });
        } else if (this.deploymentId !== undefined) {
            forkJoin([this.deploymentsService.v2getDeployments(this.deploymentId), this.analyticsOptions()]).subscribe(([deployment, analytics]) => {
                if (deployment) {
                    deployment.id = '';
                    ProcessDeploymentsConfigComponent.addAnalyticsOptions(deployment, analytics);
                    this.initOptionGroups(deployment);
                    this.initFormGroup(deployment);
                    this.deployment = deployment;
                    this.ready = true;
                    this.loadCharacteristicNames(deployment);
                    this.cd.detectChanges();
                } else {
                    snackError(this.snackBar, 'Error while copying the deployment! Probably old version');
                }
            });
        } else {
            this.router.navigateByUrl('processes/repository');
        }
    }

    /**
     * the cloud operators of the user's own pipelines, whose output a message event can wait for;
     * the automation-engine accepts only pipelines of the owner of the deployment and no gateway
     */
    private analyticsOptions(): Observable<AnalyticsOperatorOptionModel[]> {
        const userId = this.authorizationService.getUserId();
        if (this.networkId !== undefined || userId instanceof Error) {
            return of([]);
        }
        return this.pipelineRegistryService.getPipelines().pipe(
            map((pipelines: PipelineModel[]) => {
                const result: AnalyticsOperatorOptionModel[] = [];
                pipelines.filter((pipeline) => pipeline.userId === userId).forEach((pipeline) => {
                    (pipeline.operators || []).filter((operator) => operator.deploymentType !== 'local').forEach((operator) => {
                        result.push({ pipeline_id: pipeline.id, pipeline_name: pipeline.name, operator_id: operator.id, operator_name: operator.name });
                    });
                });
                return result;
            }),
        );
    }

    /**
     * adds the analytics operators to the options of every event; the automation-engine offers
     * device events, and events without device criteria, as conditional events
     */
    static addAnalyticsOptions(deployment: V2DeploymentsPreparedModel | null, analytics: AnalyticsOperatorOptionModel[]): void {
        if (!deployment || analytics.length === 0) {
            return;
        }
        deployment.elements?.forEach((element) => {
            const selection = element.conditional_event?.selection;
            if (!selection) {
                return;
            }
            if (!selection.selection_options) {
                selection.selection_options = [];
            }
            analytics.forEach((option) => {
                selection.selection_options.push({
                    device: null, services: [], device_group: null, import: null, importType: null, path_options: null, analytics: option,
                });
            });
        });
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
        const raw = this.deploymentFormGroup.getRawValue() as V2DeploymentsPreparedModel;
        raw?.elements?.forEach((element: V2DeploymentsPreparedElementModel) => {
            if (element.message_event?.selection?.selection_options !== undefined) {
                element.message_event.selection.selection_options = [];
            }
            if (element.conditional_event?.selection?.selection_options !== undefined) {
                element.conditional_event.selection.selection_options = [];
            }
            if (element.task?.selection?.selection_options !== undefined) {
                element.task.selection.selection_options = [];
            }
        });
        this.deploymentsService.v2postDeployments(raw, 'sepl', this.networkId).subscribe((resp: { status: number }) => {
            if (resp.status === 200) {
                snackSuccess(this.snackBar, 'Deployment stored successfully.');
            } else {
                snackError(this.snackBar, 'Error while storing the deployment!');
            }
        });
    }

    selectedServiceIdchangeListener(): void {
        const that = this;
        this.elementsFormArray.controls.forEach((element: AbstractControl) => {
            const selectedServiceFormControl = element.get(['task', 'selection', 'selected_service_id']);
            selectedServiceFormControl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selectedServiceId: string) => {
                const selectedPathOption = element.get(['task', 'selection', 'selected_path']);
                const option: V2DeploymentsPreparedSelectionOptionModel | undefined = that.getSelectedOption(element.get(['task', 'selection'])?.value);
                if (option && option.path_options && option.path_options[selectedServiceId]) {
                    const pathOptions = option.path_options[selectedServiceId];
                    if (pathOptions && pathOptions.length === 1) {
                        that.setSelectedPathOption(selectedPathOption as FormGroup, pathOptions[0]);
                    } else {
                        that.setSelectedPathOption(selectedPathOption as FormGroup, null);
                    }
                } else {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, null);
                }
            });
        });
    }

    getSelectedOption(selection: V2DeploymentsPreparedSelectionModel): V2DeploymentsPreparedSelectionOptionModel | undefined {
        if (selection.selection_options_index !== undefined) {
            return selection.selection_options[selection.selection_options_index];
        }
        return undefined;
    }

    changeTaskSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'task');
    }

    changeConditionalEventSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void  {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'conditional_event');
    }

    changeEventSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'message_event');
    }

    changeElementSelectionOption(selectedElementIndex: number, selectionOptionIndex: number, elementType: string): void {
        const elementClicked = this.getElement(selectedElementIndex);
        const option = ProcessDeploymentsConfigComponent.getOption(elementClicked, selectionOptionIndex);

        const that = this;

        const setOption = function(elementIndex: number) {
            const selectedDeviceGroupId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_group_id');
            const selectedDeviceId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_device_id');
            const selectedImportId = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_import_id');
            const selectedGenericEventSource = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_generic_event_source');
            const selectedPathOption = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_path');
            if (option) {
                selectedGenericEventSource?.patchValue(option.analytics ? analyticsEventSource(option.analytics) : null);
            }
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
            if (option && option.analytics) {
                selectedDeviceGroupId?.patchValue(null);
                selectedDeviceId?.patchValue(null);
                selectedImportId?.patchValue(null);
            }
            const defaultSelectedService = that.setSelectedServiceId(elementIndex, selectionOptionIndex, elementType);
            if (defaultSelectedService && option && option.path_options && option.path_options[defaultSelectedService]) {
                const pathOptions = option.path_options[defaultSelectedService];
                if (pathOptions && pathOptions.length === 1) {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, pathOptions[0]);
                } else {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, null);
                }
            }else {
                that.setSelectedPathOption(selectedPathOption as FormGroup, null);
            }
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

    setSelectedPathOption(selectedPathOptionFormCtrl: FormGroup | null, pathOption: DeploymentsSelectionPathOptionModel | null) {
        if (pathOption === null) {
            pathOption = {
                configurables: [],
                functionId: '',
                value: null,
                characteristicId: '',
                aspectNode: {} as DeviceTypeAspectNodeModel,
                aspectNodes: [],
                isVoid: false,
                path: '',
                type: '',
            } as DeploymentsSelectionPathOptionModel;
        }
        // patchValue leaves a control untouched when its key is missing from the patched value, so an
        // option without aspectNodes would otherwise keep the previously selected option's list
        selectedPathOptionFormCtrl?.patchValue({ ...pathOption, aspectNodes: pathOption.aspectNodes ?? [] });
        const configurables = selectedPathOptionFormCtrl?.get('configurables') as FormArray;
        if (configurables) {
            configurables.clear();
            this.deploymentsConfigInitializerService.initConfigurablesFormArray(pathOption.configurables, selectedPathOptionFormCtrl?.disabled === true).controls.forEach(value => {
                configurables.push(value);
            });
        }
    }

    setSelectedPathOptionByElementIndex(elementType: string, elementIndex: number, pathOption: DeploymentsSelectionPathOptionModel) {
        const pathFormCtrl = this.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_path') as FormGroup;
        this.setSelectedPathOption(pathFormCtrl, pathOption);
    }

    getElement(elementIndex: number): V2DeploymentsPreparedElementModel {
        return this.elements[elementIndex];
    }

    elementsTimeEvent(elementIndex: number): FormGroup {
        return this.deploymentFormGroup.get(['elements', elementIndex, 'time_event']) as FormGroup;
    }

    setSelectedServiceId(elementIndex: number, selectionOptionIndex: number, elementType: string): string | null {
        const selection = this.deploymentFormGroup.get(['elements', elementIndex, elementType, 'selection']) as FormGroup;
        const services = (
            this.deploymentFormGroup.get([
                'elements',
                elementIndex,
                elementType,
                'selection',
                'selection_options',
                selectionOptionIndex,
                'services',
            ])
        ) as FormArray;
        selection.patchValue({ selection_options_index: selectionOptionIndex });
        switch (services.value.length) {
        case 0:
            selection.patchValue({ selected_service_id: null });
            selection.patchValue({ show: false });
            return null;
        case 1:
            selection.patchValue({ selected_service_id: services.value[0].id });
            selection.patchValue({ show: false });
            return services.value[0].id;
        default:
            selection.patchValue({ selected_service_id: null });
            selection.patchValue({ show: true });
            return null;
        }
    }

    getTaskIndex(element: V2DeploymentsPreparedElementModel): (option: V2DeploymentsPreparedSelectionOptionModel) => number {
        return (option) => {
            if (element.task?.selection.selection_options === undefined) {
                return -1;
            }
            return element.task?.selection.selection_options.findIndex(
                (o) => (o.device && o.device.id === option.device?.id) || (o.device_group && o.device_group.id === option.device_group?.id),
            );
        };
    }

    getConditionalEventIndex(element: V2DeploymentsPreparedElementModel): (option: V2DeploymentsPreparedSelectionOptionModel) => number {
        return (option) => {
            if (element.conditional_event?.selection.selection_options === undefined) {
                return -1;
            }
            return element.conditional_event?.selection.selection_options.findIndex(
                (o) =>
                    (o.device && o.device.id === option.device?.id) ||
                    (o.device_group && o.device_group.id === option.device_group?.id) ||
                    (o.import && o.import.id === option.import?.id) ||
                    (o.analytics && o.analytics.pipeline_id === option.analytics?.pipeline_id && o.analytics.operator_id === option.analytics?.operator_id),
            );
        };
    }

    getMsgEventIndex(element: V2DeploymentsPreparedElementModel): (option: V2DeploymentsPreparedSelectionOptionModel) => number {
        return (option) => {
            if (element.message_event?.selection.selection_options === undefined) {
                return -1;
            }
            return element.message_event?.selection.selection_options.findIndex(
                (o) =>
                    (o.device && o.device.id === option.device?.id) ||
                    (o.device_group && o.device_group.id === option.device_group?.id) ||
                    (o.import && o.import.id === option.import?.id),
            );
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
        if (option.analytics) {
            return option.analytics.pipeline_name + ' / ' + option.analytics.operator_name;
        }
        return '';
    }

    private getRouterParams(): void {
        this.processId = this.route.snapshot.queryParams.processId;
        this.deploymentId = this.route.snapshot.queryParams.deploymentId;
        this.requestedHubId = this.route.snapshot.queryParams.hubId;
    }

    private static getOption(
        element: V2DeploymentsPreparedElementModel,
        selectionOptionIndex: number,
    ): V2DeploymentsPreparedSelectionOptionModel | null {
        if (element.task && element.task.selection.selection_options) {
            return element.task.selection.selection_options[selectionOptionIndex];
        }
        if (element.message_event && element.message_event.selection.selection_options) {
            return element.message_event.selection.selection_options[selectionOptionIndex];
        }
        if (element.conditional_event && element.conditional_event.selection.selection_options) {
            return element.conditional_event.selection.selection_options[selectionOptionIndex];
        }
        return null;
    }

    private getFlows(): void {
        this.flowRepoService.getFlows('', 9999, 0, 'name', 'asc').subscribe((resp: { flows: FlowModel[] }) => {
            this.flowList = resp.flows;
            this.handlerList = this.flowList; // initial value of list befor user selects different deployment destination
        });
    }

    private getOperators(): void {
        this.operatorRepoService.getAllOperators().subscribe((resp: { operators: OperatorModel[] }) => {
            const newList: { _id?: string; name: string }[] = [];
            resp.operators.forEach((value) => {
                if ((value.deploymentType === 'local' || value.deploymentType === 'both') && (value.name || value.image)) {
                    newList.push({
                        _id: value.image,
                        name: value.name || value.image || 'undefined',
                    });
                }
            });
            this.operatorImageList = newList;
        });
    }

    get elements(): V2DeploymentsPreparedElementModel[] {
        const elements = this.deploymentFormGroup.get(['elements']) as FormArray;
        return elements.value;
    }

    get start_parameter(): V2DeploymentsPreparedStartParameterModel[] {
        const parameters = this.deploymentFormGroup.get(['start_parameter']) as FormArray;
        return parameters.value;
    }

    get elementsFormArray(): FormArray {
        return this.deploymentFormGroup.get(['elements']) as FormArray;
    }

    displayParameter(value: unknown): boolean {
        const s = value as string;
        const matches = s.match(/^\${.*}$/);
        return !(matches && matches.length);
    }

    private static getOptionGroups(
        selectionOptions: V2DeploymentsPreparedSelectionOptionModel[],
    ): V2DeploymentsPreparedSelectionOptionModelWithGroup[] {
        const result: V2DeploymentsPreparedSelectionOptionModel[] = [];
        if (!selectionOptions) {
            selectionOptions = [];
        }
        for (const option of selectionOptions) {
            if (option.device) {
                (option as V2DeploymentsPreparedSelectionOptionModelWithGroup).group = 'Devices';
                result.push(option);
            }
            if (option.device_group) {
                (option as V2DeploymentsPreparedSelectionOptionModelWithGroup).group = 'Device-Groups';
                result.push(option);
            }
            if (option.import) {
                (option as V2DeploymentsPreparedSelectionOptionModelWithGroup).group = 'Imports';
                result.push(option);
            }
            if (option.analytics) {
                (option as V2DeploymentsPreparedSelectionOptionModelWithGroup).group = 'Analytics';
                result.push(option);
            }
        }
        return result;
    }

    private initOptionGroups(deployment: V2DeploymentsPreparedModel | null) {
        if (deployment) {
            deployment.elements?.forEach((element, index) => {
                if (element.task) {
                    this.optionGroups.set(index, ProcessDeploymentsConfigComponent.getOptionGroups(element.task.selection.selection_options));
                }
                if (element.message_event) {
                    this.optionGroups.set(index, ProcessDeploymentsConfigComponent.getOptionGroups(element.message_event.selection.selection_options));
                }
                if (element.conditional_event) {
                    this.optionGroups.set(index, ProcessDeploymentsConfigComponent.getOptionGroups(element.conditional_event.selection.selection_options));
                }
            });
        }
    }

    getPathOptions(elementIndex: number, elementType: string): DeploymentsSelectionPathOptionModel[] {
        const element = (this.deploymentFormGroup.get('elements') as FormArray).at(elementIndex);

        const selectionOptionsIndex = element.get(elementType+'.selection.selection_options_index')?.value;

        if (selectionOptionsIndex === undefined || selectionOptionsIndex === null) {
            return [];
        }
        const selectedOption = (element.get(elementType+'.selection.selection_options') as FormArray).at(selectionOptionsIndex);

        if (selectedOption === undefined || selectedOption === null) {
            return [];
        }
        const selectedServiceId = element.get(elementType+'.selection.selected_service_id')?.value;
        const importTypeId = selectedOption.get('importType')?.value?.id;

        let options: DeploymentsSelectionPathOptionModel[] = [];
        if (!(selectedServiceId === undefined || selectedServiceId === null)) {
            const servicePathOptions = selectedOption.get('path_options')?.value;
            if (servicePathOptions) {
                options = this.getFromMapOrObj(servicePathOptions, selectedServiceId) || [];
            } else {
                options = [];
            }
        }
        if (!(importTypeId === undefined || importTypeId === null)) {
            const servicePathOptions = selectedOption.get('path_options')?.value;
            if (servicePathOptions) {
                options = this.getFromMapOrObj(servicePathOptions, importTypeId) || [];
            } else {
                options = [];
            }
        }
        return options;
    }

    getFromMapOrObj(index: any, key: string){
        return index.get ? index.get(key) : index[key];
    }

    getServiceOptions(elementIndex: number) {
        const element = (this.deploymentFormGroup.get('elements') as FormArray).at(elementIndex);
        const selectionOptionsIndex = element.get('message_event.selection.selection_options_index')?.value;
        const selectedOption = (element?.get('message_event.selection.selection_options') as FormArray).at(selectionOptionsIndex);
        const options = selectedOption?.get('services')?.value || [];
        if (options.length === 0) {
            element.get('message_event.selection')?.patchValue({ selected_service_id: null });
        }
        return options;
    }

    private loadCharacteristicNames(deployment: V2DeploymentsPreparedModel | null) {
        if (!deployment) {
            return;
        }
        deployment.elements?.forEach((element) => {
            const characteristicId = element.message_event?.selection?.filter_criteria?.characteristic_id;
            if (characteristicId && !this.characteristicNames.has(characteristicId)) {
                this.characteristicsService.getCharacteristic(characteristicId).subscribe((value) => {
                    this.characteristicNames.set(characteristicId, value.name);
                });
            }
        });
    }

    groupOptionByFn(_: any) {
        return '';
    }

    JONAH(){
        console.log(this.deploymentFormGroup);
    }
}
