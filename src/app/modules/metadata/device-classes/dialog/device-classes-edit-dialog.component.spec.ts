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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DeviceClassesEditDialogComponent } from './device-classes-edit-dialog.component';
import { ConceptsService } from '../../concepts/shared/concepts.service';

describe('DeviceClassesEditDialogComponent', () => {
    function create(disabled?: boolean) {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, DeviceClassesEditDialogComponent],
            providers: [
                { provide: ConceptsService, useValue: {} },
                { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
                { provide: MAT_DIALOG_DATA, useValue: { deviceClass: { id: 'a', name: 'Lamp', image: '' }, disabled } },
            ],
        });
        const fixture = TestBed.createComponent(DeviceClassesEditDialogComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('offers Save when editable', () => {
        const fixture = create();

        expect(fixture.componentInstance.deviceClassFormGroup.enabled).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Save');
    });

    it('is read-only without Save when opened with disabled', () => {
        const fixture = create(true);

        expect(fixture.componentInstance.deviceClassFormGroup.enabled).toBeFalse();
        expect(fixture.nativeElement.textContent).not.toContain('Save');
        expect(fixture.nativeElement.textContent).toContain('Close');
    });
});
