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
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { defer, of } from 'rxjs';
import {
    DeviceInstancesReplaceDialogComponent,
    deploymentElementCriteria,
    pipelineInputCriteria,
} from './device-instances-replace-dialog.component';
import { DeviceInstancesService } from '../../shared/device-instances.service';
import { DeviceInstanceModel } from '../../shared/device-instances.model';
import { ThingsService } from '../../../things/shared/things.service';
import { ThingDeviceLinkModel, ThingModel } from '../../../things/shared/things.model';
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { PipelineRegistryService } from 'src/app/modules/data/pipeline-registry/shared/pipeline-registry.service';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeploymentsService } from 'src/app/modules/processes/deployments/shared/deployments.service';
import { PipelineInputSelectionModel } from 'src/app/modules/data/flow-repo/deploy-flow/shared/pipeline-request.model';
import { V2DeploymentsPreparedFilterCriteriaModel } from 'src/app/modules/processes/deployments/shared/deployments-prepared-v2.model';

const air = 'urn:infai:ses:aspect:air';
const water = 'urn:infai:ses:aspect:water';
const fn = 'urn:infai:ses:measuring-function:temperature';

describe('device replacement criteria', () => {
    const selection = (fields: Partial<PipelineInputSelectionModel>): PipelineInputSelectionModel =>
        ({ inputName: 'value', aspectId: null, functionId: fn, characteristicIds: [], selectableId: 'g', ...fields });
    const filter = (fields: Partial<V2DeploymentsPreparedFilterCriteriaModel>): V2DeploymentsPreparedFilterCriteriaModel =>
        ({ characteristic_id: null, function_id: fn, device_class_id: null, aspect_id: null, ...fields });

    it('asks for no aspect for a pipeline input without one', () => {
        expect(pipelineInputCriteria(selection({ aspectId: '' }))).toEqual({ function_id: fn });
        expect(pipelineInputCriteria(selection({ aspectId: null, aspectIds: null }))).toEqual({ function_id: fn });
    });

    it('asks for the single aspect of a pipeline input saved before the list, in both spellings', () => {
        expect(pipelineInputCriteria(selection({ aspectId: air }))).toEqual({ aspect_id: air, aspect_ids: [air], function_id: fn });
    });

    it('asks for the union of both pipeline fields, sorted, with the first as the alias', () => {
        expect(pipelineInputCriteria(selection({ aspectId: water, aspectIds: [air] }))).toEqual({
            aspect_id: air,
            aspect_ids: [air, water],
            function_id: fn,
        });
    });

    it('asks for no aspect for a deployment element without one', () => {
        expect(deploymentElementCriteria(filter({}), 'event')).toEqual({
            interaction: 'event',
            function_id: fn,
            device_class_id: undefined,
        });
    });

    it('asks for the union of both deployment fields, sorted, with the first as the alias', () => {
        expect(deploymentElementCriteria(filter({ aspect_id: water, aspect_ids: [water, air] }), '')).toEqual({
            interaction: '',
            function_id: fn,
            aspect_id: air,
            aspect_ids: [air, water],
            device_class_id: undefined,
        });
    });
});

