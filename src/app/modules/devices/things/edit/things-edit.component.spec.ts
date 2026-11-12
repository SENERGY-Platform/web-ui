/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ThingsEditComponent } from './things-edit.component';
import { ThingsService } from '../shared/things.service';
import { ThingModel } from '../shared/things.model';
import { PermissionsService } from '../../../permissions/shared/permissions.service';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../metadata/concepts/shared/concepts.service';
import { AspectClassesService } from '../../../metadata/aspects/shared/aspect-classes.service';
import { DialogsService } from '../../../../core/services/dialogs.service';

const THING_ID = 'urn:infai:ses:thing:t1';

function storedThing(): ThingModel {
    return {
        id: THING_ID,
        name: 'oven',
        owner_id: 'u1',
        // a field this page does not know, written by another service
        extra_field: { nested: [1, 2] },
        attributes: [
            { key: 'mine', value: '1', origin: 'web-ui' },
            { key: 'power', value: '2000', origin: 'meter-extractor' },
        ],
        content_variables: [
            {
                id: 'cv1',
                name: 'consumption',
                type: 'https://schema.org/StructuredValue',
                is_void: false,
                omit_empty: true,
                serialization_options: ['xml_attribute'],
                sub_content_variables: [
                    {
                        id: 'cv2',
                        name: 'value',
                        type: 'https://schema.org/Float',
                        characteristic_id: 'urn:infai:ses:characteristic:kwh',
                        unit_reference: 'unit',
                        value: 1.5,
                        aspect_ids: ['urn:infai:ses:aspect:a1'],
                        function_id: 'urn:infai:ses:measuring-function:f1',
                        is_void: false,
                        serialization_options: [],
                    },
                ],
            },
            { id: 'cv3', name: 'second root', type: 'https://schema.org/Text', is_void: false, serialization_options: [] },
        ],
        device_links: [{ id: 'l1', device_id: 'd1', from: '2026-01-01T00:00:00Z', until: null }],
    } as ThingModel;
}

