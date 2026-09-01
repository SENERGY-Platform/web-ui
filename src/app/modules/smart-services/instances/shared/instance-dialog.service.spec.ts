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

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NEVER, of } from 'rxjs';
import { SmartServiceExtendedParameterModel, SmartServiceParameterOptionModel } from '../../releases/shared/release.model';
import { SmartServiceReleasesService } from '../../releases/shared/release.service';
import {
    SmartServiceParameterDialogData,
    SmartServiceParameterDialogResult,
} from '../dialog/smart-service-parameter-dialog/smart-service-parameter-dialog.component';
import { SmartServiceInstanceDialogService } from './instance-dialog.service';
import { SmartServiceInstanceModel } from './instances.model';
import { SmartServiceInstanceService } from './instances.service';
import { parameterTypeText } from './parameters';

const param = (overwrite: Partial<SmartServiceExtendedParameterModel>): SmartServiceExtendedParameterModel => ({
    id: 'p1',
    label: 'Parameter',
    value: null,
    description: '',
    default_value: null,
    type: parameterTypeText,
    options: null,
    multiple: false,
    order: 0,
    optional: false,
    has_no_valid_option: false,
    ...overwrite,
});

const option = (overwrite: Partial<SmartServiceParameterOptionModel>): SmartServiceParameterOptionModel => ({
    value: 'v',
    label: 'Option',
    kind: '',
    entity_id: '',
    ...overwrite,
});

const instance = (overwrite: Partial<SmartServiceInstanceModel>): SmartServiceInstanceModel => ({
    name: 'PV Forecast',
    description: 'the roof',
    parameters: [],
    id: 'i1',
    user_id: 'u1',
    design_id: 'de1',
    release_id: 'r1',
    ready: true,
    created_at: 0,
    updated_at: 0,
    permissions_info: { shared: false, permissions: { administrate: true, execute: true, read: true, write: true } },
    ...overwrite,
});

