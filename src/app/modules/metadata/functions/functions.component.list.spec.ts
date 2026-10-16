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

import { FunctionsComponent } from './functions.component';
import { FunctionsService } from './shared/functions.service';
import { ConceptsService } from '../concepts/shared/concepts.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeFunctionModel } from '../device-types-overview/shared/device-type.model';

describe('FunctionsComponent list', () => {
    let component: FunctionsComponent;
    let fixture: ComponentFixture<FunctionsComponent>;

    const service: Spy<FunctionsService> = createSpyFromClass<FunctionsService>(FunctionsService);
    const conceptsService: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);
    const deviceTypeService: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const dialogStub = { open: jasmine.createSpy('open') };
    const getTemperature: DeviceTypeFunctionModel = {
        id: 'urn:infai:ses:function:get', name: 'getTemperature', display_name: 'Get temperature', description: '',
        rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction', concept_id: 'urn:infai:ses:concept:temp',
    };

    function init(rights = { update: true, delete: true, create: true }) {
        service.getFunctions.and.returnValue(of({ result: [getTemperature], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        deviceTypeService.userHasUsedInAuthorization.and.returnValue(false);
        dialogStub.open.and.returnValue({ afterClosed: () => of(undefined) });

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, FunctionsComponent],
            providers: [
                { provide: FunctionsService, useValue: service },
                { provide: ConceptsService, useValue: conceptsService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: MatDialog, useValue: dialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(FunctionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getFunctions.calls.reset();
        dialogStub.open.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getFunctions.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getFunctions).toHaveBeenCalledTimes(1);
    }));

    it('takes the create button from the create right, not from the admin role or the delete right', fakeAsync(() => {
        init({ update: true, delete: false, create: true });
        discardPeriodicTasks();
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).not.toBeNull();
    }));

    it('hides the create button and the selection column without the create and delete rights', fakeAsync(() => {
        init({ update: true, delete: false, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('opens the edit dialog on a row click with update permission, the read-only view without it', fakeAsync(() => {
        init();

        component.openFunction(getTemperature);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeUndefined();

        component.userHasUpdateAuthorization = false;
        component.openFunction(getTemperature);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeTrue();
        discardPeriodicTasks();
    }));

    it('shows the function type as a chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('.type-chip').textContent).toBe('Measuring');
    }));
});
