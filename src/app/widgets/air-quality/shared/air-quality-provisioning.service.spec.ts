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
import { MatSnackBar } from '@angular/material/snack-bar';
import { WidgetPropertiesModels } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { AirQualityProvisioningService } from './air-quality-provisioning.service';
import { MeasurementModel } from './air-quality.model';

describe('AirQualityProvisioningService', () => {
    let service: AirQualityProvisioningService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AirQualityProvisioningService,
                { provide: ExportService, useValue: {} },
                { provide: ImportInstancesService, useValue: {} },
                { provide: ImportTypesService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
            ],
        });
        service = TestBed.inject(AirQualityProvisioningService);
    });

    it('counts the exports measurements and pollen read from as references, so the clean-up keeps them', () => {
        const measurement = (exportId?: string, outsideExportId?: string) => ({
            export: exportId ? { ID: exportId } as ExportModel : undefined,
            outsideExport: outsideExportId ? { ID: outsideExportId } as ExportModel : undefined,
        }) as MeasurementModel;
        const properties = {
            ubaInfo: { exportId: 'uba-export', importInstanceId: 'uba-instance' },
            measurements: [measurement(undefined, 'picked-generated-export'), measurement('own-export'), measurement()],
            pollen: [measurement('pollen-export')],
        } as unknown as WidgetPropertiesModels;

        const ids = service.referencesOf(properties).map((r) => `${r.kind}:${r.id}`);

        expect(ids).toEqual(jasmine.arrayWithExactContents([
            'export:uba-export', 'import instance:uba-instance',
            'export:picked-generated-export', 'export:own-export', 'export:pollen-export',
        ]));
    });
});
