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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {
    SmartServiceTaskInputDescription,
    SmartServiceTaskDescription,
    ServingRequest,
} from '../../shared/designer.model';
import { ProcessRepoService } from '../../../../processes/process-repo/shared/process-repo.service';
import { DeploymentsService } from '../../../../processes/deployments/shared/deployments.service';
import { ProcessModel } from '../../../../processes/process-repo/shared/process.model';
import {
    V2DeploymentsPreparedModel
} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import { FlowRepoService } from '../../../../data/flow-repo/shared/flow-repo.service';
import { FlowModel } from '../../../../data/flow-repo/shared/flow.model';
import { ParserService } from '../../../../data/flow-repo/shared/parser.service';
import { ParseModel } from '../../../../data/flow-repo/shared/parse.model';
import {
    BpmnElement,
    BpmnParameter,
    BpmnParameterWithLabel,
    BpmnBusinessObject,
    BpmnElementRef
} from '../../../../processes/designer/shared/designer.model';
import { ImportInstanceConfigModel, ImportInstancesModel } from '../../../../imports/import-instances/shared/import-instances.model';
import {
    ImportTypeContentVariableModel,
    ImportTypeModel,
} from '../../../../imports/import-types/shared/import-types.model';
import { ImportTypesService } from '../../../../imports/import-types/shared/import-types.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
    AbstractSmartServiceInput, abstractSmartServiceInputToSmartServiceInputsDescription,
    smartServiceInputsDescriptionToAbstractSmartServiceInput
} from '../edit-smart-service-input-dialog/edit-smart-service-input-dialog.component';
import { FunctionsPermSearchModel } from '../../../../metadata/functions/shared/functions-perm-search.model';
import {
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
    DeviceTypeDeviceClassModel,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { CodeEditorCompletion, CodeEditorCompletionSource } from '../../../../../core/components/code-editor/code-editor-completion';
import { smartServiceCompletions } from './smart-service-completions';
import { smartServiceScriptEnvTypes } from './scriptenv-types';
import {
    CodeEditorScriptEnvironment,
    gojaScriptEnvironment,
} from '../../../../../core/components/code-editor/code-editor-environment';
import { AspectClassification, aspectTreeFromAspectNodes, classifyAspects, withStoredAspects } from '../../../../../core/components/aspect-select/aspect-select.model';
import {
    criteriaAspectsLabel,
    criteriaHasAspectClassCollision,
    criteriaListHasAspectClassCollision,
    editableCriteria,
    setCriteriaAspects,
    SmartServiceCriteria,
    storableCriteria,
} from '../../shared/smart-service-criteria';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { NgFor, NgIf } from '@angular/common';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { CheckboxValueDirective } from '../../shared/string-check-box.directive';
import { MatCard } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatExpansionPanelContent } from '@angular/material/expansion';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { CriteriaListComponent } from './criteria-list.component';
import { EsstdExportComponentComponent } from './esstd-export-component/esstd-export-component.component';
import { IsJsonValidatorDirective } from '../../../../../core/validators/is-json-validator.directive';
import { CodeEditorComponent } from '../../../../../core/components/code-editor/code-editor.component';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';

interface GenericWatcherRequest {
    method: string;
    endpoint: string;
    body?: string; // base64 encoded byte array
    add_auth_token: boolean;
    header?: { [index: string]: string[] };
}

