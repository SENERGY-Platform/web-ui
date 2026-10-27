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
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { delay } from 'rxjs/operators';
import { BehaviorSubject, of } from 'rxjs';

import { DeviceInstancesComponent } from './device-instances.component';
import { DeviceInstancesService } from './shared/device-instances.service';
import { DeviceInstancesDialogService } from './shared/device-instances-dialog.service';
import { DeviceInstanceModel } from './shared/device-instances.model';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';
import { UrlStateService } from '../../../core/services/url-state.service';
import { UrlStateServiceMock } from '../../../core/services/url-state.service.mock';

describe('DeviceInstancesComponent list', () => {
    let component: DeviceInstancesComponent;
    let fixture: ComponentFixture<DeviceInstancesComponent>;

    const service: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const deviceTypeService: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const exportDataService: Spy<ExportDataService> = createSpyFromClass<ExportDataService>(ExportDataService);
    let dialogService: Spy<DeviceInstancesDialogService>;
    let routeParams: BehaviorSubject<ParamMap>;
    let urlState: UrlStateServiceMock;
    const device = (write: boolean): DeviceInstanceModel => ({
        id: 'urn:device:1', name: 'meter', display_name: 'Meter', device_type_id: 'dt', device_type_name: 'Smart meter',
        connection_state: 'online', shared: false, attributes: [{ key: 'inactive', value: 'true', origin: 'web-ui' }],
        permissions: { read: true, write, administrate: write, execute: true },
    } as unknown as DeviceInstanceModel);

    function init(share = true, nameRight = true, urlParams: Record<string, string> = {}) {
        routeParams = new BehaviorSubject(convertToParamMap(urlParams));
        service.getDeviceInstances.and.returnValue(of({ result: [device(true)], total: 1 }).pipe(delay(1)));
        service.userHasShareAuthorization.and.returnValue(share);
        service.userHasDeleteAuthorization.and.returnValue(true);
        service.userHasCreateAuthorization.and.returnValue(true);
        service.userHasUpdateAuthorization.and.returnValue(true);
        service.userHasUpdateDisplayNameAuthorization.and.returnValue(nameRight);
        service.userHasUpdateAttributesAuthorization.and.returnValue(false);
        service.userHasDefaultAttributesPermissions.and.returnValue(true);
        deviceTypeService.userHasReadAuthorization.and.returnValue(true);
        exportDataService.userHasUsageAuthroization.and.returnValue(false);
        dialogService.openDeviceEditDialog.and.returnValue(of(null));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, DeviceInstancesComponent],
            providers: [
                { provide: DeviceInstancesService, useValue: service },
                { provide: DeviceInstancesDialogService, useValue: dialogService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: ExportDataService, useValue: exportDataService },
                { provide: PermissionsService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
                { provide: ActivatedRoute, useValue: { queryParamMap: routeParams } },
                {
                    provide: UrlStateService,
                    useFactory: () => {
                        urlState = new UrlStateServiceMock();
                        urlState.params = urlParams;
                        return urlState;
                    },
                },
            ],
        }).compileComponents();
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(DeviceInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    beforeEach(() => {
        dialogService = createSpyFromClass<DeviceInstancesDialogService>(DeviceInstancesDialogService);
    });

    afterEach(() => {
        service.getDeviceInstances.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getDeviceInstances.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceInstances).toHaveBeenCalledTimes(1);
    }));

    it('takes the bulk share from the share right, not from the delete right', fakeAsync(() => {
        init(false);
        discardPeriodicTasks();

        expect(component.userHasShareAuthoriation).toBeFalse();
        expect(component.displayedColumns).toContain('select');
    }));

    it('puts the filter button, the default attributes button and the active filter chips into the toolbar', fakeAsync(() => {
        init();
        component.routerNetwork = 'n1';
        component.routerNetworkName = 'Gateway';
        fixture.detectChanges();
        discardPeriodicTasks();

        const filters = fixture.nativeElement.querySelector('senergy-list-toolbar .toolbar-filters') as HTMLElement;
        expect(filters.textContent).toContain('Filter');
        expect(filters.querySelector('mat-chip')?.textContent).toContain('Gateway');
        expect(filters.querySelector('[aria-label="Default attributes"]')).not.toBeNull();
        expect(component.filtered).toBeTrue();
    }));

    it('opens the data dialog on a row click and offers Edit in it only with the right to change this device', fakeAsync(() => {
        init();
        component.openDevice(device(true));
        expect(dialogService.openDeviceServiceDialog.calls.mostRecent().args[0]).toEqual(device(true));
        expect(dialogService.openDeviceServiceDialog.calls.mostRecent().args[1]).toEqual(jasmine.any(Function));

        component.openDevice(device(false));
        expect(dialogService.openDeviceServiceDialog.calls.mostRecent().args[1]).toBeUndefined();
        expect(dialogService.openDeviceEditDialog).not.toHaveBeenCalled();
        discardPeriodicTasks();
    }));

    it('opens the editable edit dialog when Edit is chosen in the data dialog', fakeAsync(() => {
        init();
        component.openDevice(device(true));
        (dialogService.openDeviceServiceDialog.calls.mostRecent().args[1] as () => void)();

        expect(dialogService.openDeviceEditDialog.calls.mostRecent().args.slice(1, 4)).toEqual([true, true, false]);
        discardPeriodicTasks();
    }));

    it('shows the connection state and an inactive device as status chips', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('tr.clickable-row .status-chip').textContent).toBe('Inactive');
        component.dataSource.data = [{ ...device(true), attributes: [] } as DeviceInstanceModel];
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('tr.clickable-row .status-chip.online').textContent).toBe('Online');
    }));

    it('marks offline, inactive and unknown devices apart', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        const chip = () => fixture.nativeElement.querySelector('tr.clickable-row .status-chip') as HTMLElement;

        expect(chip().classList).toContain('hollow');
        component.dataSource.data = [{ ...device(true), connection_state: 'offline', attributes: [] } as DeviceInstanceModel];
        fixture.detectChanges();
        expect(chip().textContent).toBe('Offline');
        expect(chip().classList).toContain('failed');
        component.dataSource.data = [{ ...device(true), connection_state: '', attributes: [] } as DeviceInstanceModel];
        fixture.detectChanges();
        expect(chip().textContent).toBe('Unknown');
        expect(chip().classList).not.toContain('failed');
        expect(chip().classList).not.toContain('hollow');
    }));
    describe('view state in the URL', () => {
        const lastRequest = () => service.getDeviceInstances.calls.mostRecent().args[0];

        it('makes one opening load with the filter and the page of the URL', fakeAsync(() => {
            init(true, true, { 'network-id': 'n1', page: '2', sort: 'log_state', dir: 'desc' });
            discardPeriodicTasks();

            expect(service.getDeviceInstances).toHaveBeenCalledTimes(1);
            expect(lastRequest()).toEqual(jasmine.objectContaining({ hubId: 'n1', offset: 2 * component.list.pageSize, sortBy: 'annotations.connected', sortDesc: true }));
            expect(component.list.sortColumn).toBe('log_state');
            expect(urlState.writes).toEqual([]);
        }));

        it('reloads once for a filter that changed in the URL and not for a write of another key', fakeAsync(() => {
            init(true, true, { 'network-id': 'n1' });
            service.getDeviceInstances.calls.reset();

            routeParams.next(convertToParamMap({ 'network-id': 'n1', sort: 'display_name', dir: 'desc' }));
            tick(10);
            expect(service.getDeviceInstances).not.toHaveBeenCalled();

            routeParams.next(convertToParamMap({ 'network-id': 'n2' }));
            tick(10);
            discardPeriodicTasks();
            expect(service.getDeviceInstances).toHaveBeenCalledTimes(1);
            expect(lastRequest().hubId).toBe('n2');
        }));

        it('drops the page when the filters are written', fakeAsync(() => {
            init(true, true, { page: '2' });
            discardPeriodicTasks();
            const navigate = TestBed.inject(Router).navigate as jasmine.Spy;

            component.routerNetwork = 'n3';
            component.updateQueryParams();

            const extras = navigate.calls.mostRecent().args[1];
            expect(extras.queryParamsHandling).toBe('merge');
            expect(extras.queryParams).toEqual(jasmine.objectContaining({ 'network-id': 'n3', page: null, 'device-id': null }));
        }));
    });
});
