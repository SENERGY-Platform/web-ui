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

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CharacteristicsEditDialogComponent } from './characteristics-edit-dialog.component';
import { CharacteristicsService } from '../shared/characteristics.service';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { DeviceTypeCharacteristicsModel } from '../../device-types-overview/shared/device-type.model';

describe('CharacteristicsEditDialogComponent', () => {
    const bar = {
        id: 'urn:infai:ses:characteristic:bar',
        name: 'Bar',
        display_unit: 'bar',
        type: 'https://schema.org/Float',
        sub_characteristics: [],
    } as unknown as DeviceTypeCharacteristicsModel;

    function create(disabled: boolean) {
        TestBed.configureTestingModule({
            imports: [CharacteristicsEditDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { characteristic: { id: bar.id }, disabled } },
                { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
                // answers synchronously, like a cached response: the element has to exist before the first render
                { provide: CharacteristicsService, useValue: { getCharacteristic: () => of(bar) } },
                { provide: ConceptsService, useValue: {} },
            ],
        });
        return TestBed.createComponent(CharacteristicsEditDialogComponent);
    }

    it('opens an existing characteristic with its values', () => {
        const fixture = create(false);
        expect(() => fixture.detectChanges()).not.toThrow();
        const name = fixture.nativeElement.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
        expect(name.value).toBe('Bar');
    });

    it('opens an existing characteristic read-only', () => {
        const fixture = create(true);
        expect(() => fixture.detectChanges()).not.toThrow();
        const name = fixture.nativeElement.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
        expect(name.value).toBe('Bar');
    });
});
