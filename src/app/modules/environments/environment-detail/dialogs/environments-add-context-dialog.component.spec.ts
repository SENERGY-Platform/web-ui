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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AddContextDialogData, EnvironmentsAddContextDialogComponent } from './environments-add-context-dialog.component';
import { CONTEXT_PRESETS } from '../../shared/environments-context-presets';

describe('EnvironmentsAddContextDialogComponent', () => {
    let component: EnvironmentsAddContextDialogComponent;
    let fixture: ComponentFixture<EnvironmentsAddContextDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<EnvironmentsAddContextDialogComponent>>;

    function setup(data: AddContextDialogData): void {
        dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsAddContextDialogComponent],
            imports: [FormsModule, NoopAnimationsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsAddContextDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should create and preselect the first preset with its key', () => {
        setup({ existingKeys: [] });
        expect(component).toBeTruthy();
        expect(component.selected.id).toBe(CONTEXT_PRESETS[0].id);
        expect(component.key).toBe(CONTEXT_PRESETS[0].key);
    });

    it('builds a preview chart for a profile preset, none for a dataset preset', () => {
        setup({ existingKeys: [] });
        const profilePreset = CONTEXT_PRESETS.find((p) => p.source.kind === 'profile')!;
        const datasetPreset = CONTEXT_PRESETS.find((p) => p.source.kind === 'dataset')!;

        component.selectPreset(profilePreset);
        expect(component.chart).toBeDefined();

        component.selectPreset(datasetPreset);
        expect(component.chart).toBeUndefined();
    });

    it('fills the key field with the preset key on selection, changeable afterwards', () => {
        setup({ existingKeys: [] });
        const preset = CONTEXT_PRESETS.find((p) => p.id === 'working-hours')!;
        component.selectPreset(preset);
        expect(component.key).toBe('working_hours');
        component.key = 'my_working_hours';
        expect(component.keyError).toBeUndefined();
    });

    it('rejects an empty key', () => {
        setup({ existingKeys: [] });
        component.key = '  ';
        expect(component.keyError).toBeDefined();
    });

    it('rejects a key that collides with an existing static or driven context key', () => {
        setup({ existingKeys: ['outdoor_temperature', 'working_hours'] });
        component.selectPreset(CONTEXT_PRESETS.find((p) => p.id === 'outdoor-temperature')!);
        expect(component.keyError).toBeDefined();
    });

    it('add() closes with the key and an independent clone of the preset source', () => {
        setup({ existingKeys: [] });
        const preset = CONTEXT_PRESETS.find((p) => p.id === 'outdoor-temperature')!;
        component.selectPreset(preset);
        component.key = 'outdoor_temperature';

        component.add();

        expect(dialogRef.close).toHaveBeenCalledTimes(1);
        const result = dialogRef.close.calls.mostRecent().args[0];
        expect(result.key).toBe('outdoor_temperature');
        expect(result.source).toEqual(preset.source);
        expect(result.source).not.toBe(preset.source);
        expect(result.source.profile).not.toBe(preset.source.profile);
    });

    it('add() does nothing while the key is invalid', () => {
        setup({ existingKeys: [] });
        component.key = '';
        component.add();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('cancel() closes with no result', () => {
        setup({ existingKeys: [] });
        component.cancel();
        expect(dialogRef.close).toHaveBeenCalledWith();
    });
});
