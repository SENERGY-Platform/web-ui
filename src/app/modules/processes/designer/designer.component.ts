/*
 * Copyright 2019 InfAI (CC SES)
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
import {AuthorizationService} from '../../../core/services/authorization.service';
import {
    Modeler,
    CamundaPropertiesProvider,
    PropertiesPanelModule,
    InjectionNames,
    PaletteProvider,
    ElementTemplates,
    camundaBpmnModdle,
    SenergyPropertiesProvider
} from './bpmn-js/bpmn-js';
import {HttpClient} from '@angular/common/http';
import {
    BpmnElement,
    HistoricDataConfig,
    DurationResult,
    BpmnParameter
} from './shared/designer.model';
import {DeviceTypeService} from '../../devices/device-types/shared/device-type.service';
import {DeviceTypeSelectionRefModel, DeviceTypeSelectionResultModel} from '../../devices/device-types/shared/device-type-selection.model';
import {DeviceTypeDialogService} from '../../devices/device-types/shared/device-type-dialog.service';
import {DesignerDialogService} from './shared/designer-dialog.service';
import {DesignerService} from './shared/designer.service';

@Component({
    selector: 'senergy-process-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css']
})

export class ProcessDesignerComponent implements OnInit {

    modeler: any;

    constructor(
        private http: HttpClient,
        protected auth: AuthorizationService,
        protected dtService: DeviceTypeService,
        protected dtDialogService: DeviceTypeDialogService,
        protected designerDialogService: DesignerDialogService,
        protected designerService: DesignerService,
    ) {}

    ngOnInit() {
        const userId = this.auth.getUserId();
        const that = this;

        this.modeler = new Modeler({
            container: '#js-canvas',
            width: '100%',
            height: '100%',
            additionalModules: [
                PropertiesPanelModule,

                // Re-use original bpmn-properties-module, see CustomPropsProvider
                {[InjectionNames.camundaPropertiesProvider]: ['type', CamundaPropertiesProvider.propertiesProvider[1]]},
                // {[InjectionNames.propertiesProvider]: ['type', CamundaPropertiesProvider.propertiesProvider[1]]},

                // TODO: Implement functions and UI components to use DeviceProvider
                {[InjectionNames.propertiesProvider]: ['type', SenergyPropertiesProvider.propertiesProvider[1]]},

                // Re-use original palette, see CustomPaletteProvider
                {[InjectionNames.paletteProvider]: ['type', PaletteProvider]},

                {[InjectionNames.elementTemplates]: ['type', ElementTemplates.elementTemplates[1]]}

            ],
            propertiesPanel: {
                parent: '#js-properties-panel'
            },
            moddleExtensions: {
                camunda: camundaBpmnModdle
            }
        });

        this.modeler.designerCallbacks = {
            durationDialog: function (initial: string): Promise<DurationResult> {
                return new Promise((resolve, reject) => {
                    that.designerDialogService.openDurationDialog(initial).toPromise().then(value => {
                        if (value) {
                            resolve(value);
                        } else {
                            reject();
                        }
                    });
                });
            },
            dateDialog: function (initial: string): Promise<{iso: string, text: string}> {
                return new Promise((resolve, reject) => {
                    that.designerDialogService.openDateTimeDialog(initial).toPromise().then(value => {
                        if (value) {
                            resolve(value);
                        } else {
                            reject();
                        }
                    });
                });
            },
            cycleDialog: function (initial: string): Promise<{cron: string, text: string}> {
                return new Promise((resolve, reject) => {
                    that.designerDialogService.openCycleDialog(initial).toPromise().then(value => {
                        if (value) {
                            resolve(value);
                        } else {
                            reject();
                        }
                    });
                });
            },
            editHistoricDataConfig: function(existingConfig: HistoricDataConfig, callback: (result: HistoricDataConfig) => void) {
                that.designerDialogService.openHistoricDataConfigDialog(existingConfig, callback);
            },
            registerOutputs: function (outputs: any) {
                console.log('WARNING: deprecated call to registerOutputs()', outputs);
            },
            getInfoHtml: function (element: BpmnElement): string {
                return that.getInfoHtml(element);
            },
            editInput: function (element: BpmnElement, callback: () => void) {
                that.designerDialogService.openEditInputDialog(element, callback);
            },
            editOutput: function(outputs: BpmnParameter[], callback: () => void) {
                that.designerDialogService.openEditOutputDialog(outputs, callback);
            },
            findIotDeviceType: function(
                devicetypeService: DeviceTypeSelectionRefModel,
                callback: (connectorInfo: DeviceTypeSelectionResultModel) => void
            ) {
                that.dtDialogService.openSelectDeviceTypeAndServiceDialog(devicetypeService, callback);
            }
        };

        this.load();
    }

    handleError(err: any) {
        if (err) {
            console.warn('Ups, error: ', err);
        }
    }

    load() {
        const url = '/assets/bpmn/initial.bpmn';
        this.http.get(url, {
            headers: {observe: 'response'}, responseType: 'text'
        }).subscribe(
            (x: any) => {
                this.modeler.importXML(x, this.handleError);
            },
            this.handleError
        );
    }

    getInfoHtml(element: BpmnElement): string {
        const outputs = this.designerService.getIncomingOutputs(element);
        const outputsInfo = this.getInfoHtmlTableRows(outputs);
        return `<table><tr><th>Variable</th><th>Orig-Ref</th></tr>${outputsInfo}</table>`;
    }

    private getInfoHtmlTableRows(outputs: BpmnParameter[], index: number = 0): string {
        if (outputs.length > index) {
            const element: BpmnParameter = outputs[index];
            const rest: string = this.getInfoHtmlTableRows(outputs, index + 1);
            const name: string = element.name;
            const value: string = element.value;
            return `<tr><td>${name}</td><td>${value}</td></tr>${rest}`;
        } else {
            return '';
        }
    }
}
