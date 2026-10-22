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

import { fetchText, importXml, mountModeler, MountedModeler, until } from '../../../../../testing/bpmn-modeler';
import { createProcessModeler } from './bpmn-js';
import { UnsavedChanges } from './unsaved-changes';

describe('UnsavedChanges', () => {
    let mounted: MountedModeler;
    let unsaved: UnsavedChanges;
    let xml: string;

    beforeEach(async () => {
        xml = await fetchText('/bpmn-fixtures/process/senergy_all_attributes.bpmn');
        mounted = mountModeler(createProcessModeler);
        unsaved = new UnsavedChanges();
        unsaved.attach(mounted.modeler);
        await importXml(mounted.modeler, xml);
    });

    afterEach(() => mounted.destroy());

    const rename = () => mounted.modeler.get('modeling').updateProperties(mounted.modeler.get('elementRegistry').get('Task_device'), { name: 'renamed' });

    it('is clean after the model was loaded', () => {
        expect(unsaved.dirty).toBeFalse();
    });

    it('turns dirty with an edit in the modeler and clean with the save of it', () => {
        const snapshot = unsaved.snapshot();
        rename();
        expect(unsaved.dirty).toBeTrue();

        unsaved.markSaved(snapshot);
        expect(unsaved.dirty).toBeTrue();

        const afterEdit = unsaved.snapshot();
        unsaved.markSaved(afterEdit);
        expect(unsaved.dirty).toBeFalse();
    });

    it('keeps an edit made while the save was running', () => {
        rename();
        const snapshot = unsaved.snapshot();
        mounted.modeler.get('commandStack').undo();

        unsaved.markSaved(snapshot);

        expect(unsaved.dirty).toBeTrue();
    });

    it('is clean again after another model was imported', async () => {
        rename();
        await importXml(mounted.modeler, xml);
        await until(() => !unsaved.dirty);

        expect(unsaved.dirty).toBeFalse();
    });

    it('counts an uploaded file as unsaved', () => {
        unsaved.markChanged();

        expect(unsaved.dirty).toBeTrue();
    });
});
