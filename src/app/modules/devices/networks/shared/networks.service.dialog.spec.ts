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

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { NetworksService } from './networks.service';
import { HubModel } from './networks.model';
import { NetworksEditDialogComponent } from '../dialogs/networks-edit-dialog.component';

/** What opening the edit dialog sends: a PUT for an existing network, a POST for a new one, nothing for Cancel or read-only. */
describe('NetworksService edit dialog', () => {
    let service: NetworksService;
    let http: HttpTestingController;
    let open: jasmine.Spy;

    const network = { id: 'h/1', name: 'Gateway', hash: 'abc', owner_id: 'u1', device_local_ids: ['l1'], device_ids: null } as HubModel;
    const edited: HubModel = { ...network, name: 'Renamed', attributes: [{ key: 'location-lat', value: '51.5', origin: 'web-ui' }, { key: 'location-lon', value: '12.5', origin: 'web-ui' }] };

    function closeWith(result: HubModel | undefined): void {
        open.and.returnValue({ afterClosed: (): Observable<HubModel | undefined> => of(result) });
    }

    beforeEach(() => {
        open = jasmine.createSpy('open');
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatSnackBarModule],
            providers: [NetworksService, { provide: MatDialog, useValue: { open } }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(NetworksService);
        http = TestBed.inject(HttpTestingController);
    });

    const hubRequests = (method: string) => http.match((r) => r.method === method && /\/hubs(\/|$)/.test(r.url));

    it('puts the edited network to its id', () => {
        closeWith(edited);

        service.openNetworkEditDialog(network);

        const [request] = hubRequests('PUT');
        expect(request.request.url.endsWith('/hubs/h%2F1')).toBeTrue();
        expect(request.request.body).toEqual(edited);
        request.flush(edited);
        expect(hubRequests('POST').length).toBe(0);
    });

    it('posts the new network', () => {
        closeWith(edited);

        service.openNetworkEditDialog();

        const [request] = hubRequests('POST');
        expect(request.request.url.endsWith('/hubs')).toBeTrue();
        expect(request.request.body).toEqual(edited);
        request.flush(edited);
        expect(hubRequests('PUT').length).toBe(0);
    });

    it('sends nothing when the dialog is cancelled', () => {
        closeWith(undefined);

        service.openNetworkEditDialog(network);
        service.openNetworkEditDialog();

        expect(hubRequests('PUT').length + hubRequests('POST').length).toBe(0);
    });

    it('sends nothing for a read-only dialog even if it closes with a network', () => {
        closeWith(edited);

        service.openNetworkEditDialog(network, true);

        expect(hubRequests('PUT').length + hubRequests('POST').length).toBe(0);
    });

    it('hands the network and the read-only flag to the dialog', () => {
        closeWith(undefined);

        service.openNetworkEditDialog(network, true);

        expect(open.calls.mostRecent().args[0]).toBe(NetworksEditDialogComponent);
        expect(open.calls.mostRecent().args[1].data).toEqual({ network, readOnly: true });
    });

    it('opens the dialog at the extra large size', () => {
        closeWith(undefined);

        service.openNetworkEditDialog(network);

        expect(open.calls.mostRecent().args[1].width).toBe('1100px');
        expect(open.calls.mostRecent().args[1].maxWidth).toBe('95vw');
    });
});
