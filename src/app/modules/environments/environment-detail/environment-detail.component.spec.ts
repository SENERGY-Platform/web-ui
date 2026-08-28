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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CoreModule } from '../../../core/core.module';
import { EnvironmentDetailComponent } from './environment-detail.component';
import { EnvironmentsKeyValueEditorComponent } from '../key-value-editor/environments-key-value-editor.component';
import { EnvironmentsProfileEditorComponent } from './profile-editor/environments-profile-editor.component';
import { EnvironmentsFactorBarsComponent } from './factor-bars/environments-factor-bars.component';
import { EnvironmentsDatasetEditorComponent } from './dataset-editor/environments-dataset-editor.component';
import { EnvironmentsLiveStateTilesComponent } from './live-state/environments-live-state-tiles.component';
import { EnvironmentsService } from '../shared/environments.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../environments/environment';
import { CatalogDeviceType, Environment } from '../shared/environments.model';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService as PlatformDeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return undefined;
    }
}

// The dataset/platform origin lookups are not exercised by the nestedEnvironment fixtures
// (none of them reference a platform device), so these stand in for the real platform
// services purely to keep DI resolvable without pulling in their whole dependency graph.
class MockDeviceInstancesService {
    getDeviceInstance(_id: string): any {
        return of(null);
    }
}

class MockPlatformDeviceTypeService {
    getDeviceType(_id: string): any {
        return of(null);
    }

    getValuePathsAndContentVariables(_contentVariable: any): any[] {
        return [];
    }
}

class ActivatedRouteStub {
    snapshot = { paramMap: { get: (_key: string) => 'e1' } };
}

// z1 carries one asset with one channel, enough to exercise the tree build and the
// per-kind editor getters without the size of a full fixture environment.
const nestedEnvironment: Environment = {
    id: 'e1',
    name: 'Plant A',
    type: 'industrial_site',
    seed: 1,
    zones: [
        {
            id: 'z1',
            name: 'Building',
            type: 'building',
            assets: [
                {
                    id: 'a1',
                    name: 'Meter 1',
                    kind: 'meter',
                    channels: [
                        {
                            id: 'c1',
                            name: 'Power',
                            direction: 'sensor',
                            source: { kind: 'script', script: { code: 'return 1;' } },
                        },
                    ],
                },
            ],
        },
    ],
};

