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

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AutomationEngineService } from 'src/app/core/services/automation-engine.service';
import { QueriesRequestElementTimescaleModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { WARMUP_COLUMNS, WIDGET_MODULE_TYPE, WarmupConfig, ZoneWarmup, warmupByZone, warmupConfig } from './heating-schedule.warmup';

/** Reads the warm-up information of an instance. Every failure is logged and answered as "no warm-up information". */
@Injectable({
    providedIn: 'root',
})
export class HeatingWarmupService {
    private automationEngineService = inject(AutomationEngineService);
    private exportDataService = inject(ExportDataService);

    /** The warm-up export the instance's `widget` module names; null without one. */
    config(instanceId: string): Observable<WarmupConfig | null> {
        return this.automationEngineService.listModules({ instanceId, moduleType: WIDGET_MODULE_TYPE }).pipe(
            map((list) => warmupConfig(list.items)),
            catchError((error) => {
                console.error('The heating widget module could not be read', error);
                return of(null);
            }),
        );
    }

    /** The newest row of each zone `zone:<plan index>`, in one request and in the order of `planIndices`; null for a zone without a row. */
    newestRows(exportId: string, planIndices: number[]): Observable<Array<ZoneWarmup | null>> {
        const none = Array<ZoneWarmup | null>(planIndices.length).fill(null);
        const query: QueriesRequestElementTimescaleModel[] = planIndices.map((zone) => ({
            exportId,
            columns: WARMUP_COLUMNS.map((name) => ({ name })),
            filters: [{ column: 'zone', type: '=', value: 'zone:' + zone }],
            limit: 1,
            orderColumnIndex: 0,
            orderDirection: 'desc',
        }));
        return this.exportDataService.queryTimescale(query).pipe(
            map((answer) => warmupByZone(answer, planIndices.length)),
            catchError((error) => {
                // an export that has no table yet answers with an error as well
                console.error('The warm-up export could not be read', error);
                return of(none);
            }),
        );
    }
}
