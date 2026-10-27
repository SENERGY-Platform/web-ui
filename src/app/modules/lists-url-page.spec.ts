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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NEVER } from 'rxjs';

import { KeepPageInRangeDirective } from '../core/directives/keep-page-in-range.directive';
import { AuthorizationService } from '../core/services/authorization.service';
import { DialogsService } from '../core/services/dialogs.service';
import { UtilService } from '../core/services/util.service';
import { ExportDataService } from '../widgets/shared/export-data.service';
import { CostService } from './cost/shared/cost.service';
import { DeviceGroupsComponent } from './devices/device-groups/device-groups.component';
import { DeviceGroupsService } from './devices/device-groups/shared/device-groups.service';
import { DeviceInstancesComponent } from './devices/device-instances/device-instances.component';
import { DeviceInstancesDialogService } from './devices/device-instances/shared/device-instances-dialog.service';
import { DeviceInstancesService } from './devices/device-instances/shared/device-instances.service';
import { LocationsComponent } from './devices/locations/locations.component';
import { LocationsService } from './devices/locations/shared/locations.service';
import { NetworksComponent } from './devices/networks/networks.component';
import { NetworksService } from './devices/networks/shared/networks.service';
import { ImportInstancesComponent } from './imports/import-instances/import-instances.component';
import { ImportInstancesService } from './imports/import-instances/shared/import-instances.service';
import { ImportTypesComponent } from './imports/import-types/import-types.component';
import { ImportTypesService } from './imports/import-types/shared/import-types.service';
import { CharacteristicsComponent } from './metadata/characteristics/characteristics.component';
import { CharacteristicsService } from './metadata/characteristics/shared/characteristics.service';
import { ConceptsComponent } from './metadata/concepts/concepts.component';
import { ConceptsService } from './metadata/concepts/shared/concepts.service';
import { DeviceClassesComponent } from './metadata/device-classes/device-classes.component';
import { DeviceClassesService } from './metadata/device-classes/shared/device-classes.service';
import { DeviceTypesOverviewComponent } from './metadata/device-types-overview/device-types-overview.component';
import { DeviceTypeService } from './metadata/device-types-overview/shared/device-type.service';
import { FunctionsComponent } from './metadata/functions/functions.component';
import { FunctionsService } from './metadata/functions/shared/functions.service';
import { PermissionsDialogService } from './permissions/shared/permissions-dialog.service';
import { PermissionsService } from './permissions/shared/permissions.service';
import { SmartServiceInstancesComponent } from './smart-services/instances/instances.component';
import { SmartServiceInstanceDialogService } from './smart-services/instances/shared/instance-dialog.service';
import { SmartServiceInstanceService } from './smart-services/instances/shared/instances.service';
import { SmartServiceModuleService } from './smart-services/instances/shared/modules.service';
import { SmartServiceReleasesService } from './smart-services/releases/shared/release.service';

/** Answers every call with a request that never answers, so a list stays in the state before its first answer. */
function silentService(): unknown {
    return new Proxy({}, { get: (_target, name) => (name === 'then' ? undefined : () => NEVER) });
}

interface ListCase {
    component: Type<{ pageIndex: number; paginator: MatPaginator }>;
    services: Type<unknown>[];
}

const LISTS: ListCase[] = [
    { component: DeviceGroupsComponent, services: [DeviceGroupsService, PermissionsDialogService, PermissionsService, DialogsService] },
    {
        component: DeviceInstancesComponent,
        services: [DeviceInstancesService, DeviceInstancesDialogService, PermissionsDialogService, DialogsService, DeviceTypeService, ExportDataService, PermissionsService],
    },
    { component: LocationsComponent, services: [LocationsService, DialogsService, PermissionsDialogService] },
    {
        component: NetworksComponent,
        services: [NetworksService, DeviceInstancesService, DialogsService, PermissionsDialogService, PermissionsService],
    },
    {
        component: ImportInstancesComponent,
        services: [ImportInstancesService, DialogsService, UtilService, PermissionsDialogService, PermissionsService, AuthorizationService],
    },
    {
        component: ImportTypesComponent,
        services: [ImportTypesService, PermissionsDialogService, DialogsService, CostService, PermissionsService],
    },
    { component: CharacteristicsComponent, services: [CharacteristicsService, DialogsService, DeviceTypeService, ConceptsService] },
    { component: ConceptsComponent, services: [ConceptsService, FunctionsService, DialogsService] },
    { component: DeviceClassesComponent, services: [DeviceClassesService, DialogsService, AuthorizationService, DeviceTypeService] },
    { component: DeviceTypesOverviewComponent, services: [DeviceTypeService, DialogsService, DeviceInstancesDialogService] },
    { component: FunctionsComponent, services: [FunctionsService, DialogsService, AuthorizationService, DeviceTypeService, ConceptsService] },
    {
        component: SmartServiceInstancesComponent,
        services: [
            SmartServiceInstanceService, DialogsService, PermissionsService, PermissionsDialogService, SmartServiceModuleService,
            SmartServiceInstanceDialogService, AuthorizationService, SmartServiceReleasesService,
        ],
    },
];

describe('lists with a server-side page', () => {
    beforeEach(() => localStorage.removeItem('PreferencesService/pageSize'));

    LISTS.forEach(({ component, services }) => {
        // before the first answer the list does not know its length, so a page from the URL must not be measured
        // against a placeholder (SNRGY-5024)
        it(component.name + ' opens on the page of the URL while its first answer is pending', fakeAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                declarations: [component],
                imports: [
                    NoopAnimationsModule, MatDialogModule, MatSnackBarModule, MatPaginatorModule, MatTableModule, MatSortModule,
                    MatMenuModule, KeepPageInRangeDirective,
                ],
                providers: [provideRouter([]), ...services.map((service) => ({ provide: service, useValue: silentService() }))],
            });
            const router = TestBed.inject(Router);
            router.navigateByUrl('/?page=12');
            tick();
            const fixture: ComponentFixture<{ pageIndex: number; paginator: MatPaginator }> = TestBed.createComponent(component);

            fixture.detectChanges();
            tick(400);
            fixture.detectChanges();
            tick(400);
            discardPeriodicTasks();
            flush();

            expect(fixture.componentInstance.pageIndex).toBe(12);
            expect(fixture.componentInstance.paginator.pageIndex).toBe(12);
            expect(router.url).toBe('/?page=12');
        }));
    });
});
