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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { CharacteristicsComponent } from './characteristics.component';
import { CharacteristicsService } from './shared/characteristics.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeCharacteristicsModel } from '../device-types-overview/shared/device-type.model';
import { ConceptsPermSearchModel } from '../concepts/shared/concepts-perm-search.model';
import { CharacteristicsPermSearchModel } from './shared/characteristics-perm-search.model';

describe('CharacteristicsComponent list', () => {
    let component: CharacteristicsComponent;
    let fixture: ComponentFixture<CharacteristicsComponent>;

    const service: Spy<CharacteristicsService> = createSpyFromClass<CharacteristicsService>(CharacteristicsService);
    const deviceTypeService: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const dialogStub = { open: jasmine.createSpy('open') };
    const temperature = { id: 'urn:infai:ses:characteristic:1', name: 'Celsius', display_unit: '°C', type: 'https://schema.org/Float' } as DeviceTypeCharacteristicsModel;

    function init(rights = { update: true, delete: true, create: true }) {
        service.getCharacteristics.and.returnValue(of({ result: [temperature], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        deviceTypeService.userHasUsedInAuthorization.and.returnValue(false);
        dialogStub.open.and.returnValue({ afterClosed: () => of(undefined) });

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, CharacteristicsComponent],
            providers: [
                { provide: CharacteristicsService, useValue: service },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: MatDialog, useValue: dialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CharacteristicsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getCharacteristics.calls.reset();
        dialogStub.open.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getCharacteristics.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getCharacteristics).toHaveBeenCalledTimes(1);
    }));

    it('shows the create button from the create right and the selection column from the delete right', fakeAsync(() => {
        init({ update: true, delete: false, create: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).not.toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('hides the create button without the create right', fakeAsync(() => {
        init({ update: true, delete: true, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
        expect(component.displayedColumns).toContain('select');
    }));

    it('opens the edit dialog on a row click with update permission, the read-only view without it', fakeAsync(() => {
        init();
        const row = temperature as unknown as CharacteristicsPermSearchModel;

        component.openCharacteristic(row);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeUndefined();

        component.userHasUpdateAuthorization = false;
        component.openCharacteristic(row);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeTrue();
        discardPeriodicTasks();
    }));

    it('names the schema.org type without its namespace', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.typeLabel('https://schema.org/Float')).toBe('Float');
        expect(fixture.nativeElement.querySelector('.type-chip').textContent).toBe('Float');
    }));

    it('shows the name of the concept it was opened for as a filter chip', fakeAsync(() => {
        init();
        component.routerConcept = { id: 'urn:infai:ses:concept:1', name: 'Temperature', characteristic_ids: [] } as unknown as ConceptsPermSearchModel;
        component.selectedTag = 'Temperature';
        fixture.detectChanges();
        discardPeriodicTasks();

        const chip = fixture.nativeElement.querySelector('mat-chip-set');
        expect(chip.textContent).toContain('Concept: Temperature');
        expect(chip.textContent).not.toContain('urn:');
    }));
});
