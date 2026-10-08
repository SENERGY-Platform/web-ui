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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { ProcessRepoService } from '../process-repo/shared/process-repo.service';
import { DesignerDialogService } from './shared/designer-dialog.service';
import { DesignerHelperService } from './shared/designer-helper.service';
import { ProcessDesignerComponent } from './designer.component';
import { createProcessModeler } from './bpmn-js/bpmn-js';
import { fetchText, importXml, mountModeler, MountedModeler, panelSettled, until } from '../../../../testing/bpmn-modeler';

// Only the services a test passes in are used; the other injected dependencies are empty stubs.
const buildDesigner = (stubs: { designerService?: unknown; processRepoService?: unknown; snackBar?: unknown }): ProcessDesignerComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: HttpClient, useValue: {} },
            { provide: ActivatedRoute, useValue: {} },
            { provide: AuthorizationService, useValue: {} },
            { provide: DesignerDialogService, useValue: {} },
            { provide: DesignerHelperService, useValue: stubs.designerService ?? {} },
            { provide: ProcessRepoService, useValue: stubs.processRepoService ?? {} },
            { provide: MatSnackBar, useValue: stubs.snackBar ?? {} },
            { provide: MetadataExistenceService, useValue: {} },
        ],
    });
    return TestBed.runInInjectionContext(() => new ProcessDesignerComponent());
};

/*
 * Runs the component's own load and save code against the real modeler: bpmn-js 18 ignores the
 * callbacks bpmn-js 4 took, so a leftover callback call would load or save nothing, silently.
 */
describe('ProcessDesignerComponent load and save', () => {
    let mounted: MountedModeler;
    let component: ProcessDesignerComponent;
    let saveProcess: jasmine.Spy;
    let snackBar: jasmine.SpyObj<any>;
    let xml: string;

    beforeEach(async () => {
        xml = await fetchText('/bpmn-fixtures/process/senergy_all_attributes.bpmn');
        mounted = mountModeler(createProcessModeler);
        saveProcess = jasmine.createSpy('saveProcess').and.returnValue(of({}));
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
        const processRepoService = { saveProcess, getProcessModel: () => of({ bpmn_xml: xml }) };
        const designerService = { checkConstraints: () => of([]) };
        component = buildDesigner({ designerService, processRepoService, snackBar });
        component.modeler = mounted.modeler;
        component.id = 'model-1';
    });

    afterEach(() => mounted.destroy());

    const element = (id: string) => mounted.modeler.get('elementRegistry').get(id);

    it('loads the stored model into the modeler', async () => {
        component.loadProcessDiagram('model-1');
        await until(() => !!element('Task_device'));
        expect(element('Task_device').businessObject.get('senergy:order')).toBe('1');
    });

    it('saves the XML and the SVG preview of the model', async () => {
        component.loadProcessDiagram('model-1');
        await until(() => !!element('Task_device'));

        component.save();
        await until(() => saveProcess.calls.count() > 0);

        const [id, savedXml, svg] = saveProcess.calls.mostRecent().args;
        expect(id).toBe('model-1');
        expect(savedXml).toContain('<bpmn:definitions');
        expect(savedXml).toContain('senergy:aspects="urn:infai:ses:aspect:air,urn:infai:ses:aspect:water"');
        expect(svg).toContain('<svg');
        expect(snackBar.open).toHaveBeenCalledWith('Model saved.', undefined, { duration: 2000 });
    });

    it('reports an export error instead of saving', async () => {
        mounted.modeler.saveXML = () => Promise.reject(new Error('broken'));

        component.save();
        await until(() => snackBar.open.calls.count() > 0);

        expect(snackBar.open).toHaveBeenCalledWith('Error XML! Error: broken', 'close', { panelClass: 'snack-bar-error' });
        expect(saveProcess).not.toHaveBeenCalled();
    });
});

describe('ProcessDesignerComponent IoT-Info', () => {
    const malicious = '<img src=x onerror="window.__senergyXss = true">';
    let outputs: any[];
    let component: ProcessDesignerComponent;

    beforeEach(() => {
        outputs = [];
        const designerService = { getIncomingOutputs: () => outputs };
        component = buildDesigner({ designerService });
        (window as any).__senergyXss = undefined;
    });

    it('lists the incoming variables as before', () => {
        outputs = [{ name: 'temperature', value: '${result}' }, { name: 'lat' }];
        expect(component.getInfoHtml({} as any)).toBe(
            '<table><tr><th>Variable</th><th>Orig-Ref</th></tr><tr><td>temperature</td><td>${result}</td></tr><tr><td>lat</td><td>undefined</td></tr></table>',
        );
    });

    it('shows markup in a variable name or value as text', async () => {
        outputs = [{ name: malicious, value: malicious }];
        let panel: HTMLElement | undefined;
        const mounted = mountModeler((canvas, panelNode) => {
            panel = panelNode;
            return createProcessModeler(canvas, panelNode);
        });
        try {
            mounted.modeler.designerCallbacks = { getInfoHtml: (element: any) => component.getInfoHtml(element) };
            await importXml(mounted.modeler, await fetchText('/bpmn-fixtures/process/writers.bpmn'));
            mounted.modeler.get('selection').select(mounted.modeler.get('elementRegistry').get('Task_1'));
            await panelSettled();

            const info = panel!.querySelector('[data-entry-id="iot-extern-device-variable-list"]') as HTMLElement;
            expect(info.querySelector('img')).toBeNull();
            expect(info.querySelectorAll('td')[0].textContent).toBe(malicious);
            expect(info.querySelectorAll('td')[1].textContent).toBe(malicious);
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect((window as any).__senergyXss).toBeUndefined();
        } finally {
            mounted.destroy();
        }
    });
});
