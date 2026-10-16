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

import { DeviceGroupsComponent } from './device-groups.component';
import { DeviceGroupsService } from './shared/device-groups.service';
import { DeviceGroupModel } from './shared/device-groups.model';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('DeviceGroupsComponent list', () => {
    let component: DeviceGroupsComponent;
    let fixture: ComponentFixture<DeviceGroupsComponent>;
    let router: Router;

    const service: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const group = { id: 'urn:group:1', name: 'Lamps', device_ids: ['a', 'b', 'c'], auto_generated_by_device: 'd' } as DeviceGroupModel;

    function init(rights = { update: true, delete: true, create: true }) {
        service.getDeviceGroups.and.returnValue(of({ result: [group], total: 1 }));
        service.getDeviceGroupsWithoutGenerated.and.returnValue(of({ result: [group], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: group.id, write: true, administrate: true } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, DeviceGroupsComponent],
            providers: [
                { provide: DeviceGroupsService, useValue: service },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(DeviceGroupsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getDeviceGroups.calls.reset();
        service.getDeviceGroupsWithoutGenerated.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getDeviceGroupsWithoutGenerated.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceGroupsWithoutGenerated).toHaveBeenCalledTimes(1);
    }));

    it('lists generated groups after the filter chip is switched on, with one reload', fakeAsync(() => {
        init();
        service.getDeviceGroups.calls.reset();

        component.setHideGenerated(false);
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceGroups).toHaveBeenCalledTimes(1);
        expect(component.filtered).toBeTrue();
    }));

    it('lists generated groups once after a click on the filter chip', fakeAsync(() => {
        init();
        service.getDeviceGroups.calls.reset();

        (fixture.nativeElement.querySelector('mat-chip-option button') as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceGroups).toHaveBeenCalledTimes(1);
        expect(component.hideGenerated).toBeFalse();
    }));

    it('offers the create button with the create right and opens the editor page', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const button = fixture.nativeElement.querySelector('senergy-page-header button') as HTMLButtonElement;
        expect(button.textContent).toContain('New device group');
        button.click();
        expect(router.navigate).toHaveBeenCalledWith(['devices/devicegroups/edit']);
    }));

    it('hides the create button and the selection column without the create and delete rights', fakeAsync(() => {
        init({ update: true, delete: false, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('edits only with the update right and the write right on the group', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.canEdit(group)).toBeTrue();
        component.permissionsPerInstance = [];
        expect(component.canEdit(group)).toBeFalse();
    }));

    it('shows the device count and the generated chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.num')?.textContent).toBe('3');
        expect(row.querySelector('.type-chip')?.textContent).toBe('Generated');
    }));
});
