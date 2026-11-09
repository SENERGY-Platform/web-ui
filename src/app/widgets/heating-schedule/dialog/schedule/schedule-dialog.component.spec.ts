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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { HeatingWindow, weekSegments } from '../../shared/heating-schedule.plan';
import { HeatingScheduleService } from '../../shared/heating-schedule.service';
import { HeatingZone, serialiseZones } from '../../shared/heating-schedule.zones';
import { EditableWindow, EditableZone, HeatingScheduleDialogComponent, newWindow, newZone, toEditable, toEditableZones, toWindows, toZones, validate, validateZones } from './schedule-dialog.component';

describe('heating schedule editor rules', () => {
    const window = (change: Partial<EditableWindow> = {}): EditableWindow => ({ ...newWindow(), ...change });

    it('accepts the default new window and a setback', () => {
        expect(validate([newWindow()], 17)).toBeNull();
    });

    it('refuses equal times unless the window is all day', () => {
        expect(validate([window({ from: '08:00', to: '08:00' })], 17)).toContain('All day');
        expect(validate([window({ from: '08:00', to: '08:00', allDay: true })], 17)).toBeNull();
    });

    it('limits the temperature to 5 to 30 in half degrees', () => {
        expect(validate([window({ temperature: 4.5 })], 17)).toContain('between 5 and 30');
        expect(validate([window({ temperature: 30.5 })], 17)).toContain('between 5 and 30');
        expect(validate([window({ temperature: 20.3 })], 17)).toContain('between 5 and 30');
        expect(validate([window({ temperature: null })], 17)).toContain('between 5 and 30');
        expect(validate([window({ temperature: 21.5 })], 17)).toBeNull();
    });

    it('requires a weekday and a whole-number setback', () => {
        expect(validate([window({ weekdays: [] })], 17)).toContain('weekday');
        expect(validate([], 16.5)).toContain('whole number');
        expect(validate([], null)).toContain('whole number');
        expect(validate([], 4)).toContain('whole number');
    });

    describe('24:00', () => {
        const meaning = (entry: HeatingWindow) => weekSegments({ windows: [entry], setback: 10 });
        const roundTrip = (from: string, to: string) => {
            const stored: HeatingWindow = { weekdays: [0, 1], from, to, temperature: 20 };
            const edited = toEditable(stored);
            return { stored, edited, written: edited === null ? null : toWindows([edited])[0] };
        };

        for (const [from, to] of [['18:00', '24:00'], ['00:00', '24:00'], ['24:00', '24:00']]) {
            it(`keeps the meaning of ${from} to ${to}`, () => {
                const { stored, written } = roundTrip(from, to);

                expect(written).not.toBeNull();
                expect(meaning(written!)).toEqual(meaning(stored));
            });
        }

        it('shows a whole day as a whole day', () => {
            expect(roundTrip('00:00', '24:00').edited!.allDay).toBeTrue();
            expect(roundTrip('24:00', '24:00').edited!.allDay).toBeTrue();
            expect(roundTrip('18:00', '24:00').edited).toEqual(jasmine.objectContaining({ from: '18:00', to: '00:00', allDay: false }));
        });

        it('refuses a start of 24:00 with another end instead of rewriting it', () => {
            expect(roundTrip('24:00', '06:00').edited).toBeNull();
            expect(roundTrip('24:00', '00:00').edited).toBeNull();
        });
    });

    it('writes all day as equal times and sorts the weekdays', () => {
        expect(toWindows([toEditable({ weekdays: [1, 0], from: '18:00', to: '22:00', temperature: 20 })!, window({ allDay: true })])).toEqual([
            { weekdays: [0, 1], from: '18:00', to: '22:00', temperature: 20 },
            { weekdays: [0, 1, 2, 3, 4], from: '00:00', to: '00:00', temperature: 20 },
        ]);
    });
});