describe('DeviceInstancesReplaceDialogComponent save', () => {
    let component: DeviceInstancesReplaceDialogComponent;
    let deviceInstancesServiceSpy: Spy<DeviceInstancesService>;
    let matDialogRefSpy: Spy<MatDialogRef<DeviceInstancesReplaceDialogComponent>>;
    let snackOpen: jasmine.Spy;
    let thingsServiceSpy: Spy<ThingsService>;
    const oldDevice = { id: 'old', name: 'device', local_id: 'local', attributes: [] } as unknown as DeviceInstanceModel;
    const newDevice = { id: 'new', name: 'device' } as DeviceInstanceModel;
    let clonesCreated: number;

    beforeEach(() => {
        deviceInstancesServiceSpy = createSpyFromClass(DeviceInstancesService);
        matDialogRefSpy = createSpyFromClass<MatDialogRef<DeviceInstancesReplaceDialogComponent>>(MatDialogRef);
        thingsServiceSpy = createSpyFromClass(ThingsService);
        clonesCreated = 0;
        // the call only builds the request; the clone exists once it is subscribed
        deviceInstancesServiceSpy.saveDeviceInstance.and.callFake(() => defer(() => {
            clonesCreated++;
            return of(newDevice);
        }));
        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceInstancesService, useValue: deviceInstancesServiceSpy },
                { provide: ThingsService, useValue: thingsServiceSpy },
                { provide: MatDialogRef, useValue: matDialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { device: JSON.parse(JSON.stringify(oldDevice)) } },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: DeviceTypeService, useValue: createSpyFromClass(DeviceTypeService) },
                { provide: PipelineRegistryService, useValue: createSpyFromClass(PipelineRegistryService) },
                { provide: SmartServiceInstanceService, useValue: createSpyFromClass(SmartServiceInstanceService) },
                { provide: SmartServiceReleasesService, useValue: createSpyFromClass(SmartServiceReleasesService) },
                { provide: NetworksService, useValue: createSpyFromClass(NetworksService) },
                { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
                { provide: MatDialog, useValue: createSpyFromClass(MatDialog) },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
        // ngOnInit is not run: save() needs only the form defaults
        component = TestBed.createComponent(DeviceInstancesReplaceDialogComponent).componentInstance;
        component.form.patchValue({ groupAddition: component.groupAddNone });
    });

    it('closes the dialog with true when the old device was updated and the clone exists', () => {
        deviceInstancesServiceSpy.updateDeviceInstance.and.returnValue(of(oldDevice));

        component.save();

        expect(clonesCreated).toBe(1);
        expect(matDialogRefSpy.close.calls.allArgs()).toEqual([[true]]);
        expect(snackOpen).not.toHaveBeenCalled();
    });

    it('stops when the old device could not be updated: no clone, dialog stays open, error snack', () => {
        deviceInstancesServiceSpy.updateDeviceInstance.and.returnValue(of(null));

        component.save();

        expect(clonesCreated).toBe(0);
        expect(matDialogRefSpy.close.calls.count()).toBe(0);
        expect(snackOpen.calls.mostRecent().args[0]).toContain('the replaced device could not be updated');
        expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
    });

    describe('with a device on a meter thing', () => {
        const link: ThingDeviceLinkModel = {
            id: 'l1',
            device_id: 'old',
            from: '2024-01-01T00:00:00Z',
            until: null,
            readings: [{ service_id: 's1', column: 'metrics.energy', from_value: 5 }],
        };
        const meter: ThingModel = { id: 'thing1', name: 'Meter', kind: 'meter', attributes: [], content_variables: [], owner_id: 'u', device_links: [link] };

        beforeEach(() => {
            component.path = { kind: 'swap', target: { thing: meter, link } };
            component.removalRows = [{ service_id: 's1', column: 'metrics.energy', from: '', until: '99,5' }];
            component.installationRows = [{ service_id: 's1', column: 'metrics.energy', from: '0', until: '' }];
            component.factor = '40';
            component.form.patchValue({ date: '2026-06-16T10:00:00' });
            deviceInstancesServiceSpy.updateDeviceInstance.and.returnValue(of(oldDevice));
            thingsServiceSpy.swapDeviceLink.and.returnValue(of(meter));
        });

        it('swaps the link instead of leaving the measuring point alone, and the clone gets the old id renamed', () => {
            component.save();

            expect(thingsServiceSpy.swapDeviceLink).toHaveBeenCalledOnceWith('thing1', 'l1', {
                at: new Date('2026-06-16T10:00:00').toISOString().slice(0, 19) + 'Z',
                device_id: 'new',
                until_values: [{ service_id: 's1', column: 'metrics.energy', until_value: 99.5 }],
                readings: [{ service_id: 's1', column: 'metrics.energy', from_value: 0 }],
                factor: 40,
            });
            // a clone copies the local id, which is unique, so the old device is renamed by the date entered
            expect(deviceInstancesServiceSpy.updateDeviceInstance.calls.mostRecent().args[0].local_id).toBe('local_26_06_16');
            expect(matDialogRefSpy.close.calls.allArgs()).toEqual([[true]]);
        });

        it('swaps to the same device for a counter reset: no rename, not marked inactive, no clone', () => {
            const same = JSON.parse(JSON.stringify(oldDevice)) as DeviceInstanceModel;
            component.form.patchValue({ mode: DeviceInstancesReplaceDialogComponent.modeExisting });
            component.form.get('existing.device')?.setValue(same);

            component.save();

            expect(deviceInstancesServiceSpy.updateDeviceInstance).not.toHaveBeenCalled();
            expect(clonesCreated).toBe(0);
            expect(thingsServiceSpy.swapDeviceLink.calls.mostRecent().args[2].device_id).toBe('old');
            expect(matDialogRefSpy.close.calls.allArgs()).toEqual([[true]]);
        });

        it('takes back the clone and the old device when the swap is refused, and a retry starts clean', () => {
            deviceInstancesServiceSpy.deleteDeviceInstanceChecked.and.returnValue(of(true));
            thingsServiceSpy.swapDeviceLink.and.returnValue(of(null));
            component.save();

            expect(matDialogRefSpy.close.calls.count()).toBe(0);
            expect(deviceInstancesServiceSpy.deleteDeviceInstanceChecked).toHaveBeenCalledOnceWith('new');
            const restored = deviceInstancesServiceSpy.updateDeviceInstance.calls.mostRecent().args[0] as DeviceInstanceModel;
            expect(restored.local_id).toBe('local');
            expect(restored.attributes?.find(a => a.key === 'inactive')).toBeUndefined();
            expect(deviceInstancesServiceSpy.updateDeviceInstance.calls.count()).toBe(2);

            thingsServiceSpy.swapDeviceLink.and.returnValue(of(meter));
            component.save();
            expect(clonesCreated).toBe(2);
            expect((deviceInstancesServiceSpy.updateDeviceInstance.calls.mostRecent().args[0] as DeviceInstanceModel).local_id).toBe('local_26_06_16');
            expect(matDialogRefSpy.close.calls.allArgs()).toEqual([[true]]);
        });

        it('names the clone that could not be removed and leaves the old device alone, as its local id is taken', () => {
            deviceInstancesServiceSpy.deleteDeviceInstanceChecked.and.returnValue(of(false));
            thingsServiceSpy.swapDeviceLink.and.returnValue(of(null));
            component.save();

            expect(deviceInstancesServiceSpy.updateDeviceInstance.calls.count()).toBe(1);
            const message = snackOpen.calls.mostRecent().args[0] as string;
            expect(message).toContain('the new device "device" could not be removed');
            expect(message).toContain('keeps its new local id');
        });

        it('names the old device when it could not be restored', () => {
            deviceInstancesServiceSpy.deleteDeviceInstanceChecked.and.returnValue(of(true));
            deviceInstancesServiceSpy.updateDeviceInstance.and.returnValues(of(oldDevice), of(null));
            thingsServiceSpy.swapDeviceLink.and.returnValue(of(null));
            component.save();

            expect(snackOpen.calls.mostRecent().args[0]).toContain('the replaced device could not be restored');
            expect(matDialogRefSpy.close.calls.count()).toBe(0);
        });

        it('does not write anything when the client can see the input is wrong', () => {
            component.factor = '0';
            component.save();
            expect(component.swapError()).toContain('factor');
            component.factor = '';
            component.installationRows[0].from = 'x';
            component.save();
            expect(deviceInstancesServiceSpy.updateDeviceInstance).not.toHaveBeenCalled();
            expect(clonesCreated).toBe(0);
        });

        it('does not save a date before the start of the link', () => {
            component.form.patchValue({ date: '2023-12-31T10:00:00' });
            component.save();
            expect(component.swapError()).toContain('after the start');
            expect(deviceInstancesServiceSpy.updateDeviceInstance).not.toHaveBeenCalled();
            expect(thingsServiceSpy.swapDeviceLink).not.toHaveBeenCalled();
        });
    });

    it('keeps the legacy behaviour for a device on no meter thing: suffix, inactive, no swap', () => {
        deviceInstancesServiceSpy.updateDeviceInstance.and.returnValue(of(oldDevice));
        component.form.patchValue({ date: '2026-06-16T10:00:00' });

        component.save();

        const updated = deviceInstancesServiceSpy.updateDeviceInstance.calls.mostRecent().args[0] as DeviceInstanceModel;
        expect(updated.local_id).toBe('local_26_06_16');
        expect(updated.attributes?.find(a => a.key === 'inactive')?.value).toBe('true');
        expect(thingsServiceSpy.swapDeviceLink).not.toHaveBeenCalled();
    });

    it('refuses to replace a device on no meter thing by itself', () => {
        component.form.patchValue({ mode: DeviceInstancesReplaceDialogComponent.modeExisting });
        component.form.get('existing.device')?.setValue(JSON.parse(JSON.stringify(oldDevice)));

        component.save();

        expect(deviceInstancesServiceSpy.updateDeviceInstance).not.toHaveBeenCalled();
        expect(snackOpen.calls.mostRecent().args[0]).toContain('cannot replace itself');
    });

    it('does not save while the lookup of the measuring points is open or failed', () => {
        component.lookup = 'failed';
        component.save();
        component.lookup = 'pending';
        component.save();
        expect(deviceInstancesServiceSpy.updateDeviceInstance).not.toHaveBeenCalled();
    });
});
