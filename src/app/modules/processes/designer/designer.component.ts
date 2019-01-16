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
    ConnectorInfo,
    BpmnElement,
    Output,
    HistoricDataConfig,
    DurationResult,
    ServiceSelection
} from './designer.model';

@Component({
    selector: 'senergy-process-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css']
})

export class ProcessDesignerComponent implements OnInit {

    modeler: any;

    constructor(private http: HttpClient, protected auth: AuthorizationService) {
    }

    ngOnInit() {
        const userId = this.auth.getUserId();

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
            moddleExtension: {
                camunda: camundaBpmnModdle
            }
        });

        this.modeler.designerCallbacks = {
            durationDialog: function (initial: string): Promise<DurationResult> {
                // TODO
                console.log(initial);
                return new Promise<DurationResult>(function () {});
            },
            dateDialog: function (initial: string): Promise<string> {
                // TODO
                console.log(initial);
                return new Promise<string>(function () {});
            },
            cycleDialog: function (initial: string): Promise<string> {
                // TODO
                console.log(initial);
                return new Promise<string>(function () {});
            },
            editHistoricDataConfig: function(existingConfig: HistoricDataConfig, callback: (result: HistoricDataConfig) => void) {
                // TODO
                console.log(existingConfig, callback);
            },
            registerOutputs: function (outputs: any) {
                console.log('WARNING: deprecated call to registerOutputs()', outputs);
            },
            getInfoHtml: function (element: BpmnElement): string {
                // TODO
                console.log(element);
                return 'todo';
            },
            editInput: function (element: BpmnElement, callback: () => void) {
                // TODO
                console.log(element, callback);
            },
            editOutput: function(outputs: [Output], callback: () => void) {
                // TODO
                console.log(outputs, callback);
            },
            findIotDeviceType: function(devicetypeService: ServiceSelection, callback: (connectorInfo: ConnectorInfo) => void) {
                // TODO
                console.log(devicetypeService, callback);
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
}
