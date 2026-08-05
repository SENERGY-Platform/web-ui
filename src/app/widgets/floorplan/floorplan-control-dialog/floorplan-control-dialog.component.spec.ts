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

import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { DeviceGroupCriteriaModel } from '../../../modules/devices/device-groups/shared/device-groups.model';
import { CapabilityCommandModel, CapabilityControlComponent } from '../shared/capability-control/capability-control.component';
import { CharacteristicInputComponent } from '../shared/characteristic-input/characteristic-input.component';
import { characteristicTypeFloat, FloorplanControlInput, FloorplanControlModel } from '../shared/floorplan.model';
import { FloorplanControlDialogComponent } from './floorplan-control-dialog.component';

const criteria = (functionId: string): DeviceGroupCriteriaModel =>
    ({ function_id: functionId, aspect_id: '', device_class_id: '', interaction: '' });

const setPosition = 'urn:infai:ses:controlling-function:set-position';

const control: FloorplanControlModel = {
    criteria: criteria(setPosition),
    label: 'Set Relative Position Motorized Curtain',
    icon: 'tune',
    input: FloorplanControlInput.Slider,
    characteristic: { name: 'Percent', display_unit: '%', type: characteristicTypeFloat, min_value: 0, max_value: 100 },
    state: 0,
};

describe('FloorplanControlDialogComponent', () => {
    let component: FloorplanControlDialogComponent;
    let fixture: ComponentFixture<FloorplanControlDialogComponent>;
    let commands: CapabilityCommandModel[];
    let answer: () => Observable<unknown>;

    beforeEach(waitForAsync(() => {
        commands = [];
        answer = () => of(null);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CommonModule, FormsModule],
            // the real controls, so the bindings the dialog puts on them are exercised
            declarations: [FloorplanControlDialogComponent, CapabilityControlComponent, CharacteristicInputComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close: () => undefined } },
                {
                    provide: MAT_DIALOG_DATA, useValue: {
                        alias: 'Rollo Arbeitszimmer',
                        controls: [control],
                        run: (command: CapabilityCommandModel) => {
                            commands.push(command);
                            return answer();
                        },
                    },
                },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FloorplanControlDialogComponent);
        component = fixture.componentInstance;
    });

    it('shows the controls of the placement', () => {
        expect(component.alias).toBe('Rollo Arbeitszimmer');
        expect(component.controls).toEqual([control]);
    });

    it('sends every value the user sets, not only the first one', () => {
        component.perform({ criteria: criteria(setPosition), value: 40 });
        component.perform({ criteria: criteria(setPosition), value: 70 });

        expect(commands.map(c => c.value)).toEqual([40, 70]);
    });

    it('keeps sending after a command failed', () => {
        answer = () => throwError(() => new Error('device unreachable'));
        spyOn(console, 'error');
        component.perform({ criteria: criteria(setPosition), value: 40 });

        answer = () => of(null);
        component.perform({ criteria: criteria(setPosition), value: 70 });

        expect(commands.map(c => c.value)).toEqual([40, 70]);
    });

    it('leaves its controls usable after a command failed', () => {
        // a dialog waiting on a broken command used to disable every control, so it could be used once
        answer = () => throwError(() => new Error('device unreachable'));
        spyOn(console, 'error');
        fixture.detectChanges();

        component.perform({ criteria: criteria(setPosition), value: 40 });
        fixture.detectChanges();

        const rendered = fixture.debugElement.query(By.directive(CapabilityControlComponent));
        expect((rendered.componentInstance as CapabilityControlComponent).disabled).toBeFalse();
    });

    it('leaves the controls alone while a command runs', () => {
        // rebuilding them would reset the slider to the position the curtain is still leaving
        const before = component.controls;

        component.perform({ criteria: criteria(setPosition), value: 40 });

        expect(component.controls).toBe(before);
        expect(component.controls[0].state).toBe(0);
    });
});
