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

import { Component, OnInit } from '@angular/core';
import { AuthorizationService } from '../../../core/services/authorization.service';

import { HttpClient } from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {SmartServiceDesignsService} from '../designs/shared/designs.service';
import {
    camundaBpmnModdle,
    CamundaPropertiesProvider,
    ElementTemplates,
    InjectionNames,
    Modeler,
    PropertiesPanelModule,
    PaletteProvider, SenergyPropertiesProvider
} from '../../processes/designer/bpmn-js/bpmn-js';
import {SmartServiceDesignModel} from '../designs/shared/design.model';
import {DialogsService} from '../../../core/services/dialogs.service';
import * as ServicePropertiesProvider from './smart-service-properties-provider';
import {SmartServiceInputsDescription, SmartServiceTaskInputDescription, SmartServiceTaskDescription} from './shared/designer.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {EditSmartServiceTaskDialogComponent} from './dialog/edit-smart-service-task-dialog/edit-smart-service-task-dialog.component';
import {BpmnElement} from '../../processes/designer/shared/designer.model';
import {EditSmartServiceInputDialogComponent} from './dialog/edit-smart-service-input-dialog/edit-smart-service-input-dialog.component';

@Component({
    selector: 'smart-service-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css'],
})
export class SmartServiceDesignerComponent implements OnInit {
    modeler: any;
    id = '';
    ready = false;
    name = ''
    description = ''

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        protected auth: AuthorizationService,
        protected designsService: SmartServiceDesignsService,
        private snackBar: MatSnackBar,
        private dialogService: DialogsService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        setTimeout(() => {
            const that = this;
            this.id = this.route.snapshot.paramMap.get('id') || '';

            this.modeler = new Modeler({
                container: '#js-canvas',
                width: '100%',
                height: '100%',
                additionalModules: [
                    PropertiesPanelModule,

                    // Re-use original bpmn-properties-module, see CustomPropsProvider
                    { [InjectionNames.camundaPropertiesProvider]: ['type', CamundaPropertiesProvider.propertiesProvider[1]] },

                    { [InjectionNames.propertiesProvider]: ['type', ServicePropertiesProvider.propertiesProvider[1]] },

                    // Re-use original palette, see CustomPaletteProvider
                    { [InjectionNames.paletteProvider]: ['type', PaletteProvider] },

                    { [InjectionNames.elementTemplates]: ['type', ElementTemplates.elementTemplates[1]] },
                ],
                propertiesPanel: {
                    parent: '#js-properties-panel',
                },
                moddleExtensions: {
                    camunda: camundaBpmnModdle,
                    senergy: {
                        name: 'senergy',
                        uri: 'https://senergy.infai.org',
                        prefix: 'senergy',
                    },
                },
            });

            this.modeler.designerCallbacks = {
                openTaskEditDialog: function (initInfo: SmartServiceTaskDescription, element: BpmnElement, callback: (info: SmartServiceTaskDescription) => void ) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.disableClose = false;
                    dialogConfig.data = { info: initInfo, element: element };
                    const editDialogRef = that.dialog.open(EditSmartServiceTaskDialogComponent, dialogConfig);
                    editDialogRef.afterClosed().subscribe((value: SmartServiceTaskDescription) => {
                        if (value) {
                            callback(value);
                        }
                    });
                },

                openSmartServiceInputsEditDialog: function (info: SmartServiceInputsDescription, element: BpmnElement, callback: (info: SmartServiceInputsDescription) => void ) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.disableClose = false;
                    dialogConfig.data = { info: info, element: element };
                    const editDialogRef = that.dialog.open(EditSmartServiceInputDialogComponent, dialogConfig);
                    editDialogRef.afterClosed().subscribe((value: SmartServiceInputsDescription) => {
                        if (value) {
                            callback(value);
                        }
                    });
                }
            };

            if (this.id === '') {
                this.newDesignDiagram();
            } else {
                this.loadDesignDiagram(this.id);
            }
            this.ready = true;
        }, 1000);
    }

    loadDesignDiagram(id: string) {
        this.designsService.getDesign(id).subscribe((resp: SmartServiceDesignModel | null) => {
            if (resp !== null) {
                const xml = resp.bpmn_xml;
                this.name = resp.name;
                this.description = resp.description;
                this.modeler.importXML(xml, this.handleError);
            }
        });
    }

    handleError(err: any) {
        if (err) {
            console.warn('Ups, error: ', err);
        }
    }

    newDesignDiagram() {
        const url = '/assets/bpmn/initial.bpmn';
        this.http
            .get(url, {
                headers: { observe: 'response' },
                responseType: 'text',
            })
            .subscribe((x: any) => {
                this.modeler.importXML(x, this.handleError);
            }, this.handleError);
    }

    save(): void {
        this.saveXML((errXML, processXML) => {
            if (errXML) {
                this.snackBar.open('Error XML! ' + errXML, "close", { panelClass: "snack-bar-error" });
            } else {
                this.saveSVG((errSVG, svgXML) => {
                    if (errSVG) {
                        this.snackBar.open('Error SVG! ' + errSVG, "close", { panelClass: "snack-bar-error" });
                    } else {
                        this.dialogService.openInputDialog("Design Name and Description", {name: this.name, description: this.description}, ["name"])
                            .afterClosed()
                            .subscribe((result: {name: string, description: string}) => {
                                this.name = result.name;
                                this.description = result.description;
                                let model = { id: this.id, svg_xml: svgXML, bpmn_xml: processXML, name: result.name, description: result.description, user_id: "" }
                                this.designsService.saveDesign(model).subscribe((result: SmartServiceDesignModel | null) => {
                                    if (result) {
                                        this.snackBar.open('Model saved.', undefined, { duration: 2000 });
                                        if(this.id == "") {
                                            this.router.navigate(['/smart-services/designer/'+result.id]);
                                        }
                                    }
                                });
                            })
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
                this.snackBar.open('Import finished.', undefined, { duration: 2000 });
            };
            fileReader.readAsText(file);
        } else {
            this.snackBar.open('Failed to load file!', undefined, { duration: 2000 });
        }
    }

    private saveXML(callback: (error: Error, processXML: string) => void) {
        this.modeler.saveXML(callback);
    }

    private saveSVG(callback: (error: Error, svgXML: string) => void) {
        this.modeler.saveSVG(callback);
    }
}
