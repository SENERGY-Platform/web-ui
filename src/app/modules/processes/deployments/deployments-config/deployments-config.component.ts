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

import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ProcessRepoService} from '../../process-repo/shared/process-repo.service';
import {DeploymentsService} from '../shared/deployments.service';
import {UtilService} from '../../../../core/services/util.service';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {CdkTextareaAutosize} from '@angular/cdk/text-field';
import {DeploymentsConfigInitializerService} from './shared/deployments-config-initializer.service';
import {
    DeploymentsSelectionPathOptionModel,
    V2DeploymentsPreparedConfigurableModel,
    V2DeploymentsPreparedElementModel,
    V2DeploymentsPreparedFilterCriteriaModel,
    V2DeploymentsPreparedModel, V2DeploymentsPreparedSelectionModel,
    V2DeploymentsPreparedSelectionOptionModel, V2DeploymentsPreparedStartParameterModel,
} from '../shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../data/flow-repo/shared/flow.model';
import {Observable} from 'rxjs';
import {DeploymentsFogFactory} from '../shared/deployments-fog.service';
import {HubModel, NetworksModel} from '../../../devices/networks/shared/networks.model';
import {NetworksService} from '../../../devices/networks/shared/networks.service';
import {OperatorRepoService} from '../../../data/operator-repo/shared/operator-repo.service';
import {OperatorModel} from '../../../data/operator-repo/shared/operator.model';
import {CharacteristicsService} from '../../../metadata/characteristics/shared/characteristics.service';
import {DeviceTypeAspectNodeModel} from '../../../metadata/device-types-overview/shared/device-type.model';
import {MatLegacySelectChange as MatSelectChange} from '@angular/material/legacy-select';

@Component({
    selector: 'senergy-process-deployments-config',
    templateUrl: './deployments-config.component.html',
    styleUrls: ['./deployments-config.component.css'],
})
export class ProcessDeploymentsConfigComponent implements OnInit {
    @ViewChild('autosize', { static: false }) autosize!: CdkTextareaAutosize;

    processId: string | undefined;
    deploymentId: string | undefined;
    deployment: V2DeploymentsPreparedModel | null = null;
    deploymentFormGroup = this.deploymentsConfigInitializerService.initFormGroup({} as V2DeploymentsPreparedModel);
    flowList: FlowModel[] = [];
    operatorImageList: { _id?: string; name: string }[] = [];
    handlerList: { _id?: string; name: string }[] = [];
    ready = false;
    optionGroups: Map<number, Map<string, V2DeploymentsPreparedSelectionOptionModel[]>> = new Map();
    deploymentsService: {
        getPreparedDeployments(processId: string): Observable<V2DeploymentsPreparedModel | null>;
        v2getDeployments(deploymentId: string): Observable<V2DeploymentsPreparedModel | null>;
        v2postDeployments(deployment: V2DeploymentsPreparedModel): Observable<{ status: number; id: string }>;
        getConfigurables(characteristicId: string, serviceId: string): Observable<V2DeploymentsPreparedConfigurableModel[] | null>;
    };
    selectedHubForm: FormControl = new FormControl(null);
    hubList: NetworksModel[] = [];
    characteristicNames: Map<string, string> = new Map();

    constructor(
        private _formBuilder: FormBuilder,
        private processRepoService: ProcessRepoService,
        private utilService: UtilService,
        private platformDeploymentsService: DeploymentsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private route: ActivatedRoute,
        private deploymentsConfigInitializerService: DeploymentsConfigInitializerService,
        private flowRepoService: FlowRepoService,
        private operatorRepoService: OperatorRepoService,
        private deploymentFogFactory: DeploymentsFogFactory,
        private hubsService: NetworksService,
        private characteristicsService: CharacteristicsService,
        private cd: ChangeDetectorRef,
    ) {
        this.getRouterParams();
        this.getFlows();
        this.getOperators();
        this.deploymentsService = platformDeploymentsService;
        (document as any).foo = this;//TODO: remove
    }

    ngOnInit() {
        this.handlerList = this.flowList;
        this.hubsService.listSyncNetworks().subscribe((result) => {
            if (result && result.length > 0) {
                this.hubList.push({ id: '', name: 'Platform', device_local_ids: null });
                this.hubList.push(...result);
            }
        });
        this.setDeployment();
        this.selectedHubForm.valueChanges.subscribe((value: HubModel) => {
            if (value && value.id && value.id !== '') {
                this.handlerList = this.operatorImageList;
                this.deploymentsService = this.deploymentFogFactory.withHubId(value.id);
            } else {
                this.handlerList = this.flowList;
                this.deploymentsService = this.platformDeploymentsService;
            }
            this.setDeployment();
        });
    }

