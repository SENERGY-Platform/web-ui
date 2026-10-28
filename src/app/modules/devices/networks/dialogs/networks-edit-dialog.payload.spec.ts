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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Point } from 'ol/geom';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { NetworksEditDialogComponent, NetworksEditDialogData } from './networks-edit-dialog.component';
import { HubModel } from '../shared/networks.model';

/**
 * The dialog closes with the network that the service sends as the request body: attributes as edited, the
 * location as the `location-lat` and `location-lon` attributes (strings, origin 'web-ui').
 */
describe('NetworksEditDialogComponent saved network', () => {
    let fixture: ComponentFixture<NetworksEditDialogComponent>;
    let component: NetworksEditDialogComponent;
    let dialogRef: Spy<MatDialogRef<NetworksEditDialogComponent>>;

    const stored = (): HubModel => ({
        id: 'h1',
        name: 'Gateway',
        hash: 'abc',
        owner_id: 'u1',
        device_local_ids: ['l1'],
        device_ids: ['d1'],
        attributes: [
            { key: 'last_message_max_age', value: '5m', origin: 'web-ui' },
            { key: 'location-lat', value: '51.5', origin: 'web-ui' },
            { key: 'location-lon', value: '12.25', origin: 'web-ui' },
            { key: 'gateway/model', value: 'x1', origin: 'lorawan-connector' },
        ],
    });

    function configure(data?: NetworksEditDialogData): void {
        dialogRef = createSpyFromClass<MatDialogRef<NetworksEditDialogComponent>>(MatDialogRef);
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NetworksEditDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        });
    }

    /** Opens the dialog and waits until the map is built, which retries on a timer until the layout exists. */
    async function open(data?: NetworksEditDialogData): Promise<void> {
        configure(data);
        fixture = TestBed.createComponent(NetworksEditDialogComponent);
        component = fixture.componentInstance;
        // the map height is computed from the layout in the template, which changes between the two passes
        fixture.detectChanges(false);
        await new Promise((resolve) => setTimeout(resolve, 300));
        fixture.detectChanges(false);
    }

    const root = () => fixture.nativeElement as HTMLElement;
    const field = (label: string): HTMLInputElement | null => {
        const formField = Array.from(root().querySelectorAll('mat-form-field')).find((f) => f.querySelector('mat-label')?.textContent?.trim() === label);
        return formField?.querySelector('input') ?? null;
    };
    const sentNetwork = (): HubModel => {
        expect(dialogRef.close.calls.count()).toBe(1);
        return dialogRef.close.calls.mostRecent().args[0];
    };

    /** Moves the marker the way a drag does and fires the end of the drag. */
    function dropMarker(lon: number, lat: number): void {
        const feature = component.mapVectorLayer.getSource()?.getFeatures()[0];
        (feature?.getGeometry() as Point).setCoordinates([lon, lat]);
        component.translateInteraction?.dispatchEvent('translateend');
    }

    it('closes with the stored network and its attributes untouched', async () => {
        await open({ network: stored() });

        component.save();

        expect(sentNetwork()).toEqual(stored());
    });

    it('sends the renamed network and the edited and added attributes', async () => {
        await open({ network: stored() });
        const name = field('Name');
        name!.value = 'Renamed';
        name!.dispatchEvent(new Event('input'));
        const value = field('Value');
        value!.value = '10m';
        value!.dispatchEvent(new Event('input'));
        fixture.detectChanges(false);

        component.addAttr();
        component.network.attributes![4].key = 'senergy/lora/eui';
        component.network.attributes![4].value = '70b3d5';
        component.save();

        const expected = stored();
        expected.name = 'Renamed';
        expected.attributes![0].value = '10m';
        expected.attributes!.push({ key: 'senergy/lora/eui', value: '70b3d5', origin: 'web-ui' });
        expect(sentNetwork()).toEqual(expected);
    });

    it('removes an attribute with its delete button', async () => {
        await open({ network: stored() });

        root().querySelector<HTMLButtonElement>('.attribute button[mat-icon-button]')!.click();
        component.save();

        expect(sentNetwork().attributes?.map((a) => a.key)).toEqual(['location-lat', 'location-lon', 'gateway/model']);
    });

    it('shows no field for the location attributes and locks the attributes of other services', async () => {
        await open({ network: stored() });

        const keys = Array.from(root().querySelectorAll('.attribute mat-form-field')).filter((f) => f.querySelector('mat-label')?.textContent?.trim() === 'Key');
        expect(keys.length).toBe(2);
        const buttons = Array.from(root().querySelectorAll<HTMLButtonElement>('.attribute button[mat-icon-button]'));
        expect(buttons.map((b) => b.disabled)).toEqual([false, true]);
        expect(buttons[1].textContent?.trim()).toBe('conversion_path');
    });

    it('moves the existing location attributes when the marker is dropped', async () => {
        await open({ network: stored() });

        dropMarker(13.5, 52.25);
        component.save();

        const attributes = sentNetwork().attributes;
        expect(attributes?.find((a) => a.key === 'location-lat')).toEqual({ key: 'location-lat', value: '52.25', origin: 'web-ui' });
        expect(attributes?.find((a) => a.key === 'location-lon')).toEqual({ key: 'location-lon', value: '13.5', origin: 'web-ui' });
        expect(attributes?.length).toBe(4);
    });

    it('sends a new network with its location as attributes once the marker is dropped', async () => {
        await open();
        const name = field('Name');
        name!.value = 'New gateway';
        name!.dispatchEvent(new Event('input'));

        dropMarker(12.5, 51.5);
        component.save();

        expect(sentNetwork()).toEqual({
            id: '',
            name: 'New gateway',
            hash: '',
            owner_id: '',
            device_local_ids: null,
            device_ids: null,
            attributes: [
                { key: 'location-lat', value: '51.5', origin: 'web-ui' },
                { key: 'location-lon', value: '12.5', origin: 'web-ui' },
            ],
        });
    });

    it('sends a new network without attributes when the marker was not moved', async () => {
        await open();

        component.save();

        expect(sentNetwork().attributes).toBeUndefined();
    });

    const inactiveToggle = () => root().querySelector('mat-slide-toggle') as HTMLElement;
    const toggleInactive = () => {
        inactiveToggle().querySelector<HTMLButtonElement>('button[role="switch"]')!.click();
        fixture.detectChanges(false);
    };

    it('adds the inactive attribute with origin web-ui when the toggle is switched on and leaves the others alone', async () => {
        await open({ network: stored() });

        toggleInactive();
        component.save();

        const expected = stored();
        expected.attributes!.push({ key: 'inactive', value: 'true', origin: 'web-ui' });
        expect(sentNetwork()).toEqual(expected);
    });

    it('removes the inactive attribute when the toggle is switched off and leaves the others alone', async () => {
        const network = stored();
        network.attributes!.splice(1, 0, { key: 'inactive', value: 'true', origin: 'web-ui' });
        await open({ network });
        expect(inactiveToggle().classList).toContain('mat-mdc-slide-toggle-checked');

        toggleInactive();
        component.save();

        expect(sentNetwork()).toEqual(stored());
    });

    it('sends an inactive attribute that was not touched as it was and lists it only by the toggle', async () => {
        const network = stored();
        network.attributes!.push({ key: 'inactive', value: 'true', origin: 'lorawan-connector' });
        await open({ network });

        const keys = Array.from(root().querySelectorAll('.attribute mtx-select')).length;
        component.save();

        expect(keys).toBe(2);
        expect(sentNetwork().attributes?.find((a) => a.key === 'inactive')).toEqual({ key: 'inactive', value: 'true', origin: 'lorawan-connector' });
    });

    it('offers only Close and no editing when opened read-only', async () => {
        await open({ network: stored(), readOnly: true });

        const buttons = Array.from(root().querySelectorAll('mat-dialog-actions button')).map((b) => b.textContent?.trim());
        expect(buttons).toEqual(['Close']);
        expect(field('Name')?.disabled).toBeTrue();
        expect(inactiveToggle().querySelector<HTMLButtonElement>('button[role="switch"]')?.disabled).toBeTrue();
        expect(component.translateInteraction?.getActive()).toBeFalse();
        expect(root().textContent).not.toContain('Add attribute');
    });
});
