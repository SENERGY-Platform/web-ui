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
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SmartServiceDesignsService } from '../designs/shared/designs.service';
import {
    camundaBpmnModdle,
    CamundaPropertiesProvider,
    ElementTemplates,
    InjectionNames,
    Modeler,
    PropertiesPanelModule,
    PaletteProvider
} from '../../processes/designer/bpmn-js/bpmn-js';
import { SmartServiceDesignModel } from '../designs/shared/design.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import * as ServicePropertiesProvider from './smart-service-properties-provider';
import {
    SmartServiceInputsDescription, SmartServiceTaskDescription,
    SmartServiceTaskInputOutputDescription
} from './shared/designer.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { EditSmartServiceTaskDialogComponent } from './dialog/edit-smart-service-task-dialog/edit-smart-service-task-dialog.component';
import { BpmnElement } from '../../processes/designer/shared/designer.model';
import { EditSmartServiceInputDialogComponent } from './dialog/edit-smart-service-input-dialog/edit-smart-service-input-dialog.component';
import {
    EditSmartServiceJsonExtractionDialogComponent
} from './dialog/edit-smart-service-json-extraction-dialog/edit-smart-service-json-extraction-dialog.component';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { SmartServiceExtendedReleaseModel } from '../releases/shared/release.model';

@Component({
    selector: 'senergy-smart-service-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css'],
})
export class SmartServiceDesignerComponent implements OnInit {
    modeler: any;
    id = '';
    releaseId = '';
    ready = false;
    name = '';
    description = '';

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        protected auth: AuthorizationService,
        protected designsService: SmartServiceDesignsService,
        protected releaseService: SmartServiceReleasesService,
        private snackBar: MatSnackBar,
        private dialogService: DialogsService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        setTimeout(() => {
            const dialog = this.dialog;
            this.id = this.route.snapshot.paramMap.get('id') || '';
            this.releaseId =this.route.snapshot.paramMap.get('releaseId') || '';

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
                openTaskEditDialog(initInfo: SmartServiceTaskDescription, element: BpmnElement, callback: (info: SmartServiceTaskDescription) => void ) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.disableClose = false;
                    dialogConfig.data = { info: initInfo, element };
                    const editDialogRef = dialog.open(EditSmartServiceTaskDialogComponent, dialogConfig);
                    editDialogRef.afterClosed().subscribe((value: SmartServiceTaskDescription) => {
                        if (value) {
                            callback(value);
                        }
                    });
                },

                openExtractJsonFieldsDialog(initInfo: SmartServiceTaskInputOutputDescription, element: BpmnElement, callback: (info: SmartServiceTaskInputOutputDescription) => void ) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.disableClose = false;
                    dialogConfig.data = { info: initInfo, element };
                    const editDialogRef = dialog.open(EditSmartServiceJsonExtractionDialogComponent, dialogConfig);
                    editDialogRef.afterClosed().subscribe((value: SmartServiceTaskInputOutputDescription) => {
                        if (value) {
                            callback(value);
                        }
                    });
                },

                openSmartServiceInputsEditDialog(info: SmartServiceInputsDescription, element: BpmnElement, callback: (info2: SmartServiceInputsDescription) => void ) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.disableClose = false;
                    dialogConfig.data = { info, element };
                    const editDialogRef = dialog.open(EditSmartServiceInputDialogComponent, dialogConfig);
                    editDialogRef.afterClosed().subscribe((value: SmartServiceInputsDescription) => {
                        if (value) {
                            callback(value);
                        }
                    });
                }
            };

            if (this.releaseId !== '') {
                this.loadReleaseDiagram(this.releaseId);
            } else if (this.id !== '') {
                this.loadDesignDiagram(this.id);
            } else {
                this.newDesignDiagram();
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

    loadReleaseDiagram(id: string) {
        this.releaseService.getExtendedRelease(id).subscribe((resp: SmartServiceExtendedReleaseModel | null) => {
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

    saveAndRelease(): void {
        this.saveThen((design: SmartServiceDesignModel | null) => {
            if (design) {
                this.snackBar.open('Model saved.', undefined, { duration: 2000 });
                this.releaseDesign(design, ()=>{
                    if(this.id === '') {
                        this.router.navigate(['/smart-services/designer/'+design.id]);
                    }
                });
            }
        });
    }

    save(): void {
        this.saveThen((design: SmartServiceDesignModel | null) => {
            if (design) {
                this.snackBar.open('Model saved.', undefined, { duration: 2000 });
                if(this.id === '') {
                    this.router.navigate(['/smart-services/designer/'+design.id]);
                }
            }
        });
    }

    saveThen(then: ((design: SmartServiceDesignModel | null) => void)): void {
        this.saveXML((errXML, processXML) => {
            if (errXML) {
                this.snackBar.open('Error XML! ' + errXML, 'close', { panelClass: 'snack-bar-error' });
            } else {
                this.saveSVG((errSVG, svgXML) => {
                    if (errSVG) {
                        this.snackBar.open('Error SVG! ' + errSVG, 'close', { panelClass: 'snack-bar-error' });
                    } else {
                        this.dialogService.openInputDialog('Design Name and Description', {name: this.name, description: this.description}, ['name'])
                            .afterClosed()
                            .subscribe((result: {name: string; description: string}) => {
                                if(result){
                                    this.name = result.name;
                                    this.description = result.description;
                                    const model = { id: this.id, svg_xml: svgXML, bpmn_xml: processXML, name: result.name, description: result.description, user_id: '' };
                                    this.designsService.saveDesign(model).subscribe(then);
                                }
                            });
                    }
                });
            }
        });
    }

    releaseDesign(design: SmartServiceDesignModel, then: () => void): void {
        this.dialogService.openInputDialog('Release Name and Description', {name: design.name, description: design.description}, ['name'])
            .afterClosed()
            .subscribe((result: {name: string; description: string}) => {
                if (result) {
                    this.releaseService.createRelease({design_id: design.id, name: result.name, description: result.description}).subscribe(value => {
                        if(value) {
                            this.snackBar.open('Release created.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while creating a release !', 'close', { panelClass: 'snack-bar-error' });
                        }
                        then();
                    });
                } else {
                    then();
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
