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


import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { NetworksComponent } from './networks.component';
import { NetworksService } from './shared/networks.service';
import { HubModel } from './shared/networks.model';

describe('NetworksComponent getLoraCerts', () => {
    let component: NetworksComponent;
    let service: jasmine.SpyObj<NetworksService>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    const network = { id: 'n1', name: 'gw' } as HubModel;

    beforeEach(() => {
        service = jasmine.createSpyObj<NetworksService>('NetworksService', ['getLoraCerts', 'openLoraCertsDialog']);
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            imports: [NetworksComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: NetworksService, useValue: service },
                { provide: SearchbarService, useValue: { changeMessage: () => undefined } },
                { provide: Router, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: DeviceInstancesService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PermissionsService, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
            ],
        });
        component = TestBed.createComponent(NetworksComponent).componentInstance;
    });

    it('names the action and opens no certificate dialog when generating fails', () => {
        service.getLoraCerts.and.returnValue(of(null));

        component.getLoraCerts(network);

        expect(service.openLoraCertsDialog).not.toHaveBeenCalled();
        expect(snackBar.open.calls.mostRecent().args[0]).toContain('Could not generate the LoRaWAN certificates');
    });

    it('opens the certificate dialog when generating succeeds', () => {
        const certs = { gateway_cert: 'c' } as any;
        service.getLoraCerts.and.returnValue(of(certs));

        component.getLoraCerts(network);

        expect(service.openLoraCertsDialog).toHaveBeenCalledWith(network, certs);
        expect(snackBar.open).not.toHaveBeenCalled();
    });
});
