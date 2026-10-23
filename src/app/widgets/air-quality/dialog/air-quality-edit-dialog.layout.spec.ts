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

import { ApplicationRef } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatStepper } from '@angular/material/stepper';
import { of } from 'rxjs';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { createMeasurementCatalogue, createPollenCatalogue } from '../shared/air-quality-catalogue';
import { AirQualityPropertiesModel } from '../shared/air-quality.model';
import { AirQualityDialogSpies, configureAirQualityDialogTestBed } from './air-quality-dialog-testbed.mock';

describe('AirQualityEditDialogComponent list and detail', () => {
    let fixture: ComponentFixture<AirQualityEditDialogComponent>;
    let component: AirQualityEditDialogComponent;
    let spies: AirQualityDialogSpies;

    /** PM10 and CO2 enabled; Hum., Temp., Pressure and Precipitation are listed for their online data, the rest is not; Birke is the one pollen entry. */
    function stored(unfinished = false): AirQualityPropertiesModel {
        const measurements = createMeasurementCatalogue();
        const by = (name: string) => measurements.find((m) => m.short_name === name)!;
        by('PM10').is_enabled = true;
        by('CO2').is_enabled = true;
        if (unfinished) {
            by('CO2').boundaries.warn.upper = null as unknown as number;
        }
        const pollen = createPollenCatalogue();
        pollen[1].is_enabled = true;
        return { measurements, pollen, location: { latitude: 51.5, longitude: 12.25 }, formatted_address: 'Leipzig, SN, DE', version: 4 };
    }

    beforeEach(() => {
        spies = configureAirQualityDialogTestBed();
    });

    function open(properties: AirQualityPropertiesModel = stored(true), activateStep4 = true): void {
        const widget = { id: 'widget1', name: 'Air', type: 'air_quality', properties: structuredClone(properties) } as unknown as WidgetModel;
        spies.dashboard.getWidget.and.returnValue(of(widget));
        fixture = TestBed.createComponent(AirQualityEditDialogComponent);
        component = fixture.componentInstance;
        settle();
        if (activateStep4) {
            stepper().selectedIndex = 3;
            settle();
        }
    }

    const stepper = () => fixture.debugElement.query(By.directive(MatStepper)).componentInstance as MatStepper;

    function settle(): void {
        fixture.detectChanges();
        flush();
        fixture.detectChanges();
        TestBed.inject(ApplicationRef).tick();
    }

    const root = () => fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(root().querySelectorAll<HTMLElement>('.entry-row'));
    const labels = () => rows().map((row) => row.querySelector('.entry-label')?.textContent?.trim());
    /** What the user sees: forms of entries that are not selected stay in the DOM, hidden. */
    const visible = (selector: string) => Array.from(root().querySelectorAll<HTMLInputElement>(selector)).filter((e) => e.closest('.ly-hidden') === null);
    const inDetail = (selector: string) => visible('.detail-panel ' + selector);
    const titles = () => visible('senergy-form-section .section-title').map((t) => t.textContent?.trim());
    const click = (element: Element | null | undefined) => {
        (element as HTMLElement).click();
        settle();
    };
    const key = (element: Element, name: string) => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        settle();
    };

    it('lists the enabled measurements and measurements with online data, then the pollen entries, with their kind', fakeAsync(() => {
        open();

        expect(labels()).toEqual(['PM10', 'CO2', 'Hum.', 'Temp.', 'Pressure', 'Precipitation (1 h)', 'Birke']);
        expect(rows().map((row) => row.querySelector('.entry-sub')?.textContent?.trim())).toEqual([...Array(6).fill('Measurement'), 'Pollen warning']);
        expect(Array.from(root().querySelectorAll('.entry-heading')).map((h) => h.textContent?.trim())).toEqual(['Measurements', 'Pollen']);
        expect(rows().map((row) => row.querySelector('.entry-online') !== null)).toEqual([false, false, true, true, true, true, false]);
    }));

    it('renders the entry name as markup from the catalogue', fakeAsync(() => {
        open();

        expect(rows()[1].querySelector('.entry-label sub')?.textContent).toBe('2');
    }));

    it('selects the first entry and shows its sections only', fakeAsync(() => {
        open();

        expect(rows()[0].classList).toContain('selected');
        expect(rows()[0].getAttribute('aria-selected')).toBe('true');
        expect(rows().slice(1).every((row) => row.getAttribute('aria-selected') === 'false')).toBeTrue();
        expect(titles()).toEqual(['Inside measurement', 'Outside measurement', 'Warning thresholds']);
        expect(visible('input[type="number"]').length).toBe(4);
    }));

    it('shows the selected entry and keeps the forms shown once while another entry is selected', fakeAsync(() => {
        open();
        expect(root().querySelectorAll('input[type="number"]').length).toBe(4);

        click(rows()[1]);
        expect(rows()[1].classList).toContain('selected');
        expect(root().querySelectorAll('input[type="number"]').length).toBe(8);
        expect(visible('input[type="number"]').length).toBe(4);

        click(rows()[6]);
        expect(titles()).toEqual(['Warning levels']);
        expect(visible('input[type="number"]').length).toBe(0);
        expect(inDetail('mtx-select').length).toBe(2);

        click(rows()[0]);
        expect(titles()).toEqual(['Inside measurement', 'Outside measurement', 'Warning thresholds']);
    }));

    it('selects a row with Enter and Space', fakeAsync(() => {
        open();

        key(rows()[2], 'Enter');
        expect(rows()[2].getAttribute('aria-selected')).toBe('true');
        expect(rows()[0].getAttribute('aria-selected')).toBe('false');

        key(rows()[1], ' ');
        expect(rows()[1].getAttribute('aria-selected')).toBe('true');
        expect(rows()[2].getAttribute('aria-selected')).toBe('false');
    }));

    it('marks an entry with an empty threshold and no other', fakeAsync(() => {
        open();

        expect(rows().map((row) => row.querySelector('.entry-warning') !== null)).toEqual([false, true, false, false, false, false, false]);

        component.measurements.find((m) => m.short_name === 'CO2')!.boundaries.warn.upper = 1000;
        settle();
        expect(rows().map((row) => row.querySelector('.entry-warning') !== null)).toEqual([false, false, false, false, false, false, false]);

        component.pollen[1].boundaries.critical.upper = null as unknown as number;
        settle();
        expect(rows().map((row) => row.querySelector('.entry-warning') !== null)).toEqual([false, false, false, false, false, false, true]);
    }));

    it('writes an edited threshold into the entry that is sent', fakeAsync(() => {
        open(stored());

        const warnUpper = visible('input[type="number"]')[1];
        warnUpper.value = '33';
        warnUpper.dispatchEvent(new Event('input'));
        settle();
        component.save();

        const sent = spies.dashboard.updateWidgetProperty.calls.mostRecent().args[3] as AirQualityPropertiesModel;
        expect(sent.measurements![0].boundaries).toEqual({ warn: { lower: 0, upper: 33 }, critical: { lower: 0, upper: 50 } });
    }));

    it('enables the inside measurement of an entry offered with online data and then shows the sources', fakeAsync(() => {
        open();
        click(rows()[2]);
        expect(inDetail('mtx-select').length).toBe(0);

        click(inDetail('mat-slide-toggle button')[0]);

        expect(component.measurements.find((m) => m.short_name === 'Hum.')!.is_enabled).toBeTrue();
        expect(inDetail('mtx-select').length).toBe(5);
    }));

    it('says so when nothing is enabled', fakeAsync(() => {
        const none = stored();
        none.measurements!.forEach((m) => (m.is_enabled = false, m.can_web = false));
        none.pollen!.forEach((p) => (p.is_enabled = false));
        open(none);

        expect(rows().length).toBe(0);
        expect(root().querySelector('senergy-empty-state')).not.toBeNull();
        expect(root().querySelectorAll('senergy-form-section').length).toBe(0);
    }));

    it('scrolls step 4 to the top of the content when it becomes the active step, and not for other steps', fakeAsync(() => {
        open(stored(), false);
        const content = root().querySelector<HTMLElement>('mat-dialog-content')!;
        content.style.height = '200px';
        content.style.overflow = 'auto';
        const header = (index: number) => root().querySelectorAll('mat-step-header')[index].getBoundingClientRect().top;

        stepper().selectedIndex = 3;
        settle();
        expect(content.scrollTop).toBeGreaterThan(0);
        expect(Math.abs(header(3) - content.getBoundingClientRect().top)).toBeLessThan(2);

        content.scrollTop = 0;
        stepper().selectedIndex = 2;
        settle();
        expect(content.scrollTop).toBe(0);
    }));
});
