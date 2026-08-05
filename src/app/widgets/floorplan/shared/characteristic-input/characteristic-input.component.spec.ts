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
import { DeviceTypeCharacteristicsModel } from '../../../../modules/metadata/device-types-overview/shared/device-type.model';
import {
    characteristicTypeBoolean,
    characteristicTypeFloat,
    characteristicTypeInteger,
    characteristicTypeList,
    characteristicTypeStructure,
    characteristicTypeText,
} from '../floorplan.model';
import { CharacteristicInputComponent, defaultCharacteristicValue } from './characteristic-input.component';

const characteristic = (overwrite: Partial<DeviceTypeCharacteristicsModel>): DeviceTypeCharacteristicsModel => ({
    name: 'characteristic',
    display_unit: '',
    type: characteristicTypeText,
    ...overwrite,
});

const rgb = characteristic({
    name: 'rgb',
    type: characteristicTypeStructure,
    sub_characteristics: [
        characteristic({ name: 'r', type: characteristicTypeInteger, min_value: 0, max_value: 255 }),
        characteristic({ name: 'g', type: characteristicTypeInteger, min_value: 0, max_value: 255 }),
        characteristic({ name: 'b', type: characteristicTypeInteger, min_value: 0, max_value: 255 }),
    ],
});

describe('CharacteristicInputComponent', () => {
    let component: CharacteristicInputComponent;
    let fixture: ComponentFixture<CharacteristicInputComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [CharacteristicInputComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CharacteristicInputComponent);
        component = fixture.componentInstance;
    });

    const init = (c: DeviceTypeCharacteristicsModel, value?: any) => {
        component.characteristic = c;
        component.value = value;
        component.ngOnInit();
    };

    describe('defaultCharacteristicValue', () => {
        it('fills a structure with an entry per field, so nothing is sent as missing', () => {
            expect(defaultCharacteristicValue(rgb)).toEqual({ r: 0, g: 0, b: 0 });
        });

        it('starts a clamped number at its minimum', () => {
            expect(defaultCharacteristicValue(characteristic({ type: characteristicTypeInteger, min_value: 5, max_value: 30 }))).toBe(5);
        });

        it('starts a boolean as false', () => {
            expect(defaultCharacteristicValue(characteristic({ type: characteristicTypeBoolean }))).toBeFalse();
        });

        it('starts an enumeration at its first allowed value', () => {
            expect(defaultCharacteristicValue(characteristic({ allowed_values: ['AUTO', 'LOW'] }))).toBe('AUTO');
        });

        it('starts a list out empty', () => {
            expect(defaultCharacteristicValue(characteristic({ type: characteristicTypeList }))).toEqual([]);
        });
    });

    describe('a structure', () => {
        it('keeps the other fields when one of them changes', () => {
            init(rgb, { r: 10, g: 20, b: 30 });

            component.setChild('g', 99);

            expect(component.value).toEqual({ r: 10, g: 99, b: 30 });
        });

        it('reads the value of a field', () => {
            init(rgb, { r: 10, g: 20, b: 30 });

            expect(component.childValue('b')).toBe(30);
        });

        it('starts out complete when it has no value yet', () => {
            init(rgb);

            expect(component.value).toEqual({ r: 0, g: 0, b: 0 });
        });
    });

    describe('a list', () => {
        const list = characteristic({
            type: characteristicTypeList,
            sub_characteristics: [characteristic({ name: 'entry', type: characteristicTypeInteger, min_value: 1, max_value: 9 })],
        });

        it('appends an entry in the shape of its entry type', () => {
            init(list, []);

            component.addEntry();

            expect(component.value).toEqual([1]);
        });

        it('changes one entry without touching the others', () => {
            init(list, [1, 2, 3]);

            component.setEntry(1, 8);

            expect(component.value).toEqual([1, 8, 3]);
        });

        it('removes the entry at the given position', () => {
            init(list, [1, 2, 3]);

            component.removeEntry(0);

            expect(component.value).toEqual([2, 3]);
        });
    });

    describe('bounds on the step grid', () => {
        it('keeps bounds that already sit on the grid', () => {
            init(characteristic({ type: characteristicTypeFloat, min_value: 15, max_value: 30 }));

            expect(component.step).toBe(0.5);
            expect(component.boundMin).toBe(15);
            expect(component.boundMax).toBe(30);
        });

        it('moves a fractional minimum onto the grid, so stepping lands on whole values', () => {
            // an input counts its steps from min: with min -273.15, stepping 17 down would give 16.85
            init(characteristic({ type: characteristicTypeFloat, min_value: -273.15 }), 17);

            expect(component.step).toBe(1);
            expect(component.boundMin).toBe(-273);
        });

        it('moves the bounds inwards, so every reachable value stays allowed', () => {
            init(characteristic({ type: characteristicTypeInteger, min_value: 0.4, max_value: 9.6 }));

            expect(component.boundMin).toBe(1);
            expect(component.boundMax).toBe(9);
        });

        it('leaves a bound the characteristic does not set unbound', () => {
            init(characteristic({ type: characteristicTypeFloat, min_value: -273.15 }), 17);

            expect(component.boundMax).toBeNull();
        });

        it('starts an unset numeric field on the grid instead of at a fractional bound', () => {
            init(characteristic({ type: characteristicTypeFloat, min_value: -273.15 }));

            expect(component.value).toBe(-273);
        });
    });

    describe('committing a value', () => {
        it('passes the value on', () => {
            const committed: any[] = [];
            init(characteristic({ type: characteristicTypeInteger, min_value: 0, max_value: 10 }), 3);
            component.commit.subscribe(v => committed.push(v));

            component.commitValue(7);

            expect(committed).toEqual([7]);
        });

        it('sends every value the user commits, so a second change takes effect too', () => {
            const committed: any[] = [];
            init(characteristic({ type: characteristicTypeInteger, min_value: 0, max_value: 10 }), 3);
            component.commit.subscribe(v => committed.push(v));

            component.commitValue(7);
            component.commitValue(9);

            expect(committed).toEqual([7, 9]);
        });

        it('sends a repeated value again, for a device that did not carry out the last command', () => {
            const committed: any[] = [];
            init(characteristic({ type: characteristicTypeInteger, min_value: 0, max_value: 10 }), 3);
            component.commit.subscribe(v => committed.push(v));

            component.commitValue(7);
            component.commitValue(7);

            expect(committed).toEqual([7, 7]);
        });
    });
});
