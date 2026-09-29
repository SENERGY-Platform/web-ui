/*
 * Copyright 2020 InfAI (CC SES)
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


import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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
import { AuthorizationService } from '../../../core/services/authorization.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeConceptModel, DeviceTypeFunctionModel } from '../device-types-overview/shared/device-type.model';

describe('FunctionsComponent concept filter', () => {
    const functionsServiceSpy: Spy<FunctionsService> = createSpyFromClass<FunctionsService>(FunctionsService);
    const conceptsServiceSpy: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);
    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const authServiceSpy: Spy<AuthorizationService> = createSpyFromClass<AuthorizationService>(AuthorizationService);
    const temperature: DeviceTypeConceptModel = {id: 'urn:infai:ses:concept:temp', name: 'Temperature', base_characteristic_id: '', characteristic_ids: []};
    const pressure: DeviceTypeConceptModel = {id: 'urn:infai:ses:concept:pressure', name: 'Pressure', base_characteristic_id: '', characteristic_ids: []};
    const getTemperature: DeviceTypeFunctionModel = {
        id: 'urn:infai:ses:function:get', name: 'Get-Temperature', display_name: '', description: '', rdf_type: '', concept_id: temperature.id,
    };

    let harness: RouterTestingHarness;
    let component: FunctionsComponent;

    async function open(url: string): Promise<FunctionsComponent> {
        functionsServiceSpy.getFunctions.and.returnValue(of({result: [getTemperature], total: 1}));
        conceptsServiceSpy.getConceptWithoutCharacteristics.and.callFake((id: string) =>
            of([temperature, pressure].find((c) => c.id === id) || null),
        );
        deviceTypeServiceSpy.userHasUsedInAuthorization.and.returnValue(false);
        authServiceSpy.userIsAdmin.and.returnValue(false);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule],
            declarations: [FunctionsComponent],
            providers: [
                provideRouter([{path: 'metadata/functions', component: FunctionsComponent}]),
                {provide: FunctionsService, useValue: functionsServiceSpy},
                {provide: ConceptsService, useValue: conceptsServiceSpy},
                {provide: DeviceTypeService, useValue: deviceTypeServiceSpy},
                {provide: AuthorizationService, useValue: authServiceSpy},
                {provide: MatDialog, useValue: {open: jasmine.createSpy('open')}},
            ],
        });
        harness = await RouterTestingHarness.create();
        component = await harness.navigateByUrl(url, FunctionsComponent);
        return component;
    }

    function lastConceptIds(): string[] {
        return functionsServiceSpy.getFunctions.calls.mostRecent().args[5] as string[];
    }

    afterEach(() => {
        functionsServiceSpy.getFunctions.calls.reset();
        conceptsServiceSpy.getConceptWithoutCharacteristics.calls.reset();
    });

    it('lists all functions when no concept filter is set', fakeAsync(() => {
        open('/metadata/functions');
        tick(400);
        flush();
        discardPeriodicTasks();

        expect(functionsServiceSpy.getFunctions).toHaveBeenCalledTimes(1);
        expect(lastConceptIds()).toEqual([]);
        expect(harness.routeNativeElement?.querySelector('.filter-chips')).toBeNull();
    }));

    it('lists only the functions of the concepts named in concept_ids and shows their names', fakeAsync(() => {
        open('/metadata/functions?concept_ids=' + temperature.id + ',' + pressure.id);
        tick(400);
        flush();
        harness.detectChanges();
        discardPeriodicTasks();

        expect(functionsServiceSpy.getFunctions).toHaveBeenCalledTimes(1);
        expect(lastConceptIds()).toEqual([temperature.id, pressure.id]);
        const chip = harness.routeNativeElement?.querySelector('.filter-chips');
        expect(chip?.textContent).toContain('Temperature, Pressure');
    }));

    it('clearing the filter removes the query parameter and lists all functions again', fakeAsync(() => {
        open('/metadata/functions?concept_ids=' + temperature.id);
        tick(400);
        flush();
        harness.detectChanges();
        functionsServiceSpy.getFunctions.calls.reset();

        (harness.routeNativeElement?.querySelector('.filter-chips button') as HTMLButtonElement).click();
        tick(400);
        flush();
        harness.detectChanges();
        discardPeriodicTasks();

        expect(TestBed.inject(Router).url).toBe('/metadata/functions');
        expect(functionsServiceSpy.getFunctions).toHaveBeenCalledTimes(1);
        expect(lastConceptIds()).toEqual([]);
        expect(harness.routeNativeElement?.querySelector('.filter-chips')).toBeNull();
    }));
});
