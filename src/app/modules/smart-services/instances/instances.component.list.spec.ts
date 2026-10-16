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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SmartServiceInstancesComponent } from './instances.component';
import { SmartServiceInstanceService } from './shared/instances.service';
import { SmartServiceInstanceModel } from './shared/instances.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceModuleService } from './shared/modules.service';
import { SmartServiceInstanceDialogService } from './shared/instance-dialog.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SmartServiceReleasesService } from '../releases/shared/release.service';

describe('SmartServiceInstancesComponent list', () => {
    let fixture: ComponentFixture<SmartServiceInstancesComponent>;
    let component: SmartServiceInstancesComponent;
    let getInstances: jasmine.Spy;
    let getInstance: jasmine.Spy;
    let getModules: jasmine.Spy;

    const instance = {
        id: 'i1', name: 'Heating', description: 'Keeps it warm', release_id: 'r1', new_release_id: 'r2', user_id: 'u1', error: 'module failed',
        created_at: 1700000000, updated_at: 1700000100,
        permissions_info: { shared: true, permissions: { administrate: true, execute: true, read: true, write: true } },
    } as SmartServiceInstanceModel;

    function init(deleteRight = true) {
        getInstance = jasmine.createSpy('getInstance').and.returnValue(of(instance));
        getInstances = jasmine.createSpy('getInstances').and.returnValue(of({ instances: [instance], total: 1 }));
        getModules = jasmine.createSpy('getModules').and.returnValue(of([{ module_type: 'widget', module_data: {} }]));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, SmartServiceInstancesComponent],
            providers: [
                provideRouter([]),
                { provide: SmartServiceInstanceService, useValue: { userHasDeleteAuthorization: () => deleteRight, getInstances, getInstance } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: DialogsService, useValue: {} },
                { provide: PermissionsService, useValue: { getSharableUsers: () => of([{ id: 'u1', username: 'alice' }]) } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: SmartServiceModuleService, useValue: { getModules } },
                { provide: SmartServiceInstanceDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { userIsDeveloper: () => false } },
                { provide: SmartServiceReleasesService, useValue: { getExtendedReleaseList: () => of({ releases: [], total: 0 }) } },
            ],
        }).compileComponents();
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(SmartServiceInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        getInstances.calls.reset();

        (fixture.nativeElement.querySelector('.toolbar-refresh') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(getInstances).toHaveBeenCalledTimes(1);
    }));

    it('reloads the single instance, not the paged list, in the single instance view', fakeAsync(() => {
        init();
        getInstance.calls.reset();
        getInstances.calls.reset();
        component.instanceId = 'i1';

        (fixture.nativeElement.querySelector('.toolbar-refresh') as HTMLButtonElement).click();
        tick(400);

        expect(getInstance).toHaveBeenCalledOnceWith('i1');
        expect(getInstances).not.toHaveBeenCalled();
    }));

    it('shows the chips and the error as a status instead of one column each', fakeAsync(() => {
        init();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('Heating');
        expect(row.textContent).toContain('Shared');
        expect(row.textContent).toContain('Upgrade available');
        expect(row.querySelector('.status-chip.failed')?.textContent).toContain('module failed');
        expect(component.displayedColumns).toEqual(['expand', 'name', 'error', 'created_at', 'updated_at', 'actions']);
    }));

    it('expands the modules of an instance on a row click', fakeAsync(() => {
        init();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        tick();
        fixture.detectChanges();

        expect(getModules).toHaveBeenCalledWith({ instance_id: 'i1' });
        expect(component.expandedInstance?.id).toBe('i1');
    }));

    it('asks for administrate on edit, upgrade, share and delete, and treats a missing flag as allowed', fakeAsync(() => {
        init();

        expect(component.mayAdminister(instance)).toBeTrue();
        expect(component.mayAdminister({ ...instance, permissions_info: { shared: false, permissions: { administrate: false } } } as SmartServiceInstanceModel)).toBeFalse();
        expect(component.mayAdminister({ ...instance, permissions_info: undefined } as unknown as SmartServiceInstanceModel)).toBeTrue();
    }));
});
