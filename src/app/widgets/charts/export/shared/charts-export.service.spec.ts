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
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ChartsExportService } from './charts-export.service';
import { ChartsExportMeasurementModel, ChartsExportPropertiesModel } from './charts-export-properties.model';
import { ExportDataService } from '../../../shared/export-data.service';
import { QueriesRequestV2ElementTimescaleModel } from '../../../shared/export-data.model';
import { LadonService } from '../../../../modules/admin/permissions/shared/services/ladom.service';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DeviceInstancesService } from '../../../../modules/devices/device-instances/shared/device-instances.service';
import { environment } from '../../../../../environments/environment';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return undefined;
    }
}

describe('ChartsExportService', () => {
    let service: ChartsExportService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ChartsExportService,
                ExportDataService,
                { provide: LadonService, useClass: MockLadonService },
                { provide: ElementSizeService, useValue: {} },
                { provide: ErrorHandlerService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: DashboardService, useValue: {} },
                { provide: DeviceInstancesService, useValue: {} },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ChartsExportService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // The DWD weather export carries many series in one table, told apart only by a tag
    // column (station_id) -- the bug turned that tag filter's column into the value column
    // as soon as it went through the Timescale branch, so a station filter silently matched
    // the value instead.
    function timescaleExport(): ChartsExportMeasurementModel {
        return { id: 'export-1', name: 'weather', values: [], exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb };
    }

    function expectTimescaleRequest(): QueriesRequestV2ElementTimescaleModel {
        const req = httpMock.expectOne(environment.timescaleAPIURL + '/queries/v2');
        expect(req.request.method).toBe('POST');
        req.flush([{ requestIndex: 0, data: [] }]);
        return req.request.body[0];
    }

    it('keeps a tag filter on its own tag column in the Timescale branch', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                tagSelection: ['station_id!02932'],
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([{ column: 'station_id', type: '=', value: '02932' }]);
    });

    it('points the value filter at the value column in the Timescale branch', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                filterType: '>',
                filterValue: 5,
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([{ column: 'global_irradiance_wm2', type: '>', value: 5 }]);
    });

    it('applies both filters correctly together', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                tagSelection: ['station_id!02932'],
                filterType: '>',
                filterValue: 5,
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([
            { column: 'station_id', type: '=', value: '02932' },
            { column: 'global_irradiance_wm2', type: '>', value: 5 },
        ]);
    });
});
