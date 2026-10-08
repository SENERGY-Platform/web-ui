/*
 * Copyright 2026 InfAI (CC SES)
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

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DesignerDialogService } from '../../processes/designer/shared/designer-dialog.service';
import { DesignerHelperService } from '../../processes/designer/shared/designer-helper.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { SmartServiceDesignsService } from '../designs/shared/designs.service';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { SmartServiceDesignerComponent } from './designer.component';
import { createSmartServiceModeler } from './smart-service-modeler';
import { fetchText, mountModeler, MountedModeler, until } from '../../../../testing/bpmn-modeler';

/* Runs the component's own load and save code against the real modeler, see the process designer spec. */
describe('SmartServiceDesignerComponent load and save', () => {
    let mounted: MountedModeler;
    let component: SmartServiceDesignerComponent;
    let saveDesign: jasmine.Spy;
    let snackBar: jasmine.SpyObj<any>;
    let xml: string;

    beforeEach(async () => {
        xml = await fetchText('/bpmn-fixtures/smart-service/params.bpmn');
        mounted = mountModeler(createSmartServiceModeler);
        saveDesign = jasmine.createSpy('saveDesign').and.returnValue(of({ id: 'design-1' }));
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        const designsService = { saveDesign, getDesign: () => of({ bpmn_xml: xml, name: 'Params', description: 'all parameters' }) };
        const dialogService = { openInputDialog: () => ({ afterClosed: () => of({ name: 'Params 2', description: 'saved' }) }) };
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: ActivatedRoute, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: SmartServiceDesignsService, useValue: designsService },
                { provide: SmartServiceReleasesService, useValue: {} },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: DialogsService, useValue: dialogService },
                { provide: Router, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: DesignerHelperService, useValue: {} },
                { provide: DesignerDialogService, useValue: {} },
                { provide: MetadataExistenceService, useValue: {} },
            ],
        });
        component = TestBed.runInInjectionContext(() => new SmartServiceDesignerComponent());
        component.modeler = mounted.modeler;
        component.id = 'design-1';
    });

    afterEach(() => mounted.destroy());

    const element = (id: string) => mounted.modeler.get('elementRegistry').get(id);

    it('loads the stored design into the modeler', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));
        expect(component.name).toBe('Params');
    });

    it('saves the XML and the SVG preview of the design', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));
        const then = jasmine.createSpy('then');

        component.saveThen(then);
        await until(() => saveDesign.calls.count() > 0);

        const model = saveDesign.calls.mostRecent().args[0];
        expect(model.id).toBe('design-1');
        expect(model.name).toBe('Params 2');
        expect(model.bpmn_xml).toContain('<camunda:formField id="device"');
        expect(model.svg_xml).toContain('<svg');
        expect(then).toHaveBeenCalledWith({ id: 'design-1' });
    });

    it('reports an export error instead of saving', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));
        mounted.modeler.saveSVG = () => Promise.reject(new Error('broken'));

        component.saveThen(() => {});
        await until(() => snackBar.open.calls.count() > 0);

        expect(snackBar.open).toHaveBeenCalledWith('Error SVG! Error: broken', 'close', { panelClass: 'snack-bar-error' });
        expect(saveDesign).not.toHaveBeenCalled();
    });
});