@Component({
    templateUrl: './edit-smart-service-task-dialog.component.html',
    styleUrls: ['./edit-smart-service-task-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatTabGroup, MatTab, MatFormField, MatLabel, MatInput, FormsModule, MatError, MatErrorMessagesDirective, NgFor, NgIf, MtxSelect, MatCheckbox, CheckboxValueDirective, MatCard, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatIconButton, MatTooltip, MatIcon, MatSuffix, MatMenuTrigger, MatMenu, MatMenuItem, MtxOption, MatExpansionPanelDescription, MatDivider, CriteriaListComponent, EsstdExportComponentComponent, IsJsonValidatorDirective, MatTabContent, CodeEditorComponent, MatButton, AspectSelectComponent, MatExpansionPanelContent, MatDialogActions]
})
export class EditSmartServiceTaskDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<EditSmartServiceTaskDialogComponent>>(MatDialogRef);
    private processRepo = inject(ProcessRepoService);
    private processDeployment = inject(DeploymentsService);
    private flowService = inject(FlowRepoService);
    private flowParser = inject(ParserService);
    private importTypeService = inject(ImportTypesService);
    private sanitizer = inject(DomSanitizer);
    private functionsService = inject(FunctionsService);
    private deviceTypesService = inject(DeviceTypeService);
    private deviceClassService = inject(DeviceClassesService);
    private dialogParams = inject<{
        info: SmartServiceTaskDescription;
        element: BpmnElement;
    }>(MAT_DIALOG_DATA);

    init: SmartServiceTaskDescription;
    result: SmartServiceTaskDescription;
    tabs: string[] = ['process_deployment', 'process_deployment_start', 'analytics', 'export', 'import', 'info', 'device_repository', 'watcher'];

    flows: FlowModel[] | null = null;
    processModels: ProcessModel[] | null = null;
    selectedProcessModelPreparation: V2DeploymentsPreparedModel | null = null;
    knownInputValues = new Map<string, SmartServiceTaskInputDescription>();

    parsedFlows: Map<string, ParseModel[]> = new Map<string, ParseModel[]>();
    currentParsedFlows: ParseModel[] = [];
    flowSvg: string | SafeHtml = '';
    currentFlowInputId = '';

    availableProcessVariables: Map<string, BpmnParameterWithLabel[]> = new Map();

    exportRequest: ServingRequest;
    importRequest: ImportInstancesModel;
    importRequestConfigValueType: Map<string, string> = new Map();
    importTypes: ImportTypeModel[] = [];
    knownImportTypes: Map<string, ImportTypeModel> = new Map();
    importOverwrites: { config_name: string; json_value: string }[] = [];
    availableAnalyticsIotSelections: { name: string; value: string }[];
    availableProcessIotSelections: { name: string; value: string }[];

    infoModuleType = 'widget';
    infoKey = '';

    processStart: ProcessStartModel = { deployment_id: '', inputs: [] };

    smartServiceInputs: AbstractSmartServiceInput[] = [];

    smartServiceBpmnElement: BpmnElement;

    deviceRepositoryWorkerInfo: {
        name: string;
        key: string;
        operation: string;
        create_device_group: {
            ids: string;
        };
    } = {
            name: '',
            key: '',
            operation: '',
            create_device_group: {
                ids: ''
            }
        };

    watcherWorkerInfo: {
        operation: string;
        maintenance_producer: string;
        interval: string;
        hash_type: string;
        maintenance_procedure_inputs: { key: string; value: string }[];
        devices_by_criteria: {
            criteria: SmartServiceCriteria[];
        };
        request: GenericWatcherRequest;
    } = {
            operation: 'devices_by_criteria',
            maintenance_producer: '',
            interval: '1h',
            hash_type: 'deviceids',
            maintenance_procedure_inputs: [],
            devices_by_criteria: {
                criteria: [],
            },
            request: {
                method: 'GET',
                endpoint: 'http://example.com',
                body: '',
                add_auth_token: false,
                header: { 'Accept-Charset': ['utf-8'] }
            }
        };

    /*
     * Script and module-data contents. These hold the value rather than reading it
     * back out of the editor on save, so that a script survives even when its panel
     * was never opened and no editor was ever created for it.
     */
    preScript = '';
    postScript = '';
    infoModuleData = '';


    constructor() {
        const dialogParams = this.dialogParams;

        this.smartServiceBpmnElement = dialogParams.element;
        if (!dialogParams.info.topic) {
            dialogParams.info.topic = this.tabs[0];
        }
        this.result = dialogParams.info;
        this.init = dialogParams.info;
        this.ensureResultFields();
        this.availableProcessVariables = this.getIncomingOutputs(dialogParams.element);
        this.availableAnalyticsIotSelections = this.getAvailableAnalyticsIotSelections();
        this.availableProcessIotSelections = this.getAvailableProcessIotSelections();
        this.addPipelineWithOperatorIdOptionsToAvailableVariables();
        this.addImportIotEntityWithPathToAvailableVariables();
        this.exportRequest = this.parseExport(this.result.inputs.find(value => value.name === 'export.request')?.value || '{"generated": true}');
        this.importRequest = this.parseImport(this.result.inputs.find(value => value.name === 'import.request')?.value || '{}');
        this.importTypeService.listImportTypes('', 9999, 0, 'name.asc').subscribe(value => this.importTypes = value.result);
        if (this.importRequest.import_type_id) {
            this.loadImportType(false);
        }

        this.infoModuleType = this.result.inputs.find(value => value.name === 'info.module_type')?.value || 'widget';
        this.infoKey = this.result.inputs.find(value => value.name === 'info.key')?.value || '';
        this.processStart = this.inputsToProcessStartModel(this.result.inputs);
        this.smartServiceInputs = smartServiceInputsDescriptionToAbstractSmartServiceInput(dialogParams.info.smartServiceInputs);
        this.initDeviceRepositoryWorkerInfo(dialogParams.info.inputs);
        this.initWatcherInfo(dialogParams.info.inputs);

        this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.functions = value.result;
        });
        this.deviceClassService.getDeviceClasses('', 9999, 0, 'name', 'asc').subscribe(value => {
            this.deviceClasses = value.result;
        });
        this.deviceTypesService.getAspectNodesWithFunctionOfDevicesOnly().subscribe((nodes: DeviceTypeAspectNodeModel[]) => {
            this.aspectNodes = nodes;
            this.aspectNames = new Map(nodes.map((node) => [node.id, node.name]));
            // offered under its id rather than dropped: the watcher criteria are written back whole on save
            const watched = this.watcherWorkerInfo.devices_by_criteria.criteria;
            const stored = Array.isArray(watched) ? watched.flatMap((c) => c?.aspect_ids || []) : [];
            this.aspects = withStoredAspects(aspectTreeFromAspectNodes(nodes), stored);
            this.classified = classifyAspects(this.aspects);
        });
        const processModelId = this.result.inputs.find(value => value.name === 'process_deployment.process_model_id')?.value || '';
        if (processModelId !== '') {
            this.ensureProcessTaskParameter(processModelId);
        }
    }

    ngOnInit(): void {
        this.infoModuleData = this.getModuleDataFromInputs(this.result.inputs);
        this.preScript = this.getChunkedDataFromInputs('prescript', this.result.inputs, '');
        this.postScript = this.getChunkedDataFromInputs('postscript', this.result.inputs, '');
    }

    /**
     * Pre/postscripts run in the smart-service workers' goja runtime, with the
     * scriptenv namespaces injected. Declaring those to the editor is also what keeps
     * the diagnostics honest: without them every deviceRepo call reads as undefined.
     */
    readonly scriptEnvironment: CodeEditorScriptEnvironment = {
        ...gojaScriptEnvironment,
        extraLibs: [{ filePath: 'ts:senergy-scriptenv.d.ts', content: smartServiceScriptEnvTypes }],
    };

    /*
     * Completions for the javascript editors: the generated ones from
     * smart-service-module-worker-lib, followed by the ids of the metadata this
     * dialog has loaded. Declared as an arrow property so it can be handed to the
     * editor component as an input without losing `this`.
     *
     * The metadata lists are filled by requests started in the constructor, so this
     * is evaluated per keystroke rather than built once -- whatever has arrived by
     * then is offered, which is how the ace version behaved too.
     */
    jsCompletions: CodeEditorCompletionSource = (request) => {
        const completions: CodeEditorCompletion[] = [...smartServiceCompletions(request)];

        completions.push({
            caption: 'filter criteria struct',
            value: 'var criteria = ' + JSON.stringify({
                aspect_ids: [],
                aspect_id: '',
                device_class_id: '',
                function_id: '',
                interaction: ''
            } as SmartServiceCriteria) + '/*remove unused fields; aspect_id is the deprecated alias of aspect_ids*/',
            meta: 'static'
        });

        this.functions.forEach(value => {
            completions.push({
                caption: 'function: ' + value.name,
                value: `"${value.id}"/*${value.name}*/`,
                meta: 'static',
                icon: 'function'
            });
        });

        this.deviceClasses.forEach(value => {
            completions.push({
                caption: 'device-class: ' + value.name,
                value: `"${value.id}"/*${value.name}*/`,
                meta: 'static',
                icon: 'device-class'
            });
        });

        this.aspectNodes.forEach(value => {
            completions.push({
                caption: 'aspect: ' + value.name,
                value: `"${value.id}"/*${value.name}*/`,
                meta: 'static',
                icon: 'aspect'
            });
        });

        const interactions: string[] = ['event', 'request', 'event+request'];
        interactions.forEach(value => {
            completions.push({
                caption: 'interaction: ' + value,
                value: `"${value}"`,
                meta: 'static'
            });
        });

        return completions;
    };

    /*
     * Completions for the module-data json editor: the process variables reaching
     * this element, offered as ${...} references, and the form fields among them
     * additionally as {{.}} template placeholders.
     */
    jsonCompletions: CodeEditorCompletionSource = () => {
        const processVariables = ([] as BpmnParameterWithLabel[])
            .concat(this.availableProcessVariables.get('iot_form_fields') || [])
            .concat(this.availableProcessVariables.get('value_form_fields') || [])
            .concat(this.availableProcessVariables.get('process_deployment') || [])
            .concat(this.availableProcessVariables.get('analytics') || [])
            .concat(this.availableProcessVariables.get('export') || [])
            .concat(this.availableProcessVariables.get('import') || [])
            .concat(this.availableProcessVariables.get('uncategorized') || [])
            .map(value => ({
                caption: 'process-variable: ' + value.name,
                value: '${' + value.name + '}',
                meta: 'static'
            }));

        const placeholders = ([] as BpmnParameterWithLabel[])
            .concat(this.availableProcessVariables.get('iot_form_fields') || [])
            .concat(this.availableProcessVariables.get('value_form_fields') || [])
            .map(value => ({
                caption: 'placeholder: ' + value.name,
                value: '{{.' + value.name + '}}',
                meta: 'static'
            }));

        return processVariables.concat(placeholders);
    };

    ensureResultFields() {
        const processDeploymentTopic = this.tabs[0];
        if (!this.processModels && this.result.topic === processDeploymentTopic) {
            this.processRepo.getProcessModels('', 9999, 0, 'date', 'asc').subscribe(value => this.processModels = value.result);
        }
        this.ensureFlowList();
    }

    get activeIndex(): number {
        return this.tabs.indexOf(this.result.topic);
    }

    set activeIndex(index: number) {
        this.result.topic = this.tabs[index];
        this.ensureResultFields();
    }

    /******************************
     *      Processes-Start
     ******************************/


    private inputsToProcessStartModel(inputs: SmartServiceTaskInputDescription[]): ProcessStartModel {
        const result: ProcessStartModel = {
            deployment_id: '',
            inputs: []
        };
        inputs?.forEach(value => {
            if (value.name === 'process_deployment_start.process_deployment_id') {
                result.deployment_id = value.value;
            }
            if (value.name.startsWith('process_deployment_start.input.')) {
                const key = value.name.replace('process_deployment_start.input.', '');
                result.inputs.push({ key, value: value.value });
            }
        });
        return result;
    }

    private processStartModelToInputs(processStart: ProcessStartModel): SmartServiceTaskInputDescription[] {
        const result: SmartServiceTaskInputDescription[] = [{
            name: 'process_deployment_start.process_deployment_id',
            value: processStart.deployment_id,
            type: 'text'
        }];
        processStart.inputs.forEach(value => {
            result.push({
                name: 'process_deployment_start.input.' + value.key,
                value: value.value,
                type: 'text'
            });
        });
        return result;
    }

    removeProcessStartInput(index: number) {
        this.processStart.inputs.splice(index, 1);
    }

    addProcessStartInput() {
        this.processStart.inputs.push({ key: '', value: '' });
    }

    generateProcessStartInputs(deploymentIdVariableName: string) {
        const modelId = this.availableProcessVariables.get('process_deployment_to_model')?.find(e => e.name === deploymentIdVariableName)?.value;
        if (modelId) {
            this.processDeployment.getStartParameter(modelId).subscribe(value => {
                this.processStart.inputs = [];
                value.forEach(param => {
                    this.processStart.inputs.push({ key: param.id, value: param.default });
                });
            });
        }
    }

    /******************************
     *      Processes
     ******************************/

    getAvailableProcessIotSelections(): { name: string; value: string }[] {
        const result: { name: string; value: string }[] = [];
        this.availableProcessVariables.get('iot_form_fields')?.forEach(field => {
            result.push({ name: field.label || field.name, value: '${' + field.name + '}' });
        });
        this.availableProcessVariables.get('import_selection')?.forEach(field => {
            result.push({ name: field.label || field.name, value: field.name });
        });
        return result;
    }

    ensureProcessTaskParameter(id: string) {
        this.result.inputs.forEach(e => this.knownInputValues.set(e.name, e));
        if (!this.selectedProcessModelPreparation || this.selectedProcessModelPreparation.id !== id) {
            this.processDeployment.getPreparedDeployments(id).subscribe(value => {
                if (value) {
                    this.selectedProcessModelPreparation = value;
                    this.result.inputs = [
                        this.knownInputValues.get('process_deployment.process_model_id') || { name: 'process_deployment.process_model_id', value: id, type: 'text' },
                        { name: 'process_deployment.name', value: this.selectedProcessModelPreparation.name, type: 'text' },
                        this.knownInputValues.get('process_deployment.module_data') || { name: 'process_deployment.module_data', value: '{}', type: 'text' },
                        this.knownInputValues.get(this.processFogFieldName) || { name: this.processFogFieldName, value: 'false', type: 'text' },
                        this.knownInputValues.get(this.processRestartFieldName) || { name: this.processRestartFieldName, value: 'false', type: 'text' },
                        this.knownInputValues.get(this.processNotifyFieldName) || { name: this.processNotifyFieldName, value: 'true', type: 'text' }
                    ];
                    const keep: string[] = [this.processRestartFieldName, this.processNotifyFieldName, this.processFogFieldName];
                    this.selectedProcessModelPreparation.start_parameter?.forEach(param => {
                        const selectionKey = 'process_deployment.start_parameter.default.' + param.id;
                        keep.push(selectionKey);
                        this.result.inputs.push(this.knownInputValues.get(selectionKey) || { name: selectionKey, value: param.default, type: 'text' });
                    });
                    const elementIds: string[] = [];
                    this.selectedProcessModelPreparation.elements?.forEach(element => {
                        elementIds.push(element.bpmn_id);
                        if (element.task) {
                            const selectionKey = 'process_deployment.' + element.bpmn_id + '.selection';
                            this.result.inputs.push(this.knownInputValues.get(selectionKey) || { name: selectionKey, value: '{}', type: 'text' });

                            for (const key in element.task.parameter) {
                                const value2 = element.task.parameter[key];
                                if (this.taskParameterShouldBeEditable(value2)) {
                                    const paramKey = 'process_deployment.' + element.bpmn_id + '.parameter.' + key;
                                    this.result.inputs.push(this.knownInputValues.get(paramKey) || { name: paramKey, value: value2, type: 'text' });
                                }
                            }
                        }
                        if (element.message_event) {
                            this.ensureFlowList();
                            const selectionKey = 'process_deployment.' + element.bpmn_id + '.selection';
                            this.result.inputs.push(this.knownInputValues.get(selectionKey) || { name: selectionKey, value: '{}', type: 'text' });
                            const eventFlowKey = 'process_deployment.' + element.bpmn_id + '.event.flow_id';
                            this.result.inputs.push(this.knownInputValues.get(eventFlowKey) || { name: eventFlowKey, value: '', type: 'text' });
                            const eventValueKey = 'process_deployment.' + element.bpmn_id + '.event.value';
                            this.result.inputs.push(this.knownInputValues.get(eventValueKey) || { name: eventValueKey, value: '', type: 'text' });
                            const eventMarshallerKey = 'process_deployment.' + element.bpmn_id + '.event.use_marshaller';
                            let useMarshaller = 'false';
                            if (element.message_event.use_marshaller) {
                                useMarshaller = 'true';
                            }
                            this.result.inputs.push(this.knownInputValues.get(eventMarshallerKey) || { name: eventMarshallerKey, value: useMarshaller, type: 'text' });
                        }
                        if (element.conditional_event) {
                            const selectionKey = 'process_deployment.' + element.bpmn_id + '.selection';
                            this.result.inputs.push(this.knownInputValues.get(selectionKey) || { name: selectionKey, value: '{}', type: 'text' });
                            if (element.conditional_event.variables) {

                                for (const key in element.conditional_event.variables) {
                                    const value2 = element.conditional_event.variables[key];
                                    const paramKey = 'process_deployment.' + element.bpmn_id + '.variables.' + key;
                                    this.result.inputs.push(this.knownInputValues.get(paramKey) || { name: paramKey, value: value2, type: 'text' });
                                }
                            }
                        }
                        if (element.time_event) {
                            const eventTimeKey = 'process_deployment.' + element.bpmn_id + '.time';
                            this.result.inputs.push(this.knownInputValues.get(eventTimeKey) || { name: eventTimeKey, value: element.time_event.time, type: 'text' });
                        }
                    });

                    // remove values of other/previous process-model selections
                    this.result.inputs = this.result.inputs.filter(input => {
                        if (!keep.includes(input.name) && input.name.startsWith('process_deployment.') && input.name.split('.').length >= 3) { // keep values of other workers/topics and general process_deployment values
                            return elementIds.some(knownId => input.name.startsWith('process_deployment.' + knownId));
                        }
                        return true;
                    });
                }
            });
        }
    }

    ensureFlowList() {
        if (!this.flows) {
            this.flowService.getFlows('', 9999, 0, 'name', 'asc').subscribe(flows => {
                this.flows = flows.flows;
                const currentFlowId = this.analyticsFlowId;
                if (currentFlowId) {
                    this.ensureAnalyticsFlowParameter(currentFlowId);
                }
            });
        }
    }

    get processTaskIds(): string[] {
        const resultSet = new Map<string, string>();
        this.result.inputs.forEach(input => {
            if (input.name.startsWith('process_deployment.') && !input.name.startsWith('process_deployment.on_incident.') && !input.name.startsWith('process_deployment.start_parameter.default.')) {
                const parts = input.name.split('.');
                if (parts.length > 2) {
                    resultSet.set(parts[1], parts[1]);
                }
            }
        });
        return Array.from(resultSet.keys());
    }

    getProcessTaskParameter(taskId: string): string[] {
        const result: string[] = [];
        const prefix = 'process_deployment.' + taskId + '.parameter.';
        this.result.inputs.forEach(input => {
            if (input.name.startsWith(prefix)) {
                result.push(input.name.slice(prefix.length));
            }
        });
        return result;
    }

    getProcessConditionalEventVariables(taskId: string): string[] {
        const result: string[] = [];
        const prefix = 'process_deployment.' + taskId + '.variables.';
        this.result.inputs.forEach(input => {
            if (input.name.startsWith(prefix)) {
                result.push(input.name.slice(prefix.length));
            }
        });
        return result;
    }

    processProcessModelIdFieldName = 'process_deployment.process_model_id';
    processProcessNameFieldName = 'process_deployment.name';
    get processProcessName(): string {
        this.getFieldValue(this.processProcessModelIdFieldName, 'text', ''); // ensure existence of process model id input
        return this.getFieldValue(this.processProcessNameFieldName, 'text', '');
    }

    set processProcessName(value: string) {
        this.setFieldValue(this.processProcessNameFieldName, 'text', value);
    }

    processFogFieldName = 'process_deployment.prefer_fog_deployment';
    get processFog(): string {
        return this.getFieldValue(this.processFogFieldName, 'text', 'false');
    }

    set processFog(value: string) {
        this.setFieldValue(this.processFogFieldName, 'text', value);
    }

    processRestartFieldName = 'process_deployment.on_incident.restart';
    get processRestart(): string {
        return this.getFieldValue(this.processRestartFieldName, 'text', 'false');
    }

    set processRestart(value: string) {
        this.setFieldValue(this.processRestartFieldName, 'text', value);
    }

    processNotifyFieldName = 'process_deployment.on_incident.notify';
    get processNotify(): string {
        return this.getFieldValue(this.processNotifyFieldName, 'text', 'true');
    }

    set processNotify(value: string) {
        this.setFieldValue(this.processNotifyFieldName, 'text', value);
    }

    processStartParamPrefix = 'process_deployment.start_parameter.default.';
    isProcessStartParam(input: SmartServiceTaskInputDescription): boolean {
        return input.name.startsWith(this.processStartParamPrefix);
    }

    getProcessStartParameterName(input: SmartServiceTaskInputDescription): string {
        if (input.name.startsWith(this.processStartParamPrefix)) {
            return input.name.slice(this.processStartParamPrefix.length);
        }
        return '';
    }

    processTaskMatches(input: SmartServiceTaskInputDescription, taskId: string, suffix: string): boolean {
        return input.name === 'process_deployment.' + taskId + '.' + suffix;
    }

    getProcessTaskName(taskId: string): string {
        return this.selectedProcessModelPreparation?.elements?.find(e => e.bpmn_id === taskId)?.name || taskId;
    }

    generateInputForProcessElement(input: SmartServiceTaskInputDescription, taskId: string) {
        const element = this.selectedProcessModelPreparation?.elements.find(element2 => element2.bpmn_id === taskId);
        const criteria = element?.task?.selection.filter_criteria ||
            element?.message_event?.selection.filter_criteria ||
            element?.conditional_event?.selection.filter_criteria;
        if (criteria) {
            const current = this.availableProcessVariables.get('iot_form_fields') || [];
            const interaction = element?.task ? 'request' : 'event';
            const newField: AbstractSmartServiceInput = {
                id: this.smartServiceBpmnElement.id + '_' + taskId + '_selection',
                type: 'string',
                label: 'generated for ' + element?.name,
                order: 0,
                multiple: false,
                auto_select_all: false,
                optional: false,
                iot_selectors: ['device', 'group', 'import', 'device_service_group'],
                criteria_list: [storableCriteria({
                    aspect_id: criteria.aspect_id || undefined,
                    aspect_ids: criteria.aspect_ids,
                    device_class_id: criteria.device_class_id || undefined,
                    function_id: criteria.function_id || undefined,
                    interaction
                })],
            };

            if (!this.smartServiceInputs.find(v => v.id === newField.id) && !current.find(v => v.name === newField.id)) {
                this.smartServiceInputs.push(newField);
                current.push({ name: newField.id, value: '', label: newField.label });
                this.availableProcessVariables.set('iot_form_fields', current);
                this.availableProcessIotSelections = this.getAvailableProcessIotSelections();
                input.value = this.availableProcessIotSelections[this.availableProcessIotSelections.length - 1].value;
            }

        }
    }

    taskParameterShouldBeEditable(value: unknown): boolean {
        const s = value as string;
        const matches = s.match(/^\${.*}$/);
        return !(matches && matches.length);
    }

    /******************************
     *      Analytics
     ******************************/

    analyticsKeyFieldName = 'analytics.key';
    get analyticsKeyId(): string {
        return this.getFieldValue(this.analyticsKeyFieldName, 'text', '');
    }

    set analyticsKeyId(value: string) {
        this.setFieldValue(this.analyticsKeyFieldName, 'text', value);
    }

    analyticsFlowIdFieldName = 'analytics.flow_id';
    get analyticsFlowId(): string {
        return this.getFieldValue(this.analyticsFlowIdFieldName, 'text', '');
    }

    set analyticsFlowId(value: string) {
        this.setFieldValue(this.analyticsFlowIdFieldName, 'text', value);
        const flow = this.flows?.find(e => e._id === value);
        const flowName = flow?.name;
        if (flowName) {
            this.analyticsPipelineName = flowName;
        }
        this.ensureAnalyticsFlowParameter(value);
    }

    analyticsPipelineNameFieldName = 'analytics.name';
    get analyticsPipelineName(): string {
        return this.getFieldValue(this.analyticsPipelineNameFieldName, 'text', '');
    }

    set analyticsPipelineName(value: string) {
        this.setFieldValue(this.analyticsPipelineNameFieldName, 'text', value);
    }

    analyticsPipelineDescFieldName = 'analytics.desc';
    get analyticsPipelineDesc(): string {
        return this.getFieldValue(this.analyticsPipelineDescFieldName, 'text', '');
    }

    set analyticsPipelineDesc(value: string) {
        this.setFieldValue(this.analyticsPipelineDescFieldName, 'text', value);
    }

    analyticsMergeStrategyFieldName = 'analytics.merge_strategy';
    get analyticsMergeStrategy(): string {
        return this.getFieldValue(this.analyticsMergeStrategyFieldName, 'text', 'inner');
    }

    set analyticsMergeStrategy(value: string) {
        this.setFieldValue(this.analyticsMergeStrategyFieldName, 'text', value);
    }

    analyticsWindowTimeFieldName = 'analytics.window_time';
    get analyticsWindowTime(): number {
        const temp = parseInt(this.getFieldValue(this.analyticsWindowTimeFieldName, 'text', '30'), 10);
        if (Number.isNaN(temp)) {
            return 30;
        }
        if (Number.isInteger(temp)) {
            return temp;
        }
        console.error('WARNING: unexpected state in analyticsWindowTime()');

        console.trace();
        return 30;
    }

    set analyticsWindowTime(value: number) {
        this.setFieldValue(this.analyticsWindowTimeFieldName, 'text', value.toString());
    }

    analyticsConsumeAllMessagesFieldName = 'analytics.consume_all_messages';
    get analyticsConsumeAllMessages(): string {
        return this.getFieldValue(this.analyticsConsumeAllMessagesFieldName, 'text', 'false');
    }

    set analyticsConsumeAllMessages(value: string) {
        this.setFieldValue(this.analyticsConsumeAllMessagesFieldName, 'text', value);
    }

    getAnalyticsFlowImage(svgIn: string | SafeHtml, inputId: string): SafeHtml {
        if (!svgIn) {
            return '';
        }
        if (typeof svgIn !== 'string') {
            return '';
        }
        const parser = new DOMParser();
        const svg = parser.parseFromString(svgIn, 'image/svg+xml').getElementsByTagName('svg')[0];

        const elements = svg.getElementsByClassName('joint-cell') as any;
        for (const element of elements) {
            if (element.attributes['model-id'].value === inputId) {
                for (const node of element.childNodes) {
                    if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                        node.attributes['stroke'].value = 'red';
                    }
                }
            }
        }
        return this.sanitizer.bypassSecurityTrustHtml(new XMLSerializer().serializeToString(svg));
    }

    analyticsSvgSelectOperatorGetEventNodeId(node: any): string {
        if (!node) {
            return '';
        }
        if (
            node?.attributes &&
            node?.attributes['data-type'] !== undefined &&
            node?.attributes['data-type'].value === 'senergy.NodeElement'
        ) {
            return node.attributes['model-id'].value;
        } else {
            return this.analyticsSvgSelectOperatorGetEventNodeId(node.parentNode);
        }
    }

    analyticsSvgSelectOperator($event: MouseEvent) {
        const id = this.analyticsSvgSelectOperatorGetEventNodeId($event.target);
        if (id) {
            this.currentFlowInputId = id;
        }
    }

    private ensureAnalyticsFlowParameter(flowId: string) {
        this.flowService.getFlow(flowId).subscribe(flow => {
            this.flowSvg = flow?.image || '';
        });
        const f = (inputs: ParseModel[]) => {
            this.currentParsedFlows = inputs;
            this.result.inputs.forEach(e => this.knownInputValues.set(e.name, e));
            this.result.inputs = [
                this.knownInputValues.get(this.analyticsFlowIdFieldName) || { name: this.analyticsFlowIdFieldName, value: flowId, type: 'text' },
                this.knownInputValues.get(this.analyticsPipelineNameFieldName) || { name: this.analyticsPipelineNameFieldName, value: '', type: 'text' },
                this.knownInputValues.get(this.analyticsPipelineDescFieldName) || { name: this.analyticsPipelineDescFieldName, value: '', type: 'text' },
                this.knownInputValues.get(this.analyticsWindowTimeFieldName) || { name: this.analyticsWindowTimeFieldName, value: '30', type: 'text' },
                this.knownInputValues.get(this.analyticsMergeStrategyFieldName) || { name: this.analyticsMergeStrategyFieldName, value: 'inner', type: 'text' },
                this.knownInputValues.get(this.analyticsConsumeAllMessagesFieldName) || { name: this.analyticsConsumeAllMessagesFieldName, value: 'false', type: 'text' },
            ];
            inputs.forEach(input => {
                const persistDataKey = 'analytics.persistData.' + input.id;
                this.result.inputs.push(this.knownInputValues.get(persistDataKey) || { name: persistDataKey, value: 'false', type: 'text' });
                input.inPorts?.forEach(port => {
                    const selectionKey = 'analytics.selection.' + input.id + '.' + port;
                    this.result.inputs.push(this.knownInputValues.get(selectionKey) || { name: selectionKey, value: '{}', type: 'text' });
                    const criteriaKey = 'analytics.criteria.' + input.id + '.' + port;
                    this.result.inputs.push(this.knownInputValues.get(criteriaKey) || { name: criteriaKey, value: '[]', type: 'text' });
                    const serviceCriteriaKey = 'analytics.service_criteria.' + input.id + '.' + port;
                    this.result.inputs.push(this.knownInputValues.get(serviceCriteriaKey) || { name: serviceCriteriaKey, value: '[]', type: 'text' });
                });
                input.config?.forEach(config => {
                    const configKey = 'analytics.conf.' + input.id + '.' + config.name;
                    this.result.inputs.push(this.knownInputValues.get(configKey) || { name: configKey, value: '', type: 'text' });
                });
            });
        };
        if (this.parsedFlows.has(flowId)) {
            const parsed = this.parsedFlows.get(flowId);
            if (parsed) {
                f(parsed);
            }
        } else {
            this.flowParser.getInputs(flowId).subscribe(value => {
                this.parsedFlows.set(flowId, value);
                f(value);
            });
        }
    }

    analyticsGetImportIotEntityTemplate(variable: BpmnParameterWithLabel) {
        return '{"import_selection": {"id":"${' + variable.name + '}", "path": ""}}';
    }

    analyticsInputMatchesIotSelection(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name === 'analytics.selection.' + flowInputId + '.' + port;
    }

    analyticsInputMatchesIotCriteria(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name === 'analytics.criteria.' + flowInputId + '.' + port;
    }

    analyticsInputMatchesIotServiceCriteria(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name === 'analytics.service_criteria.' + flowInputId + '.' + port;
    }

    analyticsInputMatchesIotConfig(input: SmartServiceTaskInputDescription, flowInputId: string, configName: string): boolean {
        return input.name === 'analytics.conf.' + flowInputId + '.' + configName;
    }

    analyticsInputMatchesPersistDataField(input: SmartServiceTaskInputDescription, flowInputId: string): boolean {
        return input.name === 'analytics.persistData.' + flowInputId;
    }

    getAvailableAnalyticsIotSelections(): { name: string; value: string }[] {
        const result: { name: string; value: string }[] = [];
        this.availableProcessVariables.get('iot_form_fields')?.forEach(field => {
            result.push({ name: field.label || field.name, value: '${' + field.name + '}' });
        });
        this.availableProcessVariables.get('import_selection')?.forEach(field => {
            result.push({ name: field.label || field.name, value: field.name });
        });
        return result;
    }

    /******************************
     *      Export
     ******************************/

    parseExport(str: string): ServingRequest {
        return JSON.parse(str);
    }

    stringifyExport(exp: ServingRequest | undefined | null) {
        if (!exp) {
            exp = this.parseExport('{}');
        }
        return JSON.stringify(exp);
    }

    /******************************
     *      Import
     ******************************/

    parseImport(str: string): ImportInstancesModel {
        return JSON.parse(str);
    }

    stringifyImport(value: ImportInstancesModel | undefined | null) {
        if (!value) {
            value = this.parseImport('{}');
        }
        return JSON.stringify(value);
    }

    setImportRequestConfigValueTypes(importType: ImportTypeModel) {
        importType.configs.forEach(value => {
            this.importRequestConfigValueType.set(value.name, value.type);
        });
    }

    handleUnknownImportConfigAsJsonString() {
        this.importRequest.configs = this.importRequest.configs?.map(value => {
            if (this.isUnknownImportConfig(value)) {
                return { name: value.name, value: JSON.stringify(value.value) } as ImportInstanceConfigModel;
            } else {
                return { name: value.name, value: value.value } as ImportInstanceConfigModel;
            }
        });
    }

    handleUnknownImportConfigAsJsonObject() {
        this.importRequest.configs = this.importRequest.configs?.map(value => {
            if (this.isUnknownImportConfig(value) && (typeof value.value === 'string')) {
                let newValue = value.value;
                try {
                    newValue = JSON.parse(newValue);
                } catch (_) { }
                return { name: value.name, value: newValue } as ImportInstanceConfigModel;
            } else {
                return { name: value.name, value: value.value } as ImportInstanceConfigModel;
            }
        });
    }

    generateImportFields(importType: ImportTypeModel) {
        this.importRequest.image = importType.image;
        this.importRequest.restart = importType.default_restart;
        this.importRequest.configs = importType.configs.map(value => ({ name: value.name, value: value.default_value } as ImportInstanceConfigModel));
    }

    loadImportType(updateConfigs: boolean) {
        if (this.importRequest.import_type_id) {
            const importType: ImportTypeModel | undefined = this.knownImportTypes.get(this.importRequest.import_type_id);
            if (importType) {
                this.setImportRequestConfigValueTypes(importType);
                if (updateConfigs) {
                    this.generateImportFields(importType);
                }
                this.handleUnknownImportConfigAsJsonString();
                this.loadImportConfigOverwrites(importType, !updateConfigs);
            } else {
                this.importTypeService.getImportType(this.importRequest.import_type_id).subscribe(value => {
                    this.knownImportTypes.set(this.importRequest.import_type_id, value);
                    this.setImportRequestConfigValueTypes(value);
                    if (updateConfigs) {
                        this.generateImportFields(value);
                    }
                    this.handleUnknownImportConfigAsJsonString();
                    this.loadImportConfigOverwrites(value, !updateConfigs);
                });
            }
        }
    }

    private loadImportConfigOverwrites(importType: ImportTypeModel, isInit: boolean) {
        this.importOverwrites = [];
        const known: Map<string, string> = new Map();
        if (isInit) {
            this.result.inputs.filter(value => value.name.startsWith('import.config.json_overwrite.')).forEach(value => {
                known.set(value.name.replace('import.config.json_overwrite.', ''), value.value);
            });
        }
        this.importOverwrites = importType.configs.map(value => ({ config_name: value.name, json_value: known.get(value.name) || '' }));

    }

    set importTypeId(id: string) {
        this.importRequest.import_type_id = id;
        this.loadImportType(true);
    }

    get importTypeId(): string {
        return this.importRequest.import_type_id;
    }

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';

    isTextImportConfigType(type: string | null | undefined): boolean {
        return type === this.STRING || type === 'text';
    }

    isTextImportConfig(config: ImportInstanceConfigModel): boolean {
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isTextImportConfigType(type);
    }

    isNumberImportConfigType(type: string | null | undefined): boolean {
        return type === this.INTEGER || type === this.FLOAT || type === 'number';
    }

    isNumberImportConfig(config: ImportInstanceConfigModel): boolean {
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isNumberImportConfigType(type);
    }

    isBooleanImportConfigType(type: string | null | undefined): boolean {
        return type === this.BOOLEAN || type === 'boolean';
    }


    isBooleanImportConfig(config: ImportInstanceConfigModel): boolean {
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isBooleanImportConfigType(type);
    }

    isUnknownImportConfigType(type: string | null | undefined): boolean {
        return !(
            this.isTextImportConfigType(type) ||
            this.isNumberImportConfigType(type) ||
            this.isBooleanImportConfigType(type));
    }

    isUnknownImportConfig(config: ImportInstanceConfigModel): boolean {
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isUnknownImportConfigType(type);
    }


    /******************************
     *      Util
     ******************************/

    getFieldValue(name: string, type: string, defaultValue: string): string {
        if (!this.result.inputs) {
            this.result.inputs = [];
        }
        const result = this.result.inputs.find(element => element.name === name);
        if (result) {
            return result.value;
        } else {
            this.result.inputs.push({ name, value: defaultValue, type });
            return defaultValue;
        }
    }

    setFieldValue(name: string, type: string, value: string) {
        let found = false;
        this.result.inputs = this.result.inputs.map(element => {
            if (element.name === name) {
                found = true;
                element.value = value;
            }
            return element;
        });
        if (!found) {
            this.result.inputs.push({ name, value, type });
        }
    }

    getIncomingOutputs(element: BpmnElement, done: BpmnElement[] = []): Map<string, BpmnParameterWithLabel[]> {
        const result: Map<string, BpmnParameter[]> = new Map<string, BpmnParameterWithLabel[]>();
        if (done.indexOf(element) !== -1) {
            return result;
        }

        const add = (key: string, value: BpmnParameterWithLabel[], element2?: any) => {
            if (element2 && element2.name) {
                value = value.map(e => {
                    if (!e.label) {
                        e.label = element2.name + ': ' + e.name;
                    }
                    return e;
                });
            }
            let temp = result.get(key) || [];
            temp = temp.concat(value);
            result.set(key, temp);
        };

        done.push(element);
        if (element.incoming) {
            for (let index = 0; index < element.incoming.length; index++) {
                const incoming = element.incoming[index].source;
                if (
                    incoming.businessObject.extensionElements &&
                    incoming.businessObject.extensionElements.values &&
                    incoming.businessObject.extensionElements.values[0] &&
                    incoming.businessObject.extensionElements.values[0].outputParameters
                ) {
                    if (incoming.businessObject.topic) {
                        const topic = incoming.businessObject.topic;
                        add(topic, incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                        if (topic === 'analytics' && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                            const flowId = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'analytics.flow_id')?.value;
                            add('flow_selection_raw', [{
                                name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                                label: (incoming.businessObject as any).name,
                                value: flowId || ''
                            }]);
                        }
                        if (topic === 'import' && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                            try {
                                const importRequestStr = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'import.request')?.value;
                                if (importRequestStr) {
                                    const importRequest = JSON.parse(importRequestStr);
                                    if (importRequest.import_type_id) {
                                        const importType = importRequest.import_type_id;
                                        add('import_selection_raw', [{
                                            name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                                            label: (incoming.businessObject as any).name,
                                            value: importType || ''
                                        }]);
                                    }
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }
                        if (topic === 'process_deployment'
                            && incoming.businessObject.extensionElements.values[0].inputParameters?.length
                            && incoming.businessObject.extensionElements.values[0].outputParameters?.length
                        ) {
                            const processModelId = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'process_deployment.process_model_id')?.value;
                            const processDeploymentIdVariable = incoming.businessObject.extensionElements.values[0].outputParameters?.find(value => value.name.endsWith('_process_deployment_id'))?.name;
                            if (processModelId && processDeploymentIdVariable && processModelId.match(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/)) {
                                add('process_deployment_to_model', [{
                                    name: processDeploymentIdVariable,
                                    label: '',
                                    value: processModelId
                                }]);
                            }
                        }
                        if (topic === 'device_repository'
                            && incoming.businessObject.extensionElements.values[0].inputParameters?.length
                            && incoming.businessObject.extensionElements.values[0].outputParameters?.length
                        ) {
                            const deviceGroupSelectionVariable = incoming.businessObject.extensionElements.values[0].outputParameters?.find(value => value.name.endsWith('_device_group_selection'))?.name;
                            if (deviceGroupSelectionVariable) {
                                add('iot_form_fields', [{ name: deviceGroupSelectionVariable, label: '', value: '' }]);
                                add('group_iot_form_fields', [{ name: deviceGroupSelectionVariable, label: '', value: '' }]);
                            }
                        }
                    } else {
                        add('uncategorized', incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    }
                }
                if (
                    incoming.businessObject.$type === 'bpmn:StartEvent' &&
                    incoming.businessObject.extensionElements?.values &&
                    incoming.businessObject.extensionElements.values[0] &&
                    incoming.businessObject.extensionElements.values[0].$type === 'camunda:FormData'
                ) {
                    const formFields = incoming.businessObject.extensionElements.values[0].fields;
                    formFields?.forEach(field => {
                        add('form_fields', [{ name: field.id, label: field.label, value: '' }]);
                        const iotProperty = field.properties?.values?.find(property => property.id === 'iot');
                        if (iotProperty) {
                            add('iot_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                            iotProperty.value.split(',').forEach(iotKind => {
                                add(iotKind.trim() + '_iot_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                            });
                        } else {
                            add('value_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                        }
                    });
                }
                if (
                    incoming.businessObject.$type === 'bpmn:StartEvent' &&
                    incoming.businessObject.eventDefinitions
                ) {
                    const defaultStartEvent = this.getDefaultStartEvent(incoming.businessObject?.$parent?.flowElements);
                    if (defaultStartEvent) {
                        const sub2 = this.getIncomingOutputs({ id: '', incoming: [{ source: { businessObject: defaultStartEvent } } as BpmnElementRef] } as BpmnElement, done);
                        sub2.forEach((value, topic) => {
                            add(topic, value);
                        });
                    }
                }
                const sub = this.getIncomingOutputs(incoming, done);
                sub.forEach((value, topic) => {
                    add(topic, value);
                });
            }
        }

        return result;
    }

    private getDefaultStartEvent(elements: BpmnBusinessObject[] | undefined): BpmnBusinessObject | undefined {
        return elements?.find(e => e.$type === 'bpmn:StartEvent' && !e?.eventDefinitions);
    }

    private addPipelineWithOperatorIdOptionsToAvailableVariables() {
        if (!this.availableProcessVariables.get('flow_selection')) {
            this.availableProcessVariables.set('flow_selection', []);
        }
        const flowSelectionRaw = this.availableProcessVariables.get('flow_selection_raw')?.filter(value => value.value);
        flowSelectionRaw?.forEach(flowSelection => {
            this.flowParser.getInputs(flowSelection.value).subscribe(fields => {
                fields?.forEach(value => {
                    const pipelineFlowSelection = '${' + flowSelection.name + '}:' + value.id;
                    const topic = 'analytics-' + value.name;
                    this.availableProcessVariables.get('flow_selection')?.push({ name: pipelineFlowSelection, label: flowSelection.label + ': ' + value.name, value: topic });
                });

            });
        });
    }

    private addImportIotEntityWithPathToAvailableVariables() {
        if (!this.availableProcessVariables.get('import_selection')) {
            this.availableProcessVariables.set('import_selection', []);
        }
        const importSelectionRaw = this.availableProcessVariables.get('import_selection_raw')?.filter(value => value.value);
        importSelectionRaw?.forEach(importSelection => {
            this.importTypeService.getImportType(importSelection.value).subscribe(importType => {
                this.getImportTypeOutputPathsFormSubElements(importType.output.sub_content_variables).forEach(path => {
                    const selection = '{"import_selection": {"id":"${' + importSelection.name + '}", "path": "' + path.path + '", "characteristic_id": "' + path.characteristic + '"}}';
                    this.availableProcessVariables.get('import_selection')?.push({ name: selection, label: importSelection.label + ': ' + path.path, value: '' });
                });
                this.availableAnalyticsIotSelections = this.getAvailableAnalyticsIotSelections();
                this.availableProcessIotSelections = this.getAvailableProcessIotSelections();
            });
        });
    }

    private getImportTypeOutputPathsFormSubElements(importOutputs: ImportTypeContentVariableModel[] | null, current?: string[]): { path: string; characteristic: string }[] {
        if (!current) {
            current = [];
        }
        if (!importOutputs || importOutputs.length === 0) {
            return [{ path: current.join('.'), characteristic: '' }];
        } else {
            let result: { path: string; characteristic: string }[] = [];
            importOutputs.forEach(sub => {
                result = result.concat(this.getImportTypeOutputPaths(sub, JSON.parse(JSON.stringify(current))));
            });
            return result;
        }
    }

    private getImportTypeOutputPaths(importOutputs: ImportTypeContentVariableModel, current?: string[]): { path: string; characteristic: string }[] {
        if (!current) {
            current = [];
        }
        current.push(importOutputs.name);
        if (!importOutputs.sub_content_variables || importOutputs.sub_content_variables.length === 0) {
            return [{ path: current.join('.'), characteristic: importOutputs.characteristic_id || '' }];
        } else {
            return this.getImportTypeOutputPathsFormSubElements(importOutputs.sub_content_variables, current);
        }
    }

    appendParam(value: string, param: BpmnParameterWithLabel, element: HTMLInputElement): string {
        const placeholder = '${' + param.name + '}';
        let position = 0;
        if (!value) {
            return placeholder;
        }
        if (element.selectionStart) {
            position = element.selectionStart;
            return [value.slice(0, position), placeholder, value.slice(position)].join('');
        } else {
            return value + placeholder;
        }
    }

    deviceRepositoryCreateDeviceGroupFieldKey = 'device_repository.create_device_group';
    deviceRepositoryNameFieldKey = 'device_repository.name';
    deviceRepositoryKeyFieldKey = 'device_repository.key';
    deviceRepositoryWaitFieldKey = 'device_repository.wait';

    private initDeviceRepositoryWorkerInfo(inputs: SmartServiceTaskInputDescription[]) {
        inputs.forEach(input => {
            if (input.name === this.deviceRepositoryNameFieldKey) {
                this.deviceRepositoryWorkerInfo.name = input.value;
            }
            if (input.name === this.deviceRepositoryCreateDeviceGroupFieldKey) {
                this.deviceRepositoryWorkerInfo.create_device_group.ids = input.value;
                this.deviceRepositoryWorkerInfo.operation = 'create_device_group';
            }
            if (input.name === this.deviceRepositoryKeyFieldKey) {
                this.deviceRepositoryWorkerInfo.key = input.value;
            }
        });
        if (!this.deviceRepositoryWorkerInfo.operation) {
            this.deviceRepositoryWorkerInfo.operation = 'create_device_group';
        }
    }

    private deviceRepositoryWorkerInfoToInputs(): SmartServiceTaskInputDescription[] {
        const result: SmartServiceTaskInputDescription[] = [];
        switch (this.deviceRepositoryWorkerInfo.operation) {
            case 'create_device_group': {
                result.push({ name: this.deviceRepositoryCreateDeviceGroupFieldKey, type: 'text', value: this.deviceRepositoryWorkerInfo.create_device_group.ids });
                result.push({ name: this.deviceRepositoryNameFieldKey, type: 'text', value: this.deviceRepositoryWorkerInfo.name });
                result.push({ name: this.deviceRepositoryWaitFieldKey, type: 'text', value: 'true' });
                if (this.deviceRepositoryWorkerInfo.key) {
                    result.push({ name: this.deviceRepositoryKeyFieldKey, type: 'text', value: this.deviceRepositoryWorkerInfo.key });
                }
                break;
            }
        }
        return result;
    }


    functions: (FunctionsPermSearchModel | { id?: string; name: string })[] = [];
    deviceClasses: (DeviceTypeDeviceClassModel | { id?: string; name: string })[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    aspectNodes: DeviceTypeAspectNodeModel[] = [];
    private aspectNames = new Map<string, string>();
    private classified = new Map<string, AspectClassification>();

    removeCriteria(list: SmartServiceCriteria[], index: number): SmartServiceCriteria[] {
        list.splice(index, 1);
        return list;
    }

    addCriteria(list: SmartServiceCriteria[]): SmartServiceCriteria[] {
        list.push({ interaction: 'request', aspect_id: '', device_class_id: '', function_id: '' });
        return list;
    }

    setAspects(criteria: SmartServiceCriteria, aspectIds: string[] | null) {
        setCriteriaAspects(criteria, aspectIds);
    }

    criteriaToLabel(criteria: SmartServiceCriteria): string {
        let functionName = '';
        if (criteria.function_id) {
            functionName = this.functions.find(v => v.id === criteria.function_id)?.name || criteria.function_id;
        }
        let deviceClassName = '';
        if (criteria.device_class_id) {
            deviceClassName = this.deviceClasses.find(v => v.id === criteria.device_class_id)?.name || criteria.device_class_id;
        }
        const aspectName = criteriaAspectsLabel(criteria, this.aspectNames);

        const parts: string[] = [];
        if (criteria.interaction) {
            parts.push(criteria.interaction);
        }
        if (aspectName) {
            parts.push(aspectName);
        }
        if (deviceClassName) {
            parts.push(deviceClassName);
        }
        if (functionName) {
            parts.push(functionName);
        }
        return parts.join(' | ');
    }

    watcherMaintenanceProducerFieldKey = 'watcher.maintenance_procedure';
    watcherWatchIntervalFieldKey = 'watcher.watch_interval';
    watcherHashTypeFieldKey = 'watcher.hash_type';
    watcherDevicesByCriteriaFieldKey = 'watcher.watch_devices_by_criteria';
    watcherRequestFieldKey = 'watcher.watch_request';
    watcherMaintenanceProducerInputsPrefix = 'watcher.maintenance_procedure_inputs.';

    private initWatcherInfo(inputs: SmartServiceTaskInputDescription[]) {
        inputs.forEach(input => {
            if (input.name === this.watcherMaintenanceProducerFieldKey) {
                this.watcherWorkerInfo.maintenance_producer = input.value;
            }
            if (input.name === this.watcherWatchIntervalFieldKey) {
                this.watcherWorkerInfo.interval = input.value;
            }
            if (input.name === this.watcherHashTypeFieldKey) {
                this.watcherWorkerInfo.hash_type = input.value;
            }
            if (input.name === this.watcherDevicesByCriteriaFieldKey) {
                const criteria = JSON.parse(input.value);
                this.watcherWorkerInfo.devices_by_criteria.criteria = Array.isArray(criteria) ? criteria.map(editableCriteria) : criteria;
                this.watcherWorkerInfo.operation = 'devices_by_criteria';
            }
            if (input.name.startsWith(this.watcherMaintenanceProducerInputsPrefix)) {
                if (!this.watcherWorkerInfo.maintenance_procedure_inputs) {
                    this.watcherWorkerInfo.maintenance_procedure_inputs = [];
                }
                this.watcherWorkerInfo.maintenance_procedure_inputs.push({
                    key: input.name.slice(this.watcherMaintenanceProducerInputsPrefix.length),
                    value: input.value
                });
            }
            if (input.name === this.watcherRequestFieldKey) {
                this.watcherWorkerInfo.request = JSON.parse(input.value);
                if (!this.watcherWorkerInfo.request.body) {
                    this.watcherWorkerInfo.request.body = '';
                }
                this.watcherWorkerInfo.operation = 'watch_request';
            }
        });
        if (!this.watcherWorkerInfo.operation) {
            this.deviceRepositoryWorkerInfo.operation = 'devices_by_criteria';
        }
    }

    private watcherWorkerInfoToInputs(): SmartServiceTaskInputDescription[] {
        const result: SmartServiceTaskInputDescription[] = [];
        result.push({ name: this.watcherMaintenanceProducerFieldKey, type: 'text', value: this.watcherWorkerInfo.maintenance_producer });
        result.push({ name: this.watcherWatchIntervalFieldKey, type: 'text', value: this.watcherWorkerInfo.interval });
        result.push({ name: this.watcherHashTypeFieldKey, type: 'text', value: this.watcherWorkerInfo.hash_type });
        if (this.watcherWorkerInfo.maintenance_procedure_inputs) {
            this.watcherWorkerInfo.maintenance_procedure_inputs.forEach((v) => {
                result.push({ name: this.watcherMaintenanceProducerInputsPrefix + v.key, type: 'text', value: v.value });
            });
        }
        switch (this.watcherWorkerInfo.operation) {
            case 'devices_by_criteria': {
                result.push({ name: this.watcherDevicesByCriteriaFieldKey, type: 'text', value: JSON.stringify(this.storableWatcherCriteria()) });
                break;
            }
            case 'watch_request': {
                const req = this.watcherWorkerInfo.request;
                if (req.body === '') {
                    req.body = undefined;
                }
                result.push({ name: this.watcherRequestFieldKey, type: 'text', value: JSON.stringify(req) });
                break;
            }
        }
        return result;
    }

    private storableWatcherCriteria(): unknown {
        const criteria = this.watcherWorkerInfo.devices_by_criteria.criteria;
        return Array.isArray(criteria) ? criteria.map(storableCriteria) : criteria;
    }

    watcherWorkerInfoRequestHeaderValue = '';
    get watcherWorkerInfoRequestHeader(): string {
        if (!this.watcherWorkerInfoRequestHeaderValue) {
            this.watcherWorkerInfoRequestHeaderValue = JSON.stringify(this.watcherWorkerInfo.request.header);
        }
        return this.watcherWorkerInfoRequestHeaderValue;
    }

    set watcherWorkerInfoRequestHeader(str: string) {
        let temp = this.watcherWorkerInfo.request.header;
        try {
            temp = JSON.parse(str);
            this.watcherWorkerInfo.request.header = temp;
        } catch (_) { }
    }

    private getModuleDataFromInputs(inputs: SmartServiceTaskInputDescription[]): string {
        return this.getChunkedDataFromInputs('info.module_data', inputs, '{\n\n}');
    }

    private getChunkedDataFromInputs(inputNamePrefix: string, inputs: SmartServiceTaskInputDescription[], defaultValue: string): string {
        return inputs.filter(value => value.name.startsWith(inputNamePrefix))
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map(value => value.value)
            .join('') || defaultValue;
    }

    private getModuleDataInputs(infoModuleData: string): SmartServiceTaskInputDescription[] {
        return this.getChunkedInputs('info.module_data', infoModuleData);
    }

    private getChunkedInputs(inputNamePrefix: string, value: string): SmartServiceTaskInputDescription[] {
        const result = [] as SmartServiceTaskInputDescription[];
        const chunks = this.chunkString(value, 1000);
        const size = chunks.length.toString().length + 1;
        chunks.forEach((value2: string, i: number) => {
            let name = inputNamePrefix;
            if (i > 0) {
                name = name + '_' + this.padNumber(i, size);
            }
            result.push({ name, type: 'text', value: value2 });
        });
        return result;
    }

    private chunkString(str: string, length: number): string[] {
        return str.match(new RegExp('[^]{1,' + length + '}', 'g')) || [];
    }

    padNumber(num: number, size: number): string {
        let s = num + '';
        while (s.length < size) {
            s = '0' + s;
        }
        return s;
    }

    hasAspectClassCollision(criteria: SmartServiceCriteria): boolean {
        return criteriaHasAspectClassCollision(criteria, this.classified);
    }

    /** Criteria of an analytics input are stored as JSON text; text that is no list holds no criteria. */
    private isAnalyticsCriteriaInput(input: SmartServiceTaskInputDescription): boolean {
        return input.name.startsWith('analytics.criteria.') || input.name.startsWith('analytics.service_criteria.');
    }

    private analyticsCriteriaInputHasCollision(input: SmartServiceTaskInputDescription): boolean {
        try {
            return criteriaListHasAspectClassCollision(JSON.parse(input.value), this.classified);
        } catch (_) {
            return false;
        }
    }

    /** Only the criteria the topic writes count: the watcher's own, or those of the analytics inputs (stored as JSON text). */
    private hasAspectClassCollisionInTopic(): boolean {
        switch (this.result.topic) {
            case 'watcher':
                return this.watcherWorkerInfo.operation === 'devices_by_criteria'
                    && criteriaListHasAspectClassCollision(this.watcherWorkerInfo.devices_by_criteria.criteria, this.classified);
            case 'analytics':
                return this.result.inputs
                    .filter(input => this.isAnalyticsCriteriaInput(input))
                    .some(input => this.analyticsCriteriaInputHasCollision(input));
            default:
                return false;
        }
    }

    /** For the header of a collapsed operator panel: whether any criteria of its in-ports collides. */
    analyticsOperatorHasAspectClassCollision(flowInput: ParseModel): boolean {
        return (flowInput.inPorts || []).some(port => this.result.inputs.some(input =>
            (this.analyticsInputMatchesIotCriteria(input, flowInput.id, port) || this.analyticsInputMatchesIotServiceCriteria(input, flowInput.id, port))
            && this.analyticsCriteriaInputHasCollision(input)));
    }

    /** Names where Save is blocked by a collision, so the reason is visible without opening any panel; empty if there is none. */
    aspectClassCollisionHint(): string {
        if (!this.hasAspectClassCollisionInTopic()) {
            return '';
        }
        const prefix = 'Save is disabled, aspect class collision in ';
        if (this.result.topic === 'watcher') {
            return prefix + 'the watcher criteria';
        }
        const operators = this.currentParsedFlows.filter(flowInput => this.analyticsOperatorHasAspectClassCollision(flowInput));
        if (operators.length === 0) {
            return prefix + 'the analytics criteria';
        }
        return prefix + (operators.length > 1 ? 'operators ' : 'operator ') + operators.map(flowInput => flowInput.name).join(', ');
    }

    isInvalid(): boolean {
        if (this.hasAspectClassCollisionInTopic()) {
            return true;
        }
        switch (this.result.topic) {
            case 'export':
                if (!this.exportRequest.Name) {
                    return true;
                }
                if (this.exportRequest.FilterType === 'deviceId' && !this.exportRequest.EntityName) {
                    return true;
                }
                if (!this.exportRequest.FilterType) {
                    return true;
                }
                if (!this.exportRequest.Filter) {
                    return true;
                }
                if (!this.exportRequest.Topic) {
                    return true;
                }
                if (!this.exportRequest.ExportDatabaseID) {
                    return true;
                }
                if (!this.exportRequest.TimePath) {
                    return true;
                }
                if (this.exportRequest.FilterType === 'deviceId' && !this.exportRequest.ServiceName) {
                    return true;
                }
                if (!this.exportRequest.Offset) {
                    return true;
                }
                if (this.exportRequest.Values?.find(value => !value.Name || !value.Path)) {
                    return true;
                }
                return false;
            case 'import':
                let invalidJsonConfig = false;
                this.importRequest?.configs?.forEach(value => {
                    if (this.isUnknownImportConfig(value) && (typeof value.value === 'string')) {
                        try {
                            JSON.parse(value.value);
                        } catch (_) {
                            invalidJsonConfig = true;
                        }
                    }
                });
                return invalidJsonConfig;
            default:
                return false;
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        if (this.hasAspectClassCollisionInTopic()) {
            return;
        }
        const result = JSON.parse(JSON.stringify(this.result)) as SmartServiceTaskDescription; // prevent changes to the result after filtering
        let temp = result.inputs.filter(e => e.name.startsWith(result.topic + '.') &&
            !e.name.startsWith('info.') &&
            !e.name.startsWith('process_deployment_start.') &&
            !e.name.startsWith('import.') &&
            !e.name.startsWith('export.') &&
            !e.name.startsWith('watcher.') &&
            !e.name.startsWith('device_repository.')); // filter unused inputs (remove existing info, process_deployment_start, import and export inputs)

        temp.push({ name: 'export.request', type: 'text', value: this.stringifyExport(this.exportRequest) });

        this.handleUnknownImportConfigAsJsonObject();
        temp.push({ name: 'import.request', type: 'text', value: this.stringifyImport(this.importRequest) });
        this.importOverwrites.forEach(value => {
            if (value.json_value) {
                temp.push({ name: 'import.config.json_overwrite.' + value.config_name, type: 'text', value: value.json_value });
            }
        });

        temp.push({ name: 'info.module_type', type: 'text', value: this.infoModuleType });
        if (this.infoModuleData) {
            temp = temp.concat(this.getChunkedInputs('info.module_data', this.infoModuleData));
        }
        temp.push({ name: 'info.key', type: 'text', value: this.infoKey });

        temp = temp.concat(this.processStartModelToInputs(this.processStart));

        temp = temp.concat(this.deviceRepositoryWorkerInfoToInputs());

        temp = temp.concat(this.watcherWorkerInfoToInputs());

        temp = temp.filter(e => e.name.startsWith(result.topic + '.')); // filter unused inputs

        if (this.preScript) {
            temp = temp.concat(this.getChunkedInputs('prescript', this.preScript));
        }

        if (this.postScript) {
            temp = temp.concat(this.getChunkedInputs('postscript', this.postScript));
        }

        result.inputs = temp;
        result.smartServiceInputs = abstractSmartServiceInputToSmartServiceInputsDescription(this.smartServiceInputs);
        this.dialogRef.close(result);
    }
}

interface ProcessStartModel {
    deployment_id: string;
    inputs: ProcessStartInputModel[];
}

interface ProcessStartInputModel {
    key: string;
    value: string;
}