describe('zone editor rules', () => {
    const thermostats = [{ deviceId: 'urn:a', label: 'A' }, { deviceId: 'urn:b', label: 'B' }];
    const zone = (change: Partial<EditableZone> = {}): EditableZone => ({ ...newZone(0), ...change });

    it('accepts one rest zone and a list of zones that share the thermostats', () => {
        expect(validateZones([zone({ rest: true })], 17, thermostats)).toBeNull();
        expect(validateZones([zone({ name: 'X', devices: ['urn:a'] }), zone({ name: 'Y', rest: true })], 17, thermostats)).toBeNull();
    });

    it('refuses a thermostat in two zones', () => {
        expect(validateZones([zone({ name: 'X', devices: ['urn:a'] }), zone({ name: 'Y', devices: ['urn:a'] })], 17, thermostats)).toContain('X');
    });

    it('refuses two rest zones', () => {
        expect(validateZones([zone({ name: 'X', rest: true }), zone({ name: 'Y', rest: true })], 17, thermostats)).toContain('Only one zone');
    });

    it('refuses zone names that are equal after trimming and counts an empty name as its position', () => {
        expect(validateZones([zone({ name: 'Bad', devices: ['urn:a'] }), zone({ name: ' Bad ', devices: ['urn:b'] })], 17, thermostats)).toContain('unique');
        expect(validateZones([zone({ name: '', devices: ['urn:a'] }), zone({ name: 'Zone 1', devices: ['urn:b'] })], 17, thermostats)).toContain('unique');
    });

    it('needs at least one zone with a selected thermostat', () => {
        expect(validateZones([zone({ devices: [] })], 17, thermostats)).toContain('No zone has a thermostat');
        expect(validateZones([zone({ rest: true })], 17, [])).toContain('No zone has a thermostat');
    });

    it('checks the windows of every zone with its name and the own setback only when it is switched on', () => {
        expect(validateZones([zone({ name: 'X', rest: true, windows: [newWindow(), { ...newWindow(), temperature: 40 }] })], 17, thermostats)).toMatch(/^X, Window 2: /);
        expect(validateZones([zone({ rest: true, ownSetback: false, setback: 2 })], 17, thermostats)).toBeNull();
        expect(validateZones([zone({ rest: true, ownSetback: true, setback: 2 })], 17, thermostats)).toContain('own setback');
        expect(validateZones([zone({ rest: true })], null, thermostats)).toContain('setback');
    });

    it('takes the stored zones over and keeps device ids that are not selected', () => {
        const zones = toEditableZones([
            { name: 'Bad', devices: ['urn:a', 'urn:gone'], windows: [{ weekdays: [0], from: '06:00', to: '08:00', temperature: 20 }], setback: 19 },
            { name: 'Rest', devices: null, windows: [], setback: null },
        ], 17)!;

        expect(zones.map((entry) => [entry.name, entry.rest, entry.devices, entry.ownSetback, entry.setback])).toEqual([
            ['Bad', false, ['urn:a', 'urn:gone'], true, 19],
            ['Rest', true, [], false, 17],
        ]);
    });

    it('has no form for a window it cannot show', () => {
        expect(toEditableZones([{ name: 'X', devices: null, windows: [{ weekdays: [0], from: '24:00', to: '06:00', temperature: 20 }], setback: null }], 17)).toBeNull();
    });

    it('writes an unselected device id back unchanged, also after another thermostat is toggled', () => {
        const stored: HeatingZone[] = [{ name: 'Bad', devices: ['urn:gone', 'urn:a'], windows: [], setback: null }, { name: 'Rest', devices: null, windows: [], setback: null }];
        const zones = toEditableZones(stored, 17)!;

        expect(toZones(zones)).toEqual(stored);

        zones[0].devices = zones[0].devices.filter((id) => id !== 'urn:a');
        expect(toZones(zones)[0].devices).toEqual(['urn:gone']);
    });

    it('writes the form back as stored zones and the legacy shape for a lone rest zone', () => {
        expect(toZones([zone({ name: ' Bad ', devices: ['urn:a'], ownSetback: true, setback: 19 }), zone({ name: 'Rest', rest: true })])).toEqual([
            { name: 'Bad', devices: ['urn:a'], windows: [{ weekdays: [0, 1, 2, 3, 4], from: '06:00', to: '08:00', temperature: 20 }], setback: 19 },
            { name: 'Rest', devices: null, windows: [{ weekdays: [0, 1, 2, 3, 4], from: '06:00', to: '08:00', temperature: 20 }], setback: null },
        ]);
        expect(serialiseZones(toZones([zone({ name: 'Alle', rest: true })]))).toBe('{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"08:00","temperature":20}]}');
        expect(serialiseZones(toZones([zone({ name: ' ', rest: true })]))).toContain('{"windows":');
        expect(serialiseZones(toZones([zone({ name: 'Living', rest: true })]))).toMatch(/^\{"zones":\[\{"name":"Living","windows"/);
    });
});

describe('HeatingScheduleDialogComponent zones', () => {
    let fixture: ComponentFixture<HeatingScheduleDialogComponent>;
    let component: HeatingScheduleDialogComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeatingScheduleDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { disableClose: false, close: jasmine.createSpy('close') } },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        instance: { id: 'inst-1' },
                        zones: [{ name: 'Alle', devices: null, windows: [], setback: null }],
                        setback: 17,
                        thermostats: [{ deviceId: 'urn:a', label: 'A' }, { deviceId: 'urn:b', label: 'B' }],
                    },
                },
                { provide: DialogsService, useValue: { openConfirmDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: HeatingScheduleService, useValue: jasmine.createSpyObj('HeatingScheduleService', ['saveSchedule']) },
            ],
        })
            .overrideComponent(HeatingScheduleDialogComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
            .compileComponents();
        fixture = TestBed.createComponent(HeatingScheduleDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('adds a named zone with the default window and keeps the names unique', () => {
        component.addZone();
        component.addZone();

        expect(component.zones.map((zone) => zone.name)).toEqual(['Alle', 'Zone 2', 'Zone 3']);
        expect(component.zones[1].windows).toEqual([newWindow()]);
        expect(component.zones[1].devices).toEqual([]);

        component.removeZone(1);
        component.addZone();

        expect(component.zones.map((zone) => zone.name)).toEqual(['Alle', 'Zone 3', 'Zone 4']);
    });

    it('keeps at least one zone', () => {
        component.removeZone(0);

        expect(component.zones.length).toBe(1);
    });

    it('locks a thermostat that another zone has and the rest toggle while one zone has it', () => {
        component.setRest(component.zones[0], false);
        component.addZone();
        component.setDevice(component.zones[0], 'urn:a', true);

        expect(component.takenBy(component.zones[1], 'urn:a')).toBe('Alle');
        expect(component.takenBy(component.zones[0], 'urn:a')).toBeNull();
        expect(component.restElsewhere(component.zones[1])).toBeFalse();

        component.setRest(component.zones[1], true);

        expect(component.restElsewhere(component.zones[0])).toBeTrue();
        expect(component.restElsewhere(component.zones[1])).toBeFalse();
    });

    it('keeps the thermostats of a zone while it is the rest zone and writes them again after the toggle is off', () => {
        const zone = toEditableZones([{ name: 'Bad', devices: ['urn:gone', 'urn:a'], windows: [], setback: null }], 17)![0];
        component.zones = [zone];

        component.setRest(zone, true);
        expect(toZones(component.zones)[0].devices).toBeNull();

        component.setRest(zone, false);
        expect(toZones(component.zones)[0].devices).toEqual(['urn:gone', 'urn:a']);
    });

    it('does not lock a thermostat for other zones because a rest zone still holds its hidden id', () => {
        component.setRest(component.zones[0], false);
        component.addZone();
        component.setDevice(component.zones[0], 'urn:a', true);
        component.setRest(component.zones[0], true);

        expect(component.takenBy(component.zones[1], 'urn:a')).toBeNull();
    });

    it('adds and removes single thermostats', () => {
        component.setRest(component.zones[0], false);
        component.setDevice(component.zones[0], 'urn:a', true);
        component.setDevice(component.zones[0], 'urn:b', true);
        component.setDevice(component.zones[0], 'urn:a', false);

        expect(component.zones[0].devices).toEqual(['urn:b']);
    });
});

