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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { ExportService } from './export.service';
import { BrokerExportService } from './broker-export.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';

describe('stopPipelines', () => {
    const failingHttp = (status: number) => ({ request: () => throwError(() => new HttpErrorResponse({ status })) }) as unknown as HttpClient;
    const errorHandler = { logError: () => {} } as unknown as ErrorHandlerService;
    const ladon = { getUserAuthorizationsForURI: () => ({}) } as unknown as LadonService;

    // The component tells a gateway timeout from a failure by this status; it used to be 404 for every error.
    it('should hand the real error status of the export service to the caller', (done) => {
        const service = new ExportService(failingHttp(504), errorHandler, ladon, {} as DeviceInstancesService);
        service.stopPipelines(['e1', 'e2']).subscribe(result => {
            expect(result).toEqual({ status: 504 });
            done();
        });
    });

    it('should hand the real error status of the broker export service to the caller', (done) => {
        const service = new BrokerExportService(failingHttp(504), errorHandler, ladon);
        service.stopPipelines(['e1', 'e2']).subscribe(result => {
            expect(result).toEqual({ status: 504 });
            done();
        });
    });
});
