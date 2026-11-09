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
import { EditableWindow, HeatingScheduleDialogComponent, newWindow, toEditable, toWindows, validate } from './schedule-dialog.component';

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
                { provide: MAT_DIALOG_DATA, useValue: { instance: { id: 'inst-1' }, plan: { windows: [], setback: 17 } } },
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