describe('EnvironmentDetailComponent', () => {
    let component: EnvironmentDetailComponent;
    let fixture: ComponentFixture<EnvironmentDetailComponent>;
    let httpMock: HttpTestingController;
    const environmentsUrl = environment.mosesUrl + '/environments';
    const datasetsUrl = environment.mosesUrl + '/datasets';
    const deviceTypesUrl = environment.mosesUrl + '/device-types';
    const devicesUrl = environment.mosesUrl + '/devices';

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                EnvironmentDetailComponent,
                EnvironmentsKeyValueEditorComponent,
                EnvironmentsProfileEditorComponent,
                EnvironmentsFactorBarsComponent,
                EnvironmentsDatasetEditorComponent,
                EnvironmentsLiveStateTilesComponent,
            ],
            imports: [
                CommonModule,
                FormsModule,
                FlexLayoutModule,
                CoreModule,
                NoopAnimationsModule,
                MatTableModule,
                MatButtonModule,
                MatIconModule,
                MatTooltipModule,
                MatDialogModule,
                MatFormFieldModule,
                MatInputModule,
                MatSnackBarModule,
                MatTreeModule,
                MatButtonToggleModule,
                MatBadgeModule,
                MatCheckboxModule,
                MatDividerModule,
                MatTabsModule,
                MatExpansionModule,
                MtxSelectModule,
                NgApexchartsModule,
            ],
            providers: [
                EnvironmentsService,
                DialogsService,
                { provide: LadonService, useClass: MockLadonService },
                { provide: ActivatedRoute, useClass: ActivatedRouteStub },
                { provide: DeviceInstancesService, useClass: MockDeviceInstancesService },
                { provide: PlatformDeviceTypeService, useClass: MockPlatformDeviceTypeService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EnvironmentDetailComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    }));

    afterEach(() => {
        httpMock.verify();
    });

    /**
     * Drives ngOnInit's three requests (environment + datasets + device types) and settles
     * change detection. Flushes a deep clone: the component normalizes and then mutates its
     * environment in place, and the shared `nestedEnvironment` fixture must stay pristine
     * across tests.
     */
    function loadWith(env: Environment, deviceTypes: CatalogDeviceType[] = []): void {
        fixture.detectChanges();
        httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(env)));
        httpMock.expectOne(datasetsUrl).flush([]);
        httpMock.expectOne(deviceTypesUrl).flush(deviceTypes);
        fixture.detectChanges();
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('loads the environment, builds the tree and selects the root by default', () => {
        loadWith(nestedEnvironment);

        expect(component.dataReady).toBe(true);
        expect(component.root?.kind).toBe('environment');
        expect(component.root?.children.length).toBe(1);
        expect(component.selectedNode?.kind).toBe('environment');
        expect(component.selectedEnvironment?.name).toBe('Plant A');
    });

    it('selects a clicked node and exposes it through the matching getter', () => {
        loadWith(nestedEnvironment);

        const zoneNode = component.root!.children[0];
        component.select(zoneNode);
        fixture.detectChanges();

        expect(component.selectedNode?.kind).toBe('zone');
        expect(component.selectedZone?.name).toBe('Building');

        const assetNode = zoneNode.children[0];
        component.select(assetNode);
        expect(component.selectedAsset?.name).toBe('Meter 1');

        const channelNode = assetNode.children[0];
        component.select(channelNode);
        expect(component.selectedChannel?.name).toBe('Power');
    });

    describe('the aggregate source kind', () => {
        it('onSourceKindChange to aggregate drops the previous variant and materialises nothing', () => {
            loadWith(nestedEnvironment);
            const channelNode = component.root!.children[0].children[0].children[0];
            component.select(channelNode);

            component.onSourceKindChange(component.selectedChannel!, 'aggregate');
            fixture.detectChanges();

            expect(component.selectedChannel!.source!.kind).toBe('aggregate');
            expect(component.selectedChannel!.source!.script).toBeUndefined();
        });
    });

    describe('isDirty (event-based, not a whole-document diff)', () => {
        it('is not dirty right after loading', () => {
            loadWith(nestedEnvironment);
            expect(component.isDirty).toBe(false);
        });

        it('becomes dirty when a field mutator runs', () => {
            loadWith(nestedEnvironment);
            component.setEnvironmentContext(component.selectedEnvironment!, { outdoor_temp: 5 });
            expect(component.isDirty).toBe(true);
        });

        it('does not become dirty from merely selecting a different node', () => {
            loadWith(nestedEnvironment);
            const zoneNode = component.root!.children[0];

            component.select(zoneNode);

            expect(component.isDirty).toBe(false);
        });

        it('resets to false on discard (reload)', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            expect(component.isDirty).toBe(true);

            component.discard();
            httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(nestedEnvironment)));

            expect(component.isDirty).toBe(false);
        });
    });

    describe('save', () => {
        it('adds a new zone under the root, selects it immediately and marks the document dirty', () => {
            loadWith(nestedEnvironment);

            component.addZone(component.root!);
            fixture.detectChanges();

            expect(component.environment?.zones?.length).toBe(2);
            expect(component.selectedNode?.kind).toBe('zone');
            expect(component.selectedZone?.name).toBe('New Zone');
            expect(component.isDirty).toBe(true);
        });

        it('saves successfully, shows a success snackbar and reloads while keeping the current selection', () => {
            loadWith(nestedEnvironment);
            const zoneNode = component.root!.children[0];
            component.select(zoneNode);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();
            const putReq = httpMock.expectOne(environmentsUrl + '/e1');
            expect(putReq.request.method).toBe('PUT');
            putReq.flush(JSON.parse(JSON.stringify(nestedEnvironment)));

            expect(snackBarSpy).toHaveBeenCalledWith('Environment saved successfully.', undefined, { duration: 2000 });

            // save() reloads (the server may have assigned ids) -- the reload must preserve selection
            const getReq = httpMock.expectOne(environmentsUrl + '/e1');
            getReq.flush(JSON.parse(JSON.stringify(nestedEnvironment)));

            expect(component.selectedNode?.kind).toBe('zone');
            expect(component.selectedZone?.name).toBe('Building');
            expect(component.isDirty).toBe(false);
        });

        it('shows the problems and does not reload on a structured ValidationError', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();
            httpMock
                .expectOne(environmentsUrl + '/e1')
                .flush({ problems: [{ path: 'name', message: 'must not be empty' }] }, { status: 400, statusText: 'Bad Request' });

            expect(component.problems.length).toBe(1);
            expect(snackBarSpy).toHaveBeenCalledWith('The environment could not be saved: see the problems below.', 'close', {
                panelClass: 'snack-bar-error',
            });
            httpMock.expectNone(environmentsUrl + '/e1'); // no reload
        });

        // BLOCKING regression: a 400 with a plain-text body (a Go json.Unmarshal message,
        // not a {problems: [...]} object) used to fall through "not a ValidationError" into
        // the truthy-result success branch, reporting "saved successfully" and reloading --
        // silently discarding the edit that had just failed to save.
        it('does not report success or reload on a plaintext 400 body, and shows the error text', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');
            const plainTextBody = 'unable to read the request body: json: cannot unmarshal number 900.5 into ... int64';

            component.save();
            httpMock.expectOne(environmentsUrl + '/e1').flush(plainTextBody, { status: 400, statusText: 'Bad Request' });

            expect(snackBarSpy).not.toHaveBeenCalledWith('Environment saved successfully.', jasmine.anything(), jasmine.anything());
            expect(snackBarSpy).toHaveBeenCalledWith(plainTextBody, 'close', { panelClass: 'snack-bar-error' });
            expect(component.isDirty).toBe(true); // the edit is still there, nothing was discarded
            httpMock.expectNone(environmentsUrl + '/e1'); // no reload
        });

        it('does not report success or reload on a 500', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();
            httpMock.expectOne(environmentsUrl + '/e1').flush('boom', { status: 500, statusText: 'Internal Server Error' });

            expect(snackBarSpy).toHaveBeenCalledWith('boom', 'close', { panelClass: 'snack-bar-error' });
            httpMock.expectNone(environmentsUrl + '/e1');
        });

        // Optimistic locking (Environment.version): a 409 gets its own conflict dialog
        // instead of the generic error snackbar -- see openVersionConflictDialog.
        describe('409 optimistic-locking conflict', () => {
            it('opens the conflict dialog instead of a generic error snackbar, and does not reload on its own', () => {
                loadWith(nestedEnvironment);
                component.markDirty();
                const snackBarSpy = spyOn((component as any).snackBar, 'open');
                const dialogOpen = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
                    afterClosed: () => of(false),
                } as any);

                component.save();
                httpMock
                    .expectOne(environmentsUrl + '/e1')
                    .flush('version conflict: you have 1, current is 2', { status: 409, statusText: 'Conflict' });

                expect(dialogOpen).toHaveBeenCalled();
                expect(snackBarSpy).not.toHaveBeenCalled();
                expect(component.isDirty).toBe(true); // "Keep editing" -- nothing was discarded
                httpMock.expectNone(environmentsUrl + '/e1'); // no reload
            });

            it('reloads, discarding the edit, when the dialog is closed with "Reload"', () => {
                loadWith(nestedEnvironment);
                component.markDirty();
                spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(true) } as any);

                component.save();
                httpMock
                    .expectOne(environmentsUrl + '/e1')
                    .flush('version conflict: you have 1, current is 2', { status: 409, statusText: 'Conflict' });

                const reloadReq = httpMock.expectOne(environmentsUrl + '/e1');
                reloadReq.flush(JSON.parse(JSON.stringify(nestedEnvironment)));
                expect(component.isDirty).toBe(false);
            });

            it('does not reload when the dialog is closed with "Keep editing"', () => {
                loadWith(nestedEnvironment);
                component.markDirty();
                spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(false) } as any);

                component.save();
                httpMock
                    .expectOne(environmentsUrl + '/e1')
                    .flush('version conflict: you have 1, current is 2', { status: 409, statusText: 'Conflict' });

                httpMock.expectNone(environmentsUrl + '/e1');
                expect(component.isDirty).toBe(true);
            });
        });

        // Client-side pre-check: seed/interval_seconds/time_constants are int64 server-side
        // and produce an opaque unmarshal error; catching a non-integer value here means the
        // request is never sent at all, and the message names the offending field.
        it('blocks the save client-side when a seed is not a whole number, without calling the API', () => {
            loadWith(nestedEnvironment);
            component.selectedEnvironment!.seed = 900.5;
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();

            expect(snackBarSpy).toHaveBeenCalledWith('These fields must be whole numbers: seed', 'close', { panelClass: 'snack-bar-error' });
            httpMock.expectNone(environmentsUrl + '/e1');
        });

        // A new machine's asset carries external_type_id without external_ref until it is
        // saved (see assetFromDeviceType) -- the success message should say so, counted from
        // the document as sent, not from the (identical, in this fixture) server answer.
        it('mentions how many platform devices were created when the saved document had pending ones', () => {
            const envWithPendingDevice: Environment = JSON.parse(JSON.stringify(nestedEnvironment));
            envWithPendingDevice.zones![0].assets!.push({ id: 'a2', name: 'Press 1', external_type_id: 't1' });
            loadWith(envWithPendingDevice);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();
            httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(envWithPendingDevice)));

            expect(snackBarSpy).toHaveBeenCalledWith('Environment saved successfully. · created 1 platform device', undefined, { duration: 2000 });
            httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(envWithPendingDevice))); // the reload
        });

        it('does not mention platform devices when the saved document had none pending', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.save();
            httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(nestedEnvironment)));

            expect(snackBarSpy).toHaveBeenCalledWith('Environment saved successfully.', undefined, { duration: 2000 });
            httpMock.expectOne(environmentsUrl + '/e1').flush(JSON.parse(JSON.stringify(nestedEnvironment))); // the reload
        });
    });

    describe('problem indexing (Set/Map computed once from the ValidationError, not per node per check)', () => {
        it('marks the tree node for a top-level field problem and shows it above the selected node once selected', () => {
            loadWith(nestedEnvironment);
            component.markDirty();

            component.save();
            httpMock
                .expectOne(environmentsUrl + '/e1')
                .flush({ problems: [{ path: 'zones[0].name', message: 'must not be empty' }] }, { status: 400, statusText: 'Bad Request' });

            const zoneNode = component.root!.children[0];
            expect(component.problemNodeKeys.has(component.root!.key)).toBe(true); // root contains every location
            expect(component.problemNodeKeys.has(zoneNode.key)).toBe(true);

            component.select(zoneNode);
            expect(component.selectedNodeProblems).toEqual([{ message: 'must not be empty', suffix: 'name' }]);
        });

        it('does not show an ancestor\'s badge-worthy problem as belonging to a sibling node', () => {
            loadWith(nestedEnvironment);
            component.addZone(component.root!); // a second, sibling zone
            const secondZone = component.selectedNode!;
            component.markDirty();

            component.save();
            httpMock
                .expectOne(environmentsUrl + '/e1')
                .flush({ problems: [{ path: 'zones[0].name', message: 'must not be empty' }] }, { status: 400, statusText: 'Bad Request' });

            expect(component.problemNodeKeys.has(secondZone.key)).toBe(false);
        });

        // BLOCKING-adjacent regression: indexes shift on add/delete, so a problem list from
        // before the structural change would point at the wrong node afterwards.
        it('clears stale problems when the tree structure changes', () => {
            loadWith(nestedEnvironment);
            component.markDirty();
            component.save();
            httpMock
                .expectOne(environmentsUrl + '/e1')
                .flush({ problems: [{ path: 'zones[0].name', message: 'must not be empty' }] }, { status: 400, statusText: 'Bad Request' });
            expect(component.problems.length).toBe(1);

            component.addZone(component.root!.children[0]);

            expect(component.problems).toEqual([]);
            expect(component.problemNodeKeys.size).toBe(0);
        });
    });

    describe('deleting a node', () => {
        // BLOCKING-adjacent regression: with 3 siblings [A, B, C] and B selected, deleting A
        // shifts C into B's old array index. A naive "keep selectedKey, fall back to root
        // only if it no longer resolves" re-resolves the old key against whatever now sits
        // there -- i.e. it would silently select the next sibling instead of noticing
        // anything happened. The fix always lands on the deleted node's parent instead.
        it('always selects the parent after a delete, even when a different (earlier) sibling was removed', () => {
            loadWith(nestedEnvironment);
            component.addZone(component.root!); // zones: [Building, New Zone]
            const buildingZone = component.root!.children[0];
            const newZone = component.root!.children[1];
            component.select(newZone); // select the *second* zone, not the one about to be deleted
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({ afterClosed: () => ({ subscribe: (cb: any) => cb(true) }) } as any);

            component.deleteNode(buildingZone); // delete the *first* zone

            expect(component.environment?.zones?.length).toBe(1);
            expect(component.environment?.zones?.[0].name).toBe('New Zone');
            expect(component.selectedNode?.kind).toBe('environment');
        });

        it('selects the environment root after deleting a top-level zone', () => {
            loadWith(nestedEnvironment);
            const zoneNode = component.root!.children[0];
            component.select(zoneNode);
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({ afterClosed: () => ({ subscribe: (cb: any) => cb(true) }) } as any);

            component.deleteNode(zoneNode);

            expect(component.environment?.zones?.length).toBe(0);
            expect(component.selectedNode?.kind).toBe('environment');
        });

        it('selects the parent asset after deleting its channel', () => {
            loadWith(nestedEnvironment);
            const zoneNode = component.root!.children[0];
            const assetNode = zoneNode.children[0];
            const channelNode = assetNode.children[0];
            component.select(channelNode);
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({ afterClosed: () => ({ subscribe: (cb: any) => cb(true) }) } as any);

            component.deleteNode(channelNode);

            const newAssetNode = component.root!.children[0].children[0];
            expect(component.selectedNode?.kind).toBe('asset');
            expect(component.selectedNode?.key).toBe(newAssetNode.key);
        });

        it('does not delete anything and keeps the selection when the confirmation is declined', () => {
            loadWith(nestedEnvironment);
            const zoneNode = component.root!.children[0];
            component.select(zoneNode);
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({ afterClosed: () => ({ subscribe: (cb: any) => cb(false) }) } as any);

            component.deleteNode(zoneNode);

            expect(component.environment?.zones?.length).toBe(1);
            expect(component.selectedNode?.key).toBe(zoneNode.key);
        });

        // The dialog defaults the checkbox to checked (see checkboxDefault), but the actual
        // deletion still only happens when the response says it was checked -- this pins the
        // component's own reaction to that response, not the dialog's default.
        it('deletes the platform device only when the checkbox in the delete dialog was confirmed', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1';
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({
                afterClosed: () => ({ subscribe: (cb: any) => cb({ confirmed: true, checkboxChecked: true }) }),
            } as any);

            component.deleteNode(assetNode);

            const req = httpMock.expectOne(devicesUrl + '/d1');
            expect(req.request.method).toBe('DELETE');
            req.flush(null, { status: 204, statusText: 'No Content' });
        });

        it('does not delete the platform device when the checkbox was left unchecked', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1';
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({
                afterClosed: () => ({ subscribe: (cb: any) => cb({ confirmed: true, checkboxChecked: false }) }),
            } as any);

            component.deleteNode(assetNode);

            httpMock.expectNone(devicesUrl + '/d1');
        });

        it('defaults the checkbox to checked and explains the simulation created the device, for a managed device', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1';
            (assetNode.data as any).external_managed = true;
            const openDeleteDialog = spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({
                afterClosed: () => ({ subscribe: (cb: any) => cb(true) }),
            } as any);

            component.deleteNode(assetNode);

            const options = openDeleteDialog.calls.mostRecent().args[1];
            expect(options!.checkboxDefault).toBe(true);
            expect(options!.checkboxText).toContain('created by the simulation');
        });

        it('defaults the checkbox to unchecked and warns the device is a real, linked one, when external_managed is not true', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1'; // external_managed left undefined, like an older server's response
            const openDeleteDialog = spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({
                afterClosed: () => ({ subscribe: (cb: any) => cb(true) }),
            } as any);

            component.deleteNode(assetNode);

            const options = openDeleteDialog.calls.mostRecent().args[1];
            expect(options!.checkboxDefault).toBe(false);
            expect(options!.checkboxText).toContain('existing device you linked');
        });

        it('does not ask about the platform device for an asset that has none', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            const openDeleteDialog = spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({
                afterClosed: () => ({ subscribe: (cb: any) => cb(true) }),
            } as any);

            component.deleteNode(assetNode);

            expect(openDeleteDialog.calls.mostRecent().args[1]).toBeUndefined();
            httpMock.expectNone(devicesUrl);
        });
    });

    describe('adding a machine', () => {
        const deviceType: CatalogDeviceType = {
            id: 't1',
            name: 'Press',
            services: [
                { id: 's1', name: 'Power', direction: 'sensor', characteristic_id: 'watt' },
                { id: 's2', name: 'Switch', direction: 'actuator', characteristic_id: 'bool' },
            ],
        };

        it('adds an asset with one channel per service and selects it, without calling the platform (no device POST)', () => {
            loadWith(nestedEnvironment);
            spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
                afterClosed: () => of({ name: 'Press 1', deviceType }),
            } as any);
            const zoneNode = component.root!.children[0];

            component.addMachine(zoneNode);

            httpMock.expectNone(devicesUrl);
            const assets = component.environment?.zones?.[0].assets || [];
            expect(assets.length).toBe(2);
            const created = assets[1];
            expect(created.external_ref).toBeUndefined(); // filled in by the server on save
            expect(created.external_type_id).toBe('t1');
            expect(created.channels?.length).toBe(2);
            expect(component.selectedAsset).toBe(created);
        });

        it('does not create anything when the dialog is cancelled', () => {
            loadWith(nestedEnvironment);
            spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
            const zoneNode = component.root!.children[0];

            component.addMachine(zoneNode);

            httpMock.expectNone(devicesUrl);
            expect(component.environment?.zones?.[0].assets?.length).toBe(1);
        });
    });

    describe('context sources (driven context values)', () => {
        it('renders every context_sources entry as a driven-values row', () => {
            const env: Environment = {
                ...nestedEnvironment,
                context_sources: {
                    outdoor_temperature: { kind: 'profile', interval_seconds: 300, profile: { base: 12 } },
                    replay: { kind: 'dataset', interval_seconds: 60, dataset: { origin: 'file', ref: 'ds-1' } },
                },
            };
            loadWith(env);

            const entries = component.contextSourceEntries(component.selectedEnvironment!);
            expect(entries.map((e) => e.key).sort()).toEqual(['outdoor_temperature', 'replay']);
        });

        it('existingContextKeys collects both static and driven keys, for the Add dialog\'s collision check', () => {
            const env: Environment = {
                ...nestedEnvironment,
                context: { irradiation: 100 },
                context_sources: { outdoor_temperature: { kind: 'profile', interval_seconds: 300, profile: {} } },
            };
            loadWith(env);

            expect(component.existingContextKeys(component.selectedEnvironment!).sort()).toEqual(['irradiation', 'outdoor_temperature']);
        });

        it('openAddContextDialog stores the returned key/source under context_sources and marks the document dirty', () => {
            loadWith(nestedEnvironment);
            spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
                afterClosed: () => of({ key: 'outdoor_temperature', source: { kind: 'profile', interval_seconds: 300, profile: { base: 12 } } }),
            } as any);

            component.openAddContextDialog(component.selectedEnvironment!);

            expect(component.environment?.context_sources?.['outdoor_temperature']?.profile?.base).toBe(12);
            expect(component.isDirty).toBe(true);
        });

        it('does not add anything when the Add dialog is cancelled', () => {
            loadWith(nestedEnvironment);
            spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

            component.openAddContextDialog(component.selectedEnvironment!);

            expect(component.environment?.context_sources).toBeUndefined();
            expect(component.isDirty).toBe(false);
        });

        it('removeContextSource deletes the key and marks the document dirty', () => {
            const env: Environment = {
                ...nestedEnvironment,
                context_sources: { outdoor_temperature: { kind: 'profile', interval_seconds: 300, profile: {} } },
            };
            loadWith(env);

            component.removeContextSource(component.selectedEnvironment!, 'outdoor_temperature');

            expect(component.environment?.context_sources?.['outdoor_temperature']).toBeUndefined();
            expect(component.isDirty).toBe(true);
        });
    });

    describe('device type / service lookups for the read-only asset and channel fields', () => {
        it('resolves the selected asset\'s external_type_id to the device type name once the catalog is loaded', () => {
            loadWith(nestedEnvironment, [{ id: 'dt1', name: 'Meter Type', services: [] }]);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_type_id = 'dt1';
            component.select(assetNode);

            expect(component.selectedAssetDeviceTypeName).toBe('Meter Type');
        });

        it('falls back to the raw id when the device type is not (yet) in the catalog', () => {
            loadWith(nestedEnvironment, []);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_type_id = 'dt1';
            component.select(assetNode);

            expect(component.selectedAssetDeviceTypeName).toBe('dt1');
        });

        it('resolves the selected channel\'s external_ref to its service name via the asset\'s device type', () => {
            loadWith(nestedEnvironment, [
                { id: 'dt1', name: 'Meter Type', services: [{ id: 's1', name: 'Power Draw', direction: 'sensor' }] },
            ]);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_type_id = 'dt1';
            const channelNode = assetNode.children[0];
            (channelNode.data as any).external_ref = 's1';
            component.select(channelNode);

            expect(component.selectedChannelServiceName).toBe('Power Draw');
        });
    });

    describe('the Platform device block\'s name resolution', () => {
        it('resolves the selected asset\'s external_ref to the device\'s display name', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1';
            spyOn(TestBed.inject(DeviceInstancesService), 'getDeviceInstance').and.returnValue(
                of({ id: 'd1', display_name: 'Boiler Room Meter', device_type_id: 'dt1' } as any),
            );

            component.select(assetNode);

            expect(component.selectedAssetDeviceName).toBe('Boiler Room Meter');
        });

        it('falls back to the raw id while the device name is not (yet) resolved', () => {
            loadWith(nestedEnvironment); // MockDeviceInstancesService resolves every lookup to null
            const assetNode = component.root!.children[0].children[0];
            (assetNode.data as any).external_ref = 'd1';

            component.select(assetNode);

            expect(component.selectedAssetDeviceName).toBe('d1');
        });

        it('is undefined for an asset without external_ref', () => {
            loadWith(nestedEnvironment);
            const assetNode = component.root!.children[0].children[0];

            component.select(assetNode);

            expect(component.selectedAssetDeviceName).toBeUndefined();
        });
    });

    describe('formula inputs (cached array, not rebuilt from the map on every keystroke)', () => {
        function selectFormulaChannel(): void {
            const channelNode = component.root!.children[0].children[0].children[0];
            component.select(channelNode);
            component.onSourceKindChange(component.selectedChannel!, 'formula');
        }

        it('keeps the same formulaEntries array reference across an unrelated re-selection of the same node', () => {
            loadWith(nestedEnvironment);
            selectFormulaChannel();
            component.addFormulaInput();
            const entriesAfterAdd = component.formulaEntries;

            // typing in the Reference field must not rebuild the array (that would reset
            // the DOM row and drop focus)
            component.setFormulaInput(entriesAfterAdd[0].name, 'context.outdoor_temp');

            expect(component.formulaEntries).toBe(entriesAfterAdd);
            expect(component.formulaEntries[0].ref).toBe('context.outdoor_temp');
        });

        it('rebuilds formulaEntries when an input is added, renamed or removed', () => {
            loadWith(nestedEnvironment);
            selectFormulaChannel();

            component.addFormulaInput();
            expect(component.formulaEntries.length).toBe(1);
            const firstName = component.formulaEntries[0].name;

            component.renameFormulaInput(firstName, 'temp');
            expect(component.formulaEntries.map((e) => e.name)).toEqual(['temp']);

            component.removeFormulaInput('temp');
            expect(component.formulaEntries).toEqual([]);
        });

        it('trackByFormulaName tracks by name', () => {
            expect(component.trackByFormulaName(0, { name: 'a' })).toBe('a');
        });
    });

    describe('Live state tab', () => {
        // z1 also carries initial_states/time_constants and a1 initial_states, so the
        // live-state drafts have something to seed from and to touch.
        const envWithState: Environment = JSON.parse(JSON.stringify(nestedEnvironment));
        envWithState.zones![0].initial_states = { occupied: true };
        envWithState.zones![0].time_constants = { occupied: 900 };
        envWithState.zones![0].assets![0].initial_states = { power: 0 };

        it('seeds context/zone/asset drafts from initial_states but starts with nothing pending', () => {
            loadWith(envWithState);

            expect(component.zoneStates.length).toBe(1);
            expect(component.zoneStates[0].draft).toEqual({ occupied: true });
            expect(component.assetStates.length).toBe(1);
            expect(component.assetStates[0].draft).toEqual({ power: 0 });
            expect(component.pendingChange).toBeUndefined(); // nothing touched yet -- Apply stays disabled
        });

        it('only includes a key in the pending change once it has actually been edited', () => {
            loadWith(envWithState);

            const zoneEntry = component.zoneStates[0];
            // untouched re-emit of the same values (e.g. a sibling row's edit) must not appear
            component.onZoneStateChange(zoneEntry, { occupied: true });
            expect(component.pendingChange).toBeUndefined();

            component.onZoneStateChange(zoneEntry, { occupied: false });
            expect(component.pendingChange).toEqual({ zones: { z1: { occupied: false } } });
        });

        it('combines touched context, zone and asset keys into one StateChange sent via setStateChecked', () => {
            loadWith(envWithState);

            component.onContextChange({ outdoor_temp: 5 });
            component.onZoneStateChange(component.zoneStates[0], { occupied: false });
            component.onAssetStateChange(component.assetStates[0], { power: 42 });

            component.applyLiveState();

            const req = httpMock.expectOne(environmentsUrl + '/e1/state');
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({
                context: { outdoor_temp: 5 },
                zones: { z1: { occupied: false } },
                assets: { a1: { power: 42 } },
            });
            req.flush(null, { status: 204, statusText: 'No Content' });
        });

        it('clears the touched keys after a successful apply, disabling Apply again', () => {
            loadWith(envWithState);
            component.onZoneStateChange(component.zoneStates[0], { occupied: false });

            component.applyLiveState();
            httpMock.expectOne(environmentsUrl + '/e1/state').flush(null, { status: 204, statusText: 'No Content' });

            expect(component.pendingChange).toBeUndefined();
        });

        it('shows the API message on a 404 (environment not running) instead of silently failing', () => {
            loadWith(envWithState);
            component.onZoneStateChange(component.zoneStates[0], { occupied: false });
            const snackBarSpy = spyOn((component as any).snackBar, 'open');

            component.applyLiveState();
            httpMock.expectOne(environmentsUrl + '/e1/state').flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });

            expect(snackBarSpy).toHaveBeenCalledWith('environment e1 is not running', 'close', { panelClass: 'snack-bar-error' });
        });

        it('does not call the API when nothing is touched', () => {
            loadWith(envWithState);

            expect(component.pendingChange).toBeUndefined();
            component.applyLiveState();

            httpMock.expectNone(environmentsUrl + '/e1/state');
        });
    });

    describe('Live state tab: real-time polling', () => {
        const envWithState: Environment = JSON.parse(JSON.stringify(nestedEnvironment));
        envWithState.zones![0].initial_states = { occupied: true };
        envWithState.zones![0].assets![0].initial_states = { power: 0 };

        function activateLiveStateTab(): void {
            component.onTabChange({ tab: { textLabel: 'Live state' } } as any);
        }

        function leaveLiveStateTab(): void {
            component.onTabChange({ tab: { textLabel: 'Editor' } } as any);
        }

        it('does not poll while the Editor tab is active', () => {
            loadWith(envWithState);
            httpMock.expectNone(environmentsUrl + '/e1/state');
        });

        it('polls GET .../state immediately on activating the Live state tab, and again every 10s while it stays active', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            const req1 = httpMock.expectOne(environmentsUrl + '/e1/state');
            expect(req1.request.method).toBe('GET');
            req1.flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            httpMock.expectNone(environmentsUrl + '/e1/state'); // nothing again before 10s pass
            tick(10000);
            const req2 = httpMock.expectOne(environmentsUrl + '/e1/state');
            req2.flush({ running: true, as_of: '2026-08-27T10:00:10Z', context: {}, zones: {}, assets: {} });

            discardPeriodicTasks();
        }));

        it('stops polling once the tab is left, and does not resume on its own', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(environmentsUrl + '/e1/state').flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            leaveLiveStateTab();
            tick(20000);

            httpMock.expectNone(environmentsUrl + '/e1/state');
            discardPeriodicTasks();
        }));

        it('stops polling on destroy', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(environmentsUrl + '/e1/state').flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            fixture.destroy();
            tick(20000);

            httpMock.expectNone(environmentsUrl + '/e1/state');
        }));

        it('shows the real runtime values when running, updating liveStateRunning/liveStateAsOf', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(environmentsUrl + '/e1/state').flush({
                running: true,
                as_of: '2026-08-27T10:00:00Z',
                context: {},
                zones: { z1: { occupied: false } },
                assets: { a1: { power: 42 } },
            });

            expect(component.liveStateRunning).toBe(true);
            expect(component.liveStateAsOf).toEqual(new Date('2026-08-27T10:00:00Z'));
            expect(component.zoneStates[0].draft).toEqual({ occupied: false });
            expect(component.assetStates[0].draft).toEqual({ power: 42 });

            discardPeriodicTasks();
        }));

        it('falls back to the reference values and flags not-running when the simulation is not running', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(environmentsUrl + '/e1/state').flush({ running: false, as_of: '2026-08-27T10:00:00Z' });

            expect(component.liveStateRunning).toBe(false);
            // untouched by the (running:false) poll -- still the definition's initial_states
            expect(component.zoneStates[0].draft).toEqual({ occupied: true });
            expect(component.assetStates[0].draft).toEqual({ power: 0 });

            discardPeriodicTasks();
        }));

        it('does not overwrite a touched (edited but not yet applied) key with a poll update, but does refresh untouched ones', fakeAsync(() => {
            loadWith(envWithState);
            component.onZoneStateChange(component.zoneStates[0], { occupied: false }); // user edit, not yet applied
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(environmentsUrl + '/e1/state').flush({
                running: true,
                as_of: '2026-08-27T10:00:00Z',
                context: {},
                zones: { z1: { occupied: true } }, // server disagrees with the untouched-from-server-POV edit
                assets: { a1: { power: 7 } }, // untouched -- must be applied
            });

            expect(component.zoneStates[0].draft).toEqual({ occupied: false }); // kept: still touched, not applied
            expect(component.assetStates[0].draft).toEqual({ power: 7 }); // refreshed: was untouched

            discardPeriodicTasks();
        }));

        it('leaves the drafts alone on a failed poll (null from the service) instead of clearing them', fakeAsync(() => {
            loadWith(envWithState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(environmentsUrl + '/e1/state').flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });

            expect(component.liveStateRunning).toBeUndefined();
            expect(component.zoneStates[0].draft).toEqual({ occupied: true });

            discardPeriodicTasks();
        }));
    });
});
