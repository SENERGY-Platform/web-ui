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

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { NetworksEditDialogComponent, NetworksEditDialogData } from './networks-edit-dialog.component';

describe('NetworksEditDialogComponent', () => {
    const create = (data?: NetworksEditDialogData) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
                { provide: ChangeDetectorRef, useValue: { markForCheck: () => undefined } },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        });
        return TestBed.runInInjectionContext(() => new NetworksEditDialogComponent());
    };
    const hub = { id: 'h1', name: 'Gateway', hash: '', owner_id: 'u', device_local_ids: null, device_ids: null };

    it('edits the given network', () => {
        const component = create({ network: hub });

        expect(component.readOnly).toBeFalse();
        expect(component.network).toBe(hub);
    });

    it('starts empty when creating', () => {
        const component = create();

        expect(component.readOnly).toBeFalse();
        expect(component.network.id).toBe('');
    });

    it('only shows the network when opened read-only', () => {
        const component = create({ network: hub, readOnly: true });

        expect(component.readOnly).toBeTrue();
    });
});