describe('ThingsEditComponent', () => {
    let fixture: ComponentFixture<ThingsEditComponent>;
    let component: ThingsEditComponent;
    let things: jasmine.SpyObj<ThingsService>;
    let permissions: jasmine.SpyObj<PermissionsService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let dialogs: jasmine.SpyObj<DialogsService>;
    let router: Router;

    async function setup(options: { id?: string; update?: boolean; create?: boolean; write?: boolean; deviceLink?: boolean; permissionsFail?: boolean } = {}) {
        const { id = THING_ID, update = true, create = true, write = true, deviceLink = true, permissionsFail = false } = options;
        things = jasmine.createSpyObj('ThingsService', [
            'getThing',
            'createThing',
            'updateThing',
            'addDeviceLink',
            'endDeviceLink',
            'userHasCreateAuthorization',
            'userHasUpdateAuthorization',
            'userHasDeviceLinkAuthorization',
        ]);
        things.userHasCreateAuthorization.and.returnValue(create);
        things.userHasUpdateAuthorization.and.returnValue(update);
        things.userHasDeviceLinkAuthorization.and.returnValue(deviceLink);
        things.getThing.and.returnValue(of(storedThing()));
        permissions = jasmine.createSpyObj('PermissionsService', ['getComputedResourcePermissionsV2']);
        permissions.getComputedResourcePermissionsV2.and.returnValue(
            permissionsFail ? throwError(() => new Error('down')) : of([{ id: THING_ID, write } as never]),
        );
        dialog = jasmine.createSpyObj('MatDialog', ['open']);
        dialogs = jasmine.createSpyObj('DialogsService', ['openConfirmDialog']);
        const devices = jasmine.createSpyObj('DeviceInstancesService', ['getDeviceListByIds']);
        devices.getDeviceListByIds.and.returnValue(of([{ id: 'd1', name: 'raw', display_name: 'Meter one' }]));
        const deviceTypes = jasmine.createSpyObj('DeviceTypeService', ['getMeasuringFunctions', 'getAspects']);
        deviceTypes.getMeasuringFunctions.and.returnValue(of([]));
        deviceTypes.getAspects.and.returnValue(of([]));
        const concepts = jasmine.createSpyObj('ConceptsService', ['getConceptsWithCharacteristics']);
        concepts.getConceptsWithCharacteristics.and.returnValue(of({ result: [], total: 0 }));
        const aspectClasses = jasmine.createSpyObj('AspectClassesService', ['userHasReadAuthorization', 'getAspectClasses']);
        aspectClasses.userHasReadAuthorization.and.returnValue(false);

        await TestBed.configureTestingModule({
            imports: [ThingsEditComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
                { provide: ThingsService, useValue: things },
                { provide: PermissionsService, useValue: permissions },
                { provide: DeviceInstancesService, useValue: devices },
                { provide: DeviceTypeService, useValue: deviceTypes },
                { provide: ConceptsService, useValue: concepts },
                { provide: AspectClassesService, useValue: aspectClasses },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatDialog, useValue: dialog },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(ThingsEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
    const buttonTexts = (): string[] => Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => ((b as HTMLElement).textContent || '').trim());

    describe('stored thing with write permission', () => {
        beforeEach(() => setup());

        it('is editable and offers the save bar after a change', () => {
            expect(component.editable).toBeTrue();
            expect(el('senergy-save-bar')).toBeNull();
            component.nameControl.setValue('oven 2');
            fixture.detectChanges();
            expect(el('senergy-save-bar')).not.toBeNull();
        });

        it('sends every unknown field and every content variable field, and no indices', () => {
            const stored = storedThing();
            things.updateThing.and.callFake((t) => of(t));
            component.nameControl.setValue('oven 2');
            component.save();
            expect(things.updateThing).toHaveBeenCalledTimes(1);
            const sent = things.updateThing.calls.mostRecent().args[0];
            expect((sent as unknown as Record<string, unknown>)['extra_field']).toEqual({ nested: [1, 2] });
            expect(sent.owner_id).toBe('u1');
            expect(sent.name).toBe('oven 2');
            expect(sent.content_variables).toEqual(stored.content_variables);
            expect(JSON.stringify(sent)).not.toContain('indices');
        });

        it('takes the answer as the loaded state', () => {
            const answer = { ...storedThing(), name: 'from server' };
            things.updateThing.and.returnValue(of(answer));
            component.nameControl.setValue('oven 2');
            component.save();
            expect(component.savedName).toBe('from server');
            expect(component.nameControl.value).toBe('from server');
            expect(component.hasChanges()).toBeFalse();
        });

        it('keeps the edits when saving fails', () => {
            things.updateThing.and.returnValue(of(null));
            component.nameControl.setValue('oven 2');
            component.save();
            expect(component.nameControl.value).toBe('oven 2');
            expect(component.hasChanges()).toBeTrue();
            expect(component.isSaving).toBeFalse();
        });

        it('does not save without a name', () => {
            component.nameControl.setValue('');
            component.save();
            expect(things.updateThing).not.toHaveBeenCalled();
        });

        it('shows the roots as a list with positions [i]', () => {
            expect(component.dataSource.data.map((r) => r.indices)).toEqual([[0], [1]]);
            expect(component.dataSource.data[0].sub_content_variables?.[0].indices).toEqual([0, 0]);
        });

        it('adds a root at the top level without touching the other fields', () => {
            dialog.open.and.returnValue({
                afterClosed: () => of({ name: 'third', type: 'https://schema.org/Text', is_void: false, serialization_options: [] }),
            } as never);
            component.addContentVariable([]);
            expect(component.dataSource.data.map((r) => r.name)).toEqual(['consumption', 'second root', 'third']);
            expect(component.dataSource.data[2].indices).toEqual([2]);
            const data = dialog.open.calls.mostRecent().args[1]?.data as { prohibitedNames: string[]; allowVoid: boolean; disabled: boolean };
            expect(data.prohibitedNames).toEqual(['consumption', 'second root']);
            expect(data.allowVoid).toBeFalse();
            expect(data.disabled).toBeFalse();
        });

        it('deletes a root and renumbers the following one', () => {
            component.deleteContentVariable([0]);
            expect(component.dataSource.data.map((r) => r.indices)).toEqual([[0]]);
            expect(component.dataSource.data[0].name).toBe('second root');
        });

        it('passes the other roots as prohibited names when editing a root', () => {
            dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);
            component.editContent(component.dataSource.data[1]);
            expect((dialog.open.calls.mostRecent().args[1]?.data as { prohibitedNames: string[] }).prohibitedNames).toEqual(['consumption']);
        });

        it('keeps fields of an edited node that the dialog does not know', () => {
            const root = component.dataSource.data[1] as unknown as Record<string, unknown>;
            root['unknown_cv_field'] = 'keep me';
            dialog.open.and.returnValue({
                afterClosed: () => of({ id: 'cv3', name: 'renamed', indices: [1], type: 'https://schema.org/Text', is_void: false, serialization_options: [] }),
            } as never);
            component.editContent(component.dataSource.data[1]);
            expect(component.dataSource.data[1].name).toBe('renamed');
            expect((component.dataSource.data[1] as unknown as Record<string, unknown>)['unknown_cv_field']).toBe('keep me');
        });

        it('locks attributes of other origins until they are unlocked', async () => {
            const foreign = component.attributes[1];
            expect(component.editableAttribute(component.attributes[0])).toBeTrue();
            expect(component.editableAttribute(foreign)).toBeFalse();
            const valueInputs = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('.attribute input'));
            expect(valueInputs().map((i) => i.disabled)).toEqual([false, false, true, true]);
            const unlock = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) =>
                (b.textContent || '').includes('Unlock attributes of other origins'),
            );
            unlock?.click();
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(component.editableAttribute(foreign)).toBeTrue();
            expect(valueInputs().map((i) => i.disabled)).toEqual([false, false, false, false]);
        });

        it('adds new attributes with the origin web-ui', () => {
            component.addAttr();
            expect(component.attributes[2]).toEqual({ key: '', value: '', origin: 'web-ui' });
        });

        it('shows the device name and open links', () => {
            const text = (el('table.links') as HTMLElement).textContent || '';
            expect(text).toContain('Meter one');
            expect(text).toContain('open');
            expect(buttonTexts()).toContain('End');
            expect(buttonTexts().some((t) => t.includes('Link device'))).toBeTrue();
        });

        it('replaces only the links after linking and keeps an unsaved name change', () => {
            component.nameControl.setValue('unsaved name');
            dialog.open.and.returnValue({ afterClosed: () => of({ device_id: 'd2' }) } as never);
            things.addDeviceLink.and.returnValue(
                of({
                    ...storedThing(),
                    name: 'server name',
                    device_links: [
                        { id: 'l1', device_id: 'd1', from: '2026-01-01T00:00:00Z', until: null },
                        { id: 'l2', device_id: 'd2', from: '2026-02-01T00:00:00Z', until: null },
                    ],
                }),
            );
            component.linkDevice();
            expect(things.addDeviceLink).toHaveBeenCalledOnceWith(THING_ID, { device_id: 'd2' });
            expect(component.links.map((l) => l.id)).toEqual(['l2', 'l1']);
            expect(component.nameControl.value).toBe('unsaved name');
            expect(component.savedName).toBe('oven');
            expect(component.hasChanges()).toBeTrue();
        });

        it('keeps the links when linking fails', () => {
            dialog.open.and.returnValue({ afterClosed: () => of({ device_id: 'd2' }) } as never);
            things.addDeviceLink.and.returnValue(of(null));
            component.linkDevice();
            expect(component.links.length).toBe(1);
            expect(component.isLinking).toBeFalse();
        });

        it('ends a link only after the confirmation', () => {
            dialogs.openConfirmDialog.and.returnValue({ afterClosed: () => of(false) } as never);
            component.endLink(component.links[0]);
            expect(things.endDeviceLink).not.toHaveBeenCalled();

            dialogs.openConfirmDialog.and.returnValue({ afterClosed: () => of(true) } as never);
            things.endDeviceLink.and.returnValue(
                of({ ...storedThing(), device_links: [{ id: 'l1', device_id: 'd1', from: '2026-01-01T00:00:00Z', until: '2026-03-01T00:00:00Z' }] }),
            );
            component.nameControl.setValue('unsaved name');
            component.endLink(component.links[0]);
            expect(things.endDeviceLink).toHaveBeenCalledOnceWith(THING_ID, 'l1');
            expect(component.links[0].until).toBe('2026-03-01T00:00:00Z');
            expect(component.nameControl.value).toBe('unsaved name');
        });

        it('discard loads the thing again and drops the edits', () => {
            component.nameControl.setValue('unsaved name');
            component.addAttr();
            component.discard();
            expect(things.getThing).toHaveBeenCalledTimes(2);
            expect(component.nameControl.value).toBe('oven');
            expect(component.attributes.length).toBe(2);
            expect(component.hasChanges()).toBeFalse();
        });

        it('discard keeps the edits when the reload fails', () => {
            things.getThing.and.returnValue(of(null));
            component.nameControl.setValue('unsaved name');
            component.discard();
            expect(component.nameControl.value).toBe('unsaved name');
            expect(component.isReloading).toBeFalse();
        });
    });

    describe('new thing', () => {
        beforeEach(() => setup({ id: '' }));

        it('is editable with the create right and shows no devices section', () => {
            expect(component.editable).toBeTrue();
            expect(component.hasChanges()).toBeTrue();
            expect(el('table.links')).toBeNull();
            expect(buttonTexts().some((t) => t.includes('Link device'))).toBeFalse();
            expect(permissions.getComputedResourcePermissionsV2).not.toHaveBeenCalled();
        });

        it('creates the thing and opens it', () => {
            things.createThing.and.returnValue(of({ ...storedThing(), id: 'urn:infai:ses:thing:new' }));
            component.nameControl.setValue('fresh');
            component.save();
            expect(things.createThing).toHaveBeenCalledTimes(1);
            expect(things.createThing.calls.mostRecent().args[0].name).toBe('fresh');
            expect(router.navigate).toHaveBeenCalledWith(['devices/things/edit', 'urn:infai:ses:thing:new']);
        });

        it('stays on the page when creating fails', () => {
            things.createThing.and.returnValue(of(null));
            component.nameControl.setValue('fresh');
            component.save();
            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.isSaving).toBeFalse();
        });

        it('discard goes back to the list', () => {
            component.discard();
            expect(router.navigate).toHaveBeenCalledWith(['/devices/things']);
        });
    });

    describe('read-only', () => {
        function expectReadOnly() {
            expect(component.editable).toBeFalse();
            expect(el('senergy-save-bar')).toBeNull();
            expect(component.nameControl.disabled).toBeTrue();
            const texts = buttonTexts();
            expect(texts.some((t) => t.includes('Link device'))).toBeFalse();
            expect(texts).not.toContain('End');
            expect(texts.some((t) => t.includes('Add attribute') || t.includes('Add content variable'))).toBeFalse();
            expect(fixture.nativeElement.querySelector('button[aria-label="Delete content variable"]')).toBeNull();
            // the page still shows the data
            expect(component.links.length).toBe(1);
        }

        it('without the write permission', async () => {
            await setup({ write: false });
            expectReadOnly();
        });

        it('without the update right', async () => {
            await setup({ update: false });
            expectReadOnly();
            expect(permissions.getComputedResourcePermissionsV2).not.toHaveBeenCalled();
        });

        it('when the permissions cannot be read', async () => {
            await setup({ permissionsFail: true });
            expectReadOnly();
        });

        it('opens a node with a disabled dialog', async () => {
            await setup({ write: false });
            dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);
            component.editContent(component.dataSource.data[0]);
            expect((dialog.open.calls.mostRecent().args[1]?.data as { disabled: boolean }).disabled).toBeTrue();
        });
    });

    describe('without the right to link', () => {
        it('offers neither linking nor ending', async () => {
            await setup({ deviceLink: false });
            expect(component.editable).toBeTrue();
            expect(component.canLink).toBeFalse();
            expect(buttonTexts().some((t) => t.includes('Link device'))).toBeFalse();
            expect(buttonTexts()).not.toContain('End');
        });
    });
});
