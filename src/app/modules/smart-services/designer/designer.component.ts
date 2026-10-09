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

import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthorizationService } from '../../../core/services/authorization.service';

import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SmartServiceDesignsService } from '../designs/shared/designs.service';
import { createSmartServiceModeler } from './smart-service-modeler';
import { exportDiagram } from '../../processes/designer/bpmn-js/bpmn-js';
import { SmartServiceDesignModel } from '../designs/shared/design.model';
import { DialogsService } from '../../../core/services/dialogs.service';
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
import { ScriptEditModel } from '../../processes/designer/shared/designer-dialog.model';
import { DesignerDialogService } from '../../processes/designer/shared/designer-dialog.service';
import { DesignerHelperService } from '../../processes/designer/shared/designer-helper.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MissingMetadataOverlays } from '../../metadata/shared/missing-metadata-overlays';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';

@Component({
    selector: 'senergy-smart-service-designer',
    templateUrl: './designer.component.html',
    styleUrls: ['./designer.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatIconButton, MatTooltip, MatIcon, SpinnerComponent]
})
export class SmartServiceDesignerComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    protected auth = inject(AuthorizationService);
    protected designsService = inject(SmartServiceDesignsService);
    protected releaseService = inject(SmartServiceReleasesService);
    private snackBar = inject(MatSnackBar);
    private dialogService = inject(DialogsService);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    protected designerService = inject(DesignerHelperService);
    protected designerDialogService = inject(DesignerDialogService);
    private metadataExistenceService = inject(MetadataExistenceService);

    modeler: any;
    id = '';
    releaseId = '';
    ready = false;
    name = '';
    description = '';

    private missingMetadataOverlays: MissingMetadataOverlays;

    constructor() {
        this.missingMetadataOverlays = new MissingMetadataOverlays(this.metadataExistenceService);
    }

    ngOnDestroy() {
        this.missingMetadataOverlays.detach();
    }

    ngOnInit() {
        setTimeout(() => {
            const dialog = this.dialog;
            const that = this;
            this.id = this.route.snapshot.paramMap.get('id') || '';
            this.releaseId =this.route.snapshot.paramMap.get('releaseId') || '';

            this.modeler = createSmartServiceModeler('#js-canvas', '#js-properties-panel');

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

                /*
                 * Sequence flow conditions and the other camunda script fields, which
                 * decide which way a smart service proceeds. The dialog is the process
                 * designer's -- same panel field, same engine -- and the available
                 * variables come from the same flow walk, which only relies on the
                 * camunda inputOutput shape that both designers use.
                 */
                editScript: (m: ScriptEditModel, element: BpmnElement, callback: (result: ScriptEditModel) => void) => {
                    const variables = that.designerService.getAvailableVariables(element);
                    that.designerDialogService.openScriptEditorDialog(m, variables).subscribe((result: ScriptEditModel | undefined) => {
                        if (result) {
                            callback(result);
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

            this.missingMetadataOverlays.attach(this.modeler);

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
                this.modeler.importXML(xml).catch(this.handleError);
            }
        });
    }

    loadReleaseDiagram(id: string) {
        this.releaseService.getExtendedRelease(id).subscribe((resp: SmartServiceExtendedReleaseModel | null) => {
            if (resp !== null) {
                const xml = resp.bpmn_xml;
                this.name = resp.name;
                this.description = resp.description;
                this.modeler.importXML(xml).catch(this.handleError);
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
                this.modeler.importXML(x).catch(this.handleError);
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
        exportDiagram(this.modeler).then(
            ({ xml, svg }) => {
                this.dialogService.openInputDialog('Design Name and Description', {name: this.name, description: this.description}, ['name'])
                    .afterClosed()
                    .subscribe((result: {[key: string]: string} | null | undefined) => {
                        if(result){
                            this.name = result.name;
                            this.description = result.description;
                            const model = { id: this.id, svg_xml: svg, bpmn_xml: xml, name: result.name, description: result.description, user_id: '' };
                            this.designsService.saveDesign(model).subscribe(then);
                        }
                    });
            },
            (err: Error) => this.snackBar.open(err.message, 'close', { panelClass: 'snack-bar-error' }),
        );
    }

    releaseDesign(design: SmartServiceDesignModel, then: () => void): void {
        this.dialogService.openInputDialog('Release Name and Description', {name: design.name, description: design.description}, ['name'])
            .afterClosed()
            .subscribe((result: {[key: string]: string} | null | undefined) => {
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
                this.modeler.importXML(fileReader.result).catch(this.handleError);
                this.snackBar.open('Import finished.', undefined, { duration: 2000 });
            };
            fileReader.readAsText(file);
        } else {
            this.snackBar.open('Failed to load file!', undefined, { duration: 2000 });
        }
    }
}
