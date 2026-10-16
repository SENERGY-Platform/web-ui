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
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { LocationsComponent } from './locations.component';
import { LocationsService } from './shared/locations.service';
import { ExtendedLocationModel } from './shared/locations.model';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('LocationsComponent list', () => {
    let component: LocationsComponent;
    let fixture: ComponentFixture<LocationsComponent>;
    let router: Router;

    const service: Spy<LocationsService> = createSpyFromClass<LocationsService>(LocationsService);
    const location = {
        id: 'urn:location:1', name: 'Berlin', description: 'Office', image: '', device_ids: ['a', 'b'], device_group_ids: ['g'],
        permissions: { read: true, write: true, administrate: true, execute: true },
    } as ExtendedLocationModel;

    function init(rights = { update: true, delete: true, create: true, share: true }) {
        service.getLocations.and.returnValue(of({ result: [location], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasShareAuthorization.and.returnValue(rights.share);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, LocationsComponent],
            providers: [
                { provide: LocationsService, useValue: service },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(LocationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getLocations.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getLocations.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getLocations).toHaveBeenCalledTimes(1);
    }));

    it('offers the create button with the create right and opens the editor page', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const button = fixture.nativeElement.querySelector('senergy-page-header button') as HTMLButtonElement;
        expect(button.textContent).toContain('New location');
        button.click();
        expect(router.navigate).toHaveBeenCalledWith(['devices/locations/edit']);
    }));

    it('hides the create button and the selection column without the create and delete rights', fakeAsync(() => {
        init({ update: true, delete: false, create: false, share: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('opens the editor page on a row click', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(router.navigate).toHaveBeenCalledWith(['devices/locations/edit/' + location.id]);
    }));

    it('shows description and the device and group counts', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const cells = Array.from(fixture.nativeElement.querySelectorAll('tr.clickable-row td')).map((c) => (c as HTMLElement).textContent?.trim());
        expect(cells).toContain('Office');
        expect(cells).toContain('2');
        expect(cells).toContain('1');
    }));
});