describe('SmartServiceInstanceDialogService', () => {
    let dialog: jasmine.SpyObj<MatDialog>;
    let releases: jasmine.SpyObj<SmartServiceReleasesService>;
    let instances: jasmine.SpyObj<SmartServiceInstanceService>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let service: SmartServiceInstanceDialogService;

    beforeEach(() => {
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        releases = jasmine.createSpyObj<SmartServiceReleasesService>('SmartServiceReleasesService', ['getReleaseParameters', 'getRelease']);
        instances = jasmine.createSpyObj<SmartServiceInstanceService>('SmartServiceInstanceService', [
            'createInstance',
            'updateInstanceParameters',
            'updateInstanceInfo',
        ]);
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        service = new SmartServiceInstanceDialogService(dialog, releases, instances, snackBar);

        releases.getRelease.and.returnValue(of({ id: 'r2', design_id: 'de1', name: 'PV Forecast 2', description: '', created_at: '0' }));
        instances.createInstance.and.returnValue(of(instance({})));
        instances.updateInstanceParameters.and.returnValue(of(instance({})));
        instances.updateInstanceInfo.and.returnValue(of(instance({})));
    });

    /** what the dialog closes with, or undefined for a cancel */
    const dialogCloses = (result?: SmartServiceParameterDialogResult) => {
        dialog.open.and.returnValue({ afterClosed: () => of(result) } as any);
    };

    const dialogOpened = () => dialog.open.calls.mostRecent().args[1]?.data as SmartServiceParameterDialogData;

    describe('launch', () => {
        it('posts what the dialog collected against the release', () => {
            releases.getReleaseParameters.and.returnValue(of([param({})]));
            dialogCloses({ name: 'My Forecast', description: 'here', parameters: [{ id: 'p1', value: 'x', label: 'Parameter' }] });

            let created: boolean | undefined;
            service.launch({ id: 'r1', name: 'PV Forecast', description: 'a release' }).subscribe((r) => (created = r));

            expect(created).toBe(true);
            expect(instances.createInstance).toHaveBeenCalledWith('r1', {
                name: 'My Forecast',
                description: 'here',
                parameters: [{ id: 'p1', value: 'x', label: 'Parameter' }],
            });
        });

        it('offers the name and description of the release as a starting point', () => {
            releases.getReleaseParameters.and.returnValue(of([]));
            dialogCloses(undefined);
            service.launch({ id: 'r1', name: 'PV Forecast', description: 'a release' }).subscribe();
            expect(dialogOpened().name).toBe('PV Forecast');
            expect(dialogOpened().description).toBe('a release');
            expect(dialogOpened().collectInfo).toBe(true);
        });

        it('creates nothing when the dialog is cancelled', () => {
            releases.getReleaseParameters.and.returnValue(of([param({})]));
            dialogCloses(undefined);

            let created: boolean | undefined;
            service.launch({ id: 'r1', name: 'PV Forecast', description: '' }).subscribe((r) => (created = r));

            expect(created).toBe(false);
            expect(instances.createInstance).not.toHaveBeenCalled();
        });

        // the dialog is already up by then, so it closes itself and the failure is reported here
        it('reports a failure to load the parameters', () => {
            releases.getReleaseParameters.and.returnValue(of(null));
            dialogCloses(undefined);

            let created: boolean | undefined;
            service.launch({ id: 'r1', name: 'PV Forecast', description: '' }).subscribe((r) => (created = r));
            dialogOpened().parameters.subscribe();

            expect(created).toBe(false);
            expect(snackBar.open).toHaveBeenCalled();
        });

        it('opens the dialog without waiting for the parameters', () => {
            releases.getReleaseParameters.and.returnValue(NEVER);
            dialogCloses(undefined);
            service.launch({ id: 'r1', name: 'PV Forecast', description: '' }).subscribe();
            expect(dialog.open).toHaveBeenCalled();
        });
    });

    describe('edit', () => {
        it('shows the values the instance already has', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1' })]));
            dialogCloses(undefined);
            service.edit(instance({ parameters: [{ id: 'p1', value: 'stored', label: 'Parameter' }] })).subscribe();

            let shown: SmartServiceExtendedParameterModel[] | null = null;
            dialogOpened().parameters.subscribe((p) => (shown = p));
            expect(shown![0].value).toBe('stored');
        });

        // the parameters take a slow round trip, so the dialog has to be up before they arrive
        it('opens the dialog without waiting for the parameters', () => {
            releases.getReleaseParameters.and.returnValue(NEVER);
            dialogCloses(undefined);
            service.edit(instance({})).subscribe();
            expect(dialog.open).toHaveBeenCalled();
        });

        it('writes the name only when it changed, it is a different endpoint', () => {
            releases.getReleaseParameters.and.returnValue(of([]));
            dialogCloses({ name: 'PV Forecast', description: 'the roof', parameters: [] });
            service.edit(instance({})).subscribe();
            expect(instances.updateInstanceInfo).not.toHaveBeenCalled();
            expect(instances.updateInstanceParameters).toHaveBeenCalled();
        });

        it('writes the name when it changed', () => {
            releases.getReleaseParameters.and.returnValue(of([]));
            dialogCloses({ name: 'Renamed', description: 'the roof', parameters: [] });
            service.edit(instance({})).subscribe();
            expect(instances.updateInstanceInfo).toHaveBeenCalledWith('i1', { name: 'Renamed', description: 'the roof' });
        });

        it('does not move the instance to another release', () => {
            releases.getReleaseParameters.and.returnValue(of([]));
            dialogCloses({ name: 'PV Forecast', description: 'the roof', parameters: [] });
            service.edit(instance({})).subscribe();
            // no release id: passing one is what the upgrade does, editing stays on the release it is on
            expect(instances.updateInstanceParameters).toHaveBeenCalledWith('i1', []);
        });
    });

    describe('upgrade', () => {
        const upgradable = instance({ new_release_id: 'r2', parameters: [{ id: 'p1', value: 'stored', label: 'Parameter' }] });

        it('switches over without asking when every parameter carries over', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1' })]));

            let changed: boolean | undefined;
            service.upgrade(upgradable).subscribe((r) => (changed = r));

            expect(dialog.open).not.toHaveBeenCalled();
            expect(changed).toBe(true);
            expect(instances.updateInstanceParameters).toHaveBeenCalledWith('i1', [{ id: 'p1', value: 'stored', label: 'Parameter' }], 'r2');
        });

        it('asks when the new release added a parameter', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1' }), param({ id: 'p2' })]));
            dialogCloses(undefined);

            service.upgrade(upgradable).subscribe();

            expect(dialog.open).toHaveBeenCalled();
            expect(instances.updateInstanceParameters).not.toHaveBeenCalled();
        });

        it('asks when a carried over value no longer matches an option of the new release', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1', options: [option({ value: 'other', entity_id: 'e' })] })]));
            dialogCloses(undefined);

            service.upgrade(upgradable).subscribe();

            expect(dialog.open).toHaveBeenCalled();
            expect(instances.updateInstanceParameters).not.toHaveBeenCalled();
        });

        it('does not ask for a name, an upgrade keeps the one the instance has', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1' }), param({ id: 'p2' })]));
            dialogCloses(undefined);
            service.upgrade(upgradable).subscribe();
            expect(dialogOpened().collectInfo).toBe(false);
        });

        it('moves the instance onto the new release with what the dialog collected', () => {
            releases.getReleaseParameters.and.returnValue(of([param({ id: 'p1' }), param({ id: 'p2' })]));
            dialogCloses({ name: 'PV Forecast', description: 'the roof', parameters: [{ id: 'p2', value: 'new', label: 'Parameter' }] });

            service.upgrade(upgradable).subscribe();

            expect(instances.updateInstanceParameters).toHaveBeenCalledWith('i1', [{ id: 'p2', value: 'new', label: 'Parameter' }], 'r2');
        });

        it('does nothing for an instance the repository announced no new release for', () => {
            let changed: boolean | undefined;
            service.upgrade(instance({})).subscribe((r) => (changed = r));

            expect(changed).toBe(false);
            expect(releases.getReleaseParameters).not.toHaveBeenCalled();
        });
    });
});
