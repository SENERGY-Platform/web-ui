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
import { of } from 'rxjs';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceSelectablesModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { PipelineRegistryService } from '../../../modules/data/pipeline-registry/shared/pipeline-registry.service';
import { OperatorRepoService } from '../../../modules/data/operator-repo/shared/operator-repo.service';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { DataTableHelperService } from './data-table-helper.service';

describe('DataTableHelperService', () => {
    let service: DataTableHelperService;
    let deviceInstances: jasmine.SpyObj<DeviceInstancesService>;

    const selectables = [{ device: { id: 'device-1', name: 'Meter' } }] as DeviceSelectablesModel[];

    beforeEach(() => {
        deviceInstances = jasmine.createSpyObj('DeviceInstancesService', ['getDeviceSelections']);
        deviceInstances.getDeviceSelections.and.returnValue(of(selectables));

        TestBed.configureTestingModule({
            providers: [
                DataTableHelperService,
                { provide: DeviceInstancesService, useValue: deviceInstances },
                { provide: DeviceTypeService, useValue: jasmine.createSpyObj('DeviceTypeService', ['getAspectsMeasuringFunctions']) },
                { provide: ExportService, useValue: jasmine.createSpyObj('ExportService', ['getExports']) },
                { provide: PipelineRegistryService, useValue: jasmine.createSpyObj('PipelineRegistryService', ['getPipelines']) },
                { provide: OperatorRepoService, useValue: jasmine.createSpyObj('OperatorRepoService', ['getOperator']) },
                { provide: ImportInstancesService, useValue: jasmine.createSpyObj('ImportInstancesService', ['listImportInstances']) },
                { provide: ImportTypesService, useValue: jasmine.createSpyObj('ImportTypesService', ['getImportType']) },
            ],
        });
        service = TestBed.inject(DataTableHelperService);
    });

    it('asks the device repository once per aspect and function', (done) => {
        service.preloadDevicesOfFunctionAndAspect('aspect-1', 'function-1').subscribe(() => {
            service.preloadDevicesOfFunctionAndAspect('aspect-1', 'function-1').subscribe((devices) => {
                expect(devices).toEqual(selectables);
                expect(deviceInstances.getDeviceSelections).toHaveBeenCalledTimes(1);
                done();
            });
        });
    });

    it('asks again for another function of the same aspect', (done) => {
        service.preloadDevicesOfFunctionAndAspect('aspect-1', 'function-1').subscribe(() => {
            service.preloadDevicesOfFunctionAndAspect('aspect-1', 'function-2').subscribe(() => {
                expect(deviceInstances.getDeviceSelections).toHaveBeenCalledTimes(2);
                expect(service.getDevicesOfFunctionAndAspect('aspect-1', 'function-2')).toEqual(selectables);
                done();
            });
        });
    });
});