    setDeployment() {
        this.ready = false;
        if (this.processId !== undefined) {
            this.deploymentsService.getPreparedDeployments(this.processId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                this.deployment = deployment;
                this.initOptionGroups(deployment);
                this.initFormGroup(deployment);
                this.ready = true;
                this.loadCharacteristicNames(deployment);
                this.cd.detectChanges();
            });
        } else if (this.deploymentId !== undefined) {
            this.deploymentsService.v2getDeployments(this.deploymentId).subscribe((deployment: V2DeploymentsPreparedModel | null) => {
                if (deployment) {
                    deployment.id = '';
                    this.initOptionGroups(deployment);
                    this.initFormGroup(deployment);
                    this.deployment = deployment;
                    this.ready = true;
                    this.loadCharacteristicNames(deployment);
                    this.cd.detectChanges();
                } else {
                    this.snackBar.open('Error while copying the deployment! Probably old version', "close", { panelClass: "snack-bar-error" });
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
            if (element.conditional_event?.selection?.selection_options !== undefined) {
                element.conditional_event.selection.selection_options = [];
            }
            if (element.task?.selection?.selection_options !== undefined) {
                element.task.selection.selection_options = [];
            }
        });
        this.deploymentsService.v2postDeployments(raw).subscribe((resp: { status: number }) => {
            if (resp.status === 200) {
                this.snackBar.open('Deployment stored successfully.', undefined, { duration: 2000 });
            } else {
                this.snackBar.open('Error while storing the deployment!', "close", { panelClass: "snack-bar-error" });
            }
        });
    }

    selectedServiceIdchangeListener(): void {
        const that = this;
        this.elementsFormArray.controls.forEach((element: AbstractControl) => {
            const selectedServiceFormControl = element.get(['task', 'selection', 'selected_service_id']);
            selectedServiceFormControl?.valueChanges.subscribe((selectedServiceId: string) => {
                const selectedPathOption = element.get(['task', 'selection', 'selected_path']);
                let option: V2DeploymentsPreparedSelectionOptionModel | undefined = that.getSelectedOption(element.get(['task', 'selection'])?.value)
                if (option && option.path_options && option.path_options.get) {
                    let pathOptions = option.path_options.get(selectedServiceId);
                    if (pathOptions && pathOptions.length == 1) {
                        that.setSelectedPathOption(selectedPathOption as FormGroup, pathOptions[0])
                    } else {
                        that.setSelectedPathOption(selectedPathOption as FormGroup, null)
                    }
                } else {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, null)
                }
            });
        });
    }

    getSelectedOption(selection: V2DeploymentsPreparedSelectionModel): V2DeploymentsPreparedSelectionOptionModel | undefined {
        if (selection.selection_options_index !== undefined) {
            return selection.selection_options[selection.selection_options_index];
        }
        return undefined
    }

    changeTaskSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
        this.changeElementSelectionOption(selectedElementIndex, selectionOptionIndex, 'task');
    }

    changeConditionalEventSelectionOption(selectedElementIndex: number, selectionOptionIndex: number): void {
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
            const selectedPathOption = that.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_path');
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
            let defaultSelectedService = that.setSelectedServiceId(elementIndex, selectionOptionIndex, elementType);
            if (defaultSelectedService && option && option.path_options && option.path_options.get) {
                let pathOptions = option.path_options.get(defaultSelectedService);
                if (pathOptions && pathOptions.length == 1) {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, pathOptions[0])
                } else {
                    that.setSelectedPathOption(selectedPathOption as FormGroup, null)
                }
            }else {
                that.setSelectedPathOption(selectedPathOption as FormGroup, null)
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
                    functionId: "",
                value: null,
                characteristicId: "",
                aspectNode: {} as DeviceTypeAspectNodeModel,
                isVoid: false,
                path: "",
                type: "",
            } as DeploymentsSelectionPathOptionModel
        }
        selectedPathOptionFormCtrl?.patchValue(pathOption);
        const configurables = selectedPathOptionFormCtrl?.get("configurables") as FormArray;
        if (configurables) {
            configurables.clear()
            this.deploymentsConfigInitializerService.initConfigurablesFormArray(pathOption.configurables, selectedPathOptionFormCtrl?.disabled === true).controls.forEach(value => {
                configurables.push(value)
            })
        }
    }

    setSelectedPathOptionByElementIndex(elementType: string, elementIndex: number, pathOption: DeploymentsSelectionPathOptionModel) {
        const pathFormCtrl = this.elementsFormArray.at(elementIndex).get(elementType + '.selection.selected_path') as FormGroup
        this.setSelectedPathOption(pathFormCtrl, pathOption)
    }

    getElement(elementIndex: number): V2DeploymentsPreparedElementModel {
        return this.elements[elementIndex];
    }

    elementsTimeEvent(elementIndex: number): FormGroup {
        return this.deploymentFormGroup.get(['elements', elementIndex, 'time_event']) as FormGroup;
    }

    setSelectedServiceId(elementIndex: number, selectionOptionIndex: number, elementType: string): string | null {
        const selection = this.deploymentFormGroup.get(['elements', elementIndex, elementType, 'selection']) as FormGroup;
        const selectedPathOption = selection.get("selected_path") as FormGroup
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
                    (o.import && o.import.id === option.import?.id),
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
        return '';
    }

    private getRouterParams(): void {
        this.processId = this.route.snapshot.queryParams.processId;
        this.deploymentId = this.route.snapshot.queryParams.deploymentId;
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
        this.operatorRepoService.getOperators('', 9999, 0, 'name', 'asc').subscribe((resp: { operators: OperatorModel[] }) => {
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
    ): Map<string, V2DeploymentsPreparedSelectionOptionModel[]> {
        const devices: V2DeploymentsPreparedSelectionOptionModel[] = [];
        const deviceGroups: V2DeploymentsPreparedSelectionOptionModel[] = [];
        const imports: V2DeploymentsPreparedSelectionOptionModel[] = [];
        if (!selectionOptions) {
            selectionOptions = [];
        }
        for (const option of selectionOptions) {
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
}
