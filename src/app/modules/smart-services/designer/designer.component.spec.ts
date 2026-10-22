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
    let createRelease: jasmine.Spy;
    let navigate: jasmine.Spy;
    let openInputDialog: jasmine.Spy;
    let snackBar: jasmine.SpyObj<any>;
    let xml: string;

    beforeEach(async () => {
        xml = await fetchText('/bpmn-fixtures/smart-service/params.bpmn');
        mounted = mountModeler(createSmartServiceModeler);
        saveDesign = jasmine.createSpy('saveDesign').and.returnValue(of({ id: 'design-1' }));
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        createRelease = jasmine.createSpy('createRelease').and.returnValue(of({}));
        navigate = jasmine.createSpy('navigate');
        openInputDialog = jasmine.createSpy('openInputDialog').and.callFake((title: string) => ({
            afterClosed: () => of(title.startsWith('Release') ? { name: 'Release 1', description: 'released' } : { name: 'Params 2', description: 'saved' }),
        }));
        const designsService = { saveDesign, getDesign: () => of({ bpmn_xml: xml, name: 'Params', description: 'all parameters' }) };
        const releaseService = {
            createRelease,
            getExtendedRelease: () => of({ bpmn_xml: xml, name: 'Released', description: 'a release' }),
        };
        const dialogService = { openInputDialog };
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: ActivatedRoute, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: SmartServiceDesignsService, useValue: designsService },
                { provide: SmartServiceReleasesService, useValue: releaseService },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: DialogsService, useValue: dialogService },
                { provide: Router, useValue: { navigate } },
                { provide: MatDialog, useValue: {} },
                { provide: DesignerHelperService, useValue: {} },
                { provide: DesignerDialogService, useValue: {} },
                { provide: MetadataExistenceService, useValue: {} },
            ],
        });
        component = TestBed.runInInjectionContext(() => new SmartServiceDesignerComponent());
        component.modeler = mounted.modeler;
        component.unsaved.attach(mounted.modeler);
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

    it('sends the design with exactly these fields', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));

        component.save();
        await until(() => saveDesign.calls.count() > 0);

        const model = saveDesign.calls.mostRecent().args[0];
        expect(Object.keys(model).sort()).toEqual(['bpmn_xml', 'description', 'id', 'name', 'svg_xml', 'user_id']);
        expect(model.description).toBe('saved');
        expect(model.user_id).toBe('');
        expect(openInputDialog).toHaveBeenCalledWith('Design Name and Description', { name: 'Params', description: 'all parameters' }, ['name']);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('saves a design without an id as a new one and opens it', async () => {
        component.id = '';
        saveDesign.and.returnValue(of({ id: 'new-1' }));
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));

        component.save();
        await until(() => navigate.calls.count() > 0);

        expect(saveDesign.calls.mostRecent().args[0].id).toBe('');
        expect(navigate).toHaveBeenCalledWith(['/smart-services/designer/new-1']);
    });

    it('releases the saved design with the name and description from the release dialog', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));

        component.saveAndRelease();
        await until(() => createRelease.calls.count() > 0);

        expect(saveDesign.calls.count()).toBe(1);
        expect(openInputDialog.calls.argsFor(1)).toEqual(['Release Name and Description', { name: undefined, description: undefined }, ['name']]);
        expect(createRelease).toHaveBeenCalledOnceWith({ design_id: 'design-1', name: 'Release 1', description: 'released' });
        expect(navigate).not.toHaveBeenCalled();
    });

    it('opens a newly saved design after the release dialog, also when no release is created', async () => {
        component.id = '';
        saveDesign.and.returnValue(of({ id: 'new-1', name: 'Params 2', description: 'saved' }));
        openInputDialog.and.callFake((title: string) => ({ afterClosed: () => of(title.startsWith('Release') ? null : { name: 'Params 2', description: 'saved' }) }));
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));

        component.saveAndRelease();
        await until(() => navigate.calls.count() > 0);

        expect(createRelease).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/smart-services/designer/new-1']);
    });

    it('saves a release opened in the designer as a new design', async () => {
        component.id = '';
        component.releaseId = 'release-1';
        component.loadReleaseDiagram('release-1');
        await until(() => !!element('StartEvent_1'));
        expect(component.name).toBe('Released');

        component.save();
        await until(() => saveDesign.calls.count() > 0);

        const model = saveDesign.calls.mostRecent().args[0];
        expect(model.id).toBe('');
        expect(model.name).toBe('Params 2');
    });

    it('titles an unnamed design as new, a loaded one by its name, and links back to the list it belongs to', async () => {
        component.id = '';
        expect(component.title).toBe('New smart service');
        expect(component.backLink).toBe('/smart-services/designs');

        component.id = 'design-1';
        expect(component.title).toBe('Smart service');
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));
        expect(component.title).toBe('Params');

        component.releaseId = 'release-1';
        expect(component.backLink).toBe('/smart-services/releases');
    });

    it('is unsaved after an edit and saved again once the design is stored, not when storing failed', async () => {
        component.loadDesignDiagram('design-1');
        await until(() => !!element('StartEvent_1'));
        expect(component.unsaved.dirty).toBeFalse();
        mounted.modeler.get('modeling').updateProperties(element('StartEvent_1'), { name: 'renamed' });
        expect(component.unsaved.dirty).toBeTrue();

        saveDesign.and.returnValue(of(null));
        component.save();
        await until(() => saveDesign.calls.count() > 0);
        expect(component.unsaved.dirty).toBeTrue();

        saveDesign.and.returnValue(of({ id: 'design-1' }));
        component.save();
        await until(() => saveDesign.calls.count() > 1);
        expect(component.unsaved.dirty).toBeFalse();
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
