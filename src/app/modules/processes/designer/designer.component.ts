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
    BpmnParameter, DesignerProcessModel
} from './shared/designer.model';
import {
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel
} from '../../devices/device-types-overview/shared/device-type-selection.model';
import {DesignerDialogService} from './shared/designer-dialog.service';
import {DesignerHelperService} from './shared/designer-helper.service';
import {ProcessRepoService} from '../process-repo/shared/process-repo.service';
import {ActivatedRoute} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {DesignerErrorModel} from './shared/designer-error.model';
import {DesignerSnackBarComponent} from './snack-bar/designer-snack-bar.component';
import {defaultIfEmpty} from 'rxjs/operators';

@Component({
    selector: 'senergy-process-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css']
})

export class ProcessDesignerComponent implements OnInit {

    modeler: any;
    id = '';
    ready = false;

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        protected auth: AuthorizationService,
        protected designerDialogService: DesignerDialogService,
        protected designerService: DesignerHelperService,
        protected processRepoService: ProcessRepoService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
    ) {
    }

    ngOnInit() {
        // TODO: find better solution for appear / fade-in problem
        setTimeout(() => {
            const userId = this.auth.getUserId();
            const that = this;
            this.id = this.route.snapshot.paramMap.get('id') || '';

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
                    camunda: camundaBpmnModdle,
                    senergy: {
                        'name': 'senergy',
                        'uri': 'https://senergy.infai.org',
                        'prefix': 'senergy',
                    }
                }
            });

            this.modeler.designerCallbacks = {
                durationDialog: (initial: string): Promise<DurationResult> => {
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
                dateDialog: (initial: string): Promise<{ iso: string, text: string }> => {
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
                cycleDialog: (initial: string): Promise<{ cron: string, text: string }> => {
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
                editHistoricDataConfig: function (existingConfig: HistoricDataConfig, callback: (result: HistoricDataConfig) => void) {
                    that.designerDialogService.openHistoricDataConfigDialog(existingConfig, callback);
                },
                registerOutputs: function (outputs: any) {
                    console.log('WARNING: deprecated call to registerOutputs()', outputs);
                },
                getInfoHtml: (element: BpmnElement): string => {
                    return that.getInfoHtml(element);
                },
                editInput: (element: BpmnElement, callback: () => void) => {
                    that.designerDialogService.openEditInputDialog(element, callback);
                },
                editOutput: (outputs: BpmnParameter[], callback: () => void) => {
                    that.designerDialogService.openEditOutputDialog(outputs, callback);
                },
                findIotDeviceType: (
                    devicetypeService: DeviceTypeSelectionRefModel,
                    callback: (connectorInfo: DeviceTypeSelectionResultModel) => void
                ) => {
                    that.designerDialogService.openTaskConfigDialog(devicetypeService).subscribe((result: DeviceTypeSelectionResultModel) => {
                            if (result) {
                                callback(result);
                            }
                            this.designerService.checkConstraints(this.modeler).pipe(defaultIfEmpty<DesignerErrorModel[][]>([])).subscribe((responses: DesignerErrorModel[][]) => {
                                if (this.countErrors(responses) > 0) {
                                    this.showDeviceClassError(responses);
                                }
                            });
                        }
                    );
                },
                configEmail: (to: string, subj: string, content: string, callback: (to: string, subj: string, content: string) => void) => {
                    that.designerDialogService.openEmailConfigDialog(to, subj, content, callback);
                },
                configNotification: (subj: string, content: string, callback: (subj: string, content: string) => void) => {
                    that.designerDialogService.openNotificationConfigDialog(subj, content, callback);
                }
            };

            if (this.id === '') {
                this.newProcessDiagram();
            } else {
                this.loadProcessDiagram(this.id);
            }
            this.ready = true;
        }, 1000);
    }

    loadProcessDiagram(id: string) {
        this.processRepoService.getProcessModel(id).subscribe((resp: DesignerProcessModel | null) => {
            if (resp !== null) {
                const xml = resp.bpmn_xml;
                this.modeler.importXML(xml, this.handleError);
            }
        });
    }

    handleError(err: any) {
        if (err) {
            console.warn('Ups, error: ', err);
        }
    }

    newProcessDiagram() {
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

    save(): void {
        this.designerService.checkConstraints(this.modeler).pipe(defaultIfEmpty<DesignerErrorModel[][]>([])).subscribe((responses: DesignerErrorModel[][]) => {
            if (this.countErrors(responses) > 0) {
                this.showDeviceClassError(responses);
            } else {
                this.saveXML((errXML, processXML) => {
                    if (errXML) {
                        this.snackBar.open('Error XML! ' + errXML, undefined, {duration: 3500});
                    } else {
                        this.saveSVG((errSVG, svgXML) => {
                            if (errSVG) {
                                this.snackBar.open('Error SVG! ' + errSVG, undefined, {duration: 3500});
                            } else {
                                this.processRepoService.saveProcess(
                                    this.id, processXML, svgXML).subscribe(() => {
                                    this.snackBar.open('Model saved.', undefined, {duration: 2000});
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    importBPMN(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = () => {
                this.modeler.importXML(fileReader.result, this.handleError);
                this.snackBar.open('Import finished.', undefined, {duration: 2000});
            };
            fileReader.readAsText(file);
        } else {
            this.snackBar.open('Failed to load file!', undefined, {duration: 2000});
        }
    }

    private saveXML(callback: (error: Error, processXML: string) => void) {
        this.modeler.saveXML(callback);
    }

    private saveSVG(callback: (error: Error, svgXML: string) => void) {
        this.modeler.saveSVG(callback);
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

    private showDeviceClassError(errors: DesignerErrorModel[][]): void {
        this.snackBar.openFromComponent(DesignerSnackBarComponent, {duration: 5000, data: errors});
    }

    private countErrors(errors: DesignerErrorModel[][]): number {
        let errorCount = 0;
        errors.forEach((poolError: DesignerErrorModel[]) => {
            poolError.forEach((laneError: DesignerErrorModel) => {
                if (laneError.error) {
                    errorCount++;
                }
            });
        });
        return errorCount;
    }
}