describe('HeatingScheduleDialogComponent save', () => {
    let fixture: ComponentFixture<HeatingScheduleDialogComponent>;
    let dialogRef: { disableClose: boolean; close: jasmine.Spy };
    let saving: Subject<boolean>;
    let service: jasmine.SpyObj<HeatingScheduleService>;

    beforeEach(async () => {
        dialogRef = { disableClose: false, close: jasmine.createSpy('close') };
        saving = new Subject<boolean>();
        service = jasmine.createSpyObj<HeatingScheduleService>('HeatingScheduleService', ['saveSchedule']);
        service.saveSchedule.and.returnValue(saving);
        await TestBed.configureTestingModule({
            imports: [HeatingScheduleDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { instance: { id: 'inst-1' }, zones: [{ name: 'Alle', devices: null, windows: [], setback: null }], setback: 17, thermostats: [{ deviceId: 'urn:a', label: 'A' }] } },
                { provide: DialogsService, useValue: { openConfirmDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: HeatingScheduleService, useValue: service },
            ],
        })
            .overrideComponent(HeatingScheduleDialogComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
            .compileComponents();
        fixture = TestBed.createComponent(HeatingScheduleDialogComponent);
        fixture.detectChanges();
    });

    it('cannot be dismissed while the save runs and closes with true after it', () => {
        fixture.componentInstance.save();

        expect(service.saveSchedule).toHaveBeenCalledOnceWith('inst-1', '{"windows":[]}', 17);
        expect(dialogRef.disableClose).toBeTrue();
        fixture.componentInstance.close();
        expect(dialogRef.close).not.toHaveBeenCalled();

        saving.next(true);

        expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });

    it('can be dismissed again when the save failed', () => {
        fixture.componentInstance.save();
        saving.next(false);

        expect(dialogRef.disableClose).toBeFalse();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });
});
