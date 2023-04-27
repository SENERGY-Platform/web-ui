/*
 * Copyright 2020 InfAI (CC SES)
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

import { defer, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { EnergyPredictionEditDialogComponent } from '../dialog/energy-prediction-edit-dialog.component';
import { ExportValueModel } from '../../../modules/exports/shared/export.model';

@Injectable({
    providedIn: 'root',
})
export class EnergyPredictionRequirementsService {
    constructor(private exportService: ExportService) {}

    static requirement = 'Needs an estimation export';
    public static exportHasRequiredValues(values: ExportValueModel[]): boolean {
        return (
            values !== undefined &&
            values.filter((val) => val.Name === 'DayPrediction').length === 1 &&
            values.filter((val) => val.Name === 'MonthPrediction').length === 1 &&
            values.filter((val) => val.Name === 'YearPrediction').length === 1 &&
            values.filter((val) => val.Name === 'DayTimestamp').length === 1 &&
            values.filter((val) => val.Name === 'MonthTimestamp').length === 1 &&
            values.filter((val) => val.Name === 'YearTimestamp').length === 1 &&
            values.filter((val) => val.Name === 'DayPrediction').length === 1 &&
            values.filter((val) => val.Name === 'MonthPrediction').length === 1 &&
            values.filter((val) => val.Name === 'YearPrediction').length === 1
        );
    }

    requirementsFulfilled(): Observable<boolean> {
        return defer(async () => {
            let page = 0;
            let res = { hasMore: true, found: false };
            while (!res.found && res.hasMore) {
                await this.search(100, page++).then((r) => {
                    if (r !== undefined) {
                        res = r;
                    }
                });
            }
            return res.found;
        });
    }

    private search(pageSize: number, pageNo: number): Promise<{ found: boolean; hasMore: boolean } | undefined >  {
        return this.exportService
            .getExports(true, '', pageSize, pageNo * pageSize, 'created_at', 'desc')
            .pipe(
                map((r) => {
                    if (r === null) {
                        return { found: false, hasMore: false };
                    }
                    const filter = r.instances?.filter((ex) => EnergyPredictionRequirementsService.exportHasRequiredValues(ex.Values));
                    return {
                        found: filter !== undefined && filter.length !== 0,
                        hasMore: r.instances !== undefined && r.instances.length === pageSize,
                    };
                }),
            )
            .toPromise();
    }
}
