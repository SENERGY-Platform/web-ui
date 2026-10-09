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
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
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
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { PipelineRegistryService } from 'src/app/modules/data/pipeline-registry/shared/pipeline-registry.service';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeploymentsFogFactory } from 'src/app/modules/processes/deployments/shared/deployments-fog.service';
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
    const oldDevice = { id: 'old', name: 'device', local_id: 'local', attributes: [] } as unknown as DeviceInstanceModel;
    const newDevice = { id: 'new', name: 'device' } as DeviceInstanceModel;
    let clonesCreated: number;

    beforeEach(() => {
        deviceInstancesServiceSpy = createSpyFromClass(DeviceInstancesService);
        matDialogRefSpy = createSpyFromClass<MatDialogRef<DeviceInstancesReplaceDialogComponent>>(MatDialogRef);
        clonesCreated = 0;
        // the call only builds the request; the clone exists once it is subscribed
        deviceInstancesServiceSpy.saveDeviceInstance.and.callFake(() => defer(() => {
            clonesCreated++;
            return of(newDevice);
        }));
        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceInstancesService, useValue: deviceInstancesServiceSpy },
                { provide: MatDialogRef, useValue: matDialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { device: JSON.parse(JSON.stringify(oldDevice)) } },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: DeviceTypeService, useValue: createSpyFromClass(DeviceTypeService) },
                { provide: PipelineRegistryService, useValue: createSpyFromClass(PipelineRegistryService) },
                { provide: SmartServiceInstanceService, useValue: createSpyFromClass(SmartServiceInstanceService) },
                { provide: SmartServiceReleasesService, useValue: createSpyFromClass(SmartServiceReleasesService) },
                { provide: NetworksService, useValue: createSpyFromClass(NetworksService) },
                { provide: DeploymentsFogFactory, useValue: createSpyFromClass(DeploymentsFogFactory) },
                { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
                { provide: MatDialog, useValue: createSpyFromClass(MatDialog) },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
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
});
