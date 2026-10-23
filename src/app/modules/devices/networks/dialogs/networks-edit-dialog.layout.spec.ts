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
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { NetworksEditDialogComponent, NetworksEditDialogData } from './networks-edit-dialog.component';
import { HubModel } from '../shared/networks.model';

describe('NetworksEditDialogComponent layout', () => {
    let fixture: ComponentFixture<NetworksEditDialogComponent>;
    let component: NetworksEditDialogComponent;
    let dialogRef: Spy<MatDialogRef<NetworksEditDialogComponent>>;

    const hub = (attributes: HubModel['attributes'] = []): HubModel => ({ id: 'h1', name: 'Gateway', hash: '', owner_id: 'u', device_local_ids: null, device_ids: null, attributes });

    function open(data?: NetworksEditDialogData): void {
        dialogRef = createSpyFromClass<MatDialogRef<NetworksEditDialogComponent>>(MatDialogRef);
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NetworksEditDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        });
        fixture = TestBed.createComponent(NetworksEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const root = () => fixture.nativeElement as HTMLElement;
    const text = (selector: string) => root().querySelector(selector)?.textContent?.trim();

    it('titles the dialog after what the call site does', () => {
        open({ network: hub() });
        expect(text('senergy-dialog-header h2')).toBe('Edit network');
        fixture.destroy();
        TestBed.resetTestingModule();

        open();
        expect(text('senergy-dialog-header h2')).toBe('New network');
        fixture.destroy();
        TestBed.resetTestingModule();

        open({ network: hub(), readOnly: true });
        expect(text('senergy-dialog-header h2')).toBe('Network');
    });

    it('cancels from the close icon of the header', () => {
        open({ network: hub() });

        root().querySelector<HTMLButtonElement>('senergy-dialog-header button.close')!.click();

        expect(dialogRef.close.calls.mostRecent().args).toEqual([]);
    });

    it('puts id, name and attributes on the left and the map on the right', () => {
        open({ network: hub() });

        const [left, right] = Array.from(root().querySelectorAll('.columns > .column'));
        expect(Array.from(left.querySelectorAll('.section-title')).map((t) => t.textContent?.trim())).toEqual(['Network', 'Attributes']);
        expect(Array.from(right.querySelectorAll('.section-title')).map((t) => t.textContent?.trim())).toEqual(['Geo location']);
        expect(right.querySelector('#ol-map')).not.toBeNull();
        expect(right.querySelector('a[href="https://www.openstreetmap.org/copyright"]')).not.toBeNull();
    });

    it('renders the certificate expiration attribute as a locked date with its origin as the tooltip', () => {
        open({ network: hub([{ key: 'senergy/lora/certs-expiration', value: '2027-01-01T00:00:00Z', origin: 'lorawan-connector' }]) });

        const value = root().querySelector<HTMLInputElement>('.attribute input[disabled]');
        expect(value?.value).toContain('2027');
        expect(root().querySelector<HTMLButtonElement>('.attribute button[mat-icon-button]')?.disabled).toBeTrue();
        expect(root().querySelector('.attribute button mat-icon')?.textContent?.trim()).toBe('conversion_path');
    });

    it('builds the map without waiting for a measured layout', () => {
        open({ network: hub([{ key: 'location-lat', value: '51.5', origin: 'web-ui' }, { key: 'location-lon', value: '12.5', origin: 'web-ui' }]) });

        expect(component.mapVectorLayer.getSource()?.getFeatures().length).toBe(1);
        expect(component.mapView.getZoom()).toBe(15);
    });

    it('sizes the map to its container once the layout exists', async () => {
        open({ network: hub() });

        await new Promise((resolve) => setTimeout(resolve, 200));

        const body = root().querySelector<HTMLElement>('.map-body')!;
        expect(body.clientHeight).toBeGreaterThanOrEqual(320);
        expect(component.map.getSize()).toEqual([body.clientWidth, body.clientHeight]);
    });
});
