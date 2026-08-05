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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DeviceGroupCriteriaModel } from '../../../../modules/devices/device-groups/shared/device-groups.model';
import { characteristicTypeFloat, FloorplanControlInput, FloorplanControlModel } from '../floorplan.model';
import { CapabilityCommandModel, CapabilityControlComponent } from './capability-control.component';

const criteria = (functionId: string): DeviceGroupCriteriaModel =>
    ({ function_id: functionId, aspect_id: '', device_class_id: '', interaction: '' });

describe('CapabilityControlComponent', () => {
    let component: CapabilityControlComponent;
    let fixture: ComponentFixture<CapabilityControlComponent>;
    let commands: CapabilityCommandModel[];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [CapabilityControlComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CapabilityControlComponent);
        component = fixture.componentInstance;
        commands = [];
        component.run.subscribe(c => commands.push(c));
    });

    /** prepares the component for the given control */
    const init = (control: Partial<FloorplanControlModel>, compact = false) => {
        component.control = {
            criteria: criteria('urn:infai:ses:controlling-function:set-on'),
            label: 'label',
            icon: 'circle',
            input: FloorplanControlInput.Action,
            ...control,
        };
        component.compact = compact;
        component.ngOnInit();
    };

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('runs the function of a control without input', () => {
        init({ input: FloorplanControlInput.Action, criteria: criteria('set-locked') });

        component.perform();

        expect(commands).toEqual([{ criteria: criteria('set-locked'), value: undefined }]);
    });

    describe('a toggle merged from two functions', () => {
        beforeEach(() => init({
            input: FloorplanControlInput.Toggle,
            criteria: criteria('set-on'),
            offCriteria: criteria('set-off'),
            state: false,
        }));

        it('switches on with the on function', () => {
            component.toggle(true);

            expect(commands.map(c => c.criteria.function_id)).toEqual(['set-on']);
        });

        it('switches off with the off function', () => {
            component.toggle(false);

            expect(commands.map(c => c.criteria.function_id)).toEqual(['set-off']);
        });

        it('shows the state it was switched to until the next refresh confirms it', () => {
            expect(component.checked).toBeFalse();

            component.toggle(true);

            expect(component.checked).toBeTrue();
            expect(component.syncing).toBeTrue();
        });
    });

    describe('an input asking for a value', () => {
        const clamped = { name: 'Celsius', display_unit: '°C', type: characteristicTypeFloat, min_value: 5, max_value: 30 };

        it('sends a picked value right away', () => {
            init({ input: FloorplanControlInput.Slider, characteristic: clamped, state: 20 });

            component.commit(23.5);

            expect(commands).toEqual([{ criteria: component.control.criteria, value: 23.5 }]);
        });

        it('waits for the confirmation before sending a typed value', () => {
            init({ input: FloorplanControlInput.Text });

            component.commit('cosy');

            expect(commands).toEqual([]);
            expect(component.draft).toBe('cosy');
        });

        it('sends the typed value once it is confirmed', () => {
            init({ input: FloorplanControlInput.Text });

            component.commit('cosy');
            component.send(component.draft);

            expect(commands).toEqual([{ criteria: component.control.criteria, value: 'cosy' }]);
        });

        it('starts out at the state the placement reads', () => {
            init({ input: FloorplanControlInput.Slider, characteristic: clamped, state: 20 });

            expect(component.draft).toBe(20);
        });
    });

    describe('compact mode', () => {
        it('shows controls that work with a single click', () => {
            init({ input: FloorplanControlInput.Toggle, offCriteria: criteria('set-off') }, true);

            expect(component.visible).toBeTrue();
        });

        it('hides controls that need a value, they are reachable through the dialog', () => {
            init({ input: FloorplanControlInput.Slider }, true);

            expect(component.visible).toBeFalse();
        });

        it('shows every control in full mode', () => {
            init({ input: FloorplanControlInput.Slider }, false);

            expect(component.visible).toBeTrue();
        });
    });
});
