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

import {defer, Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {EnergyPredictionEditDialogComponent} from '../dialog/energy-prediction-edit-dialog.component';


@Injectable({
    providedIn: 'root'
})
export class EnergyPredictionRequirementsService {

    constructor(
        private exportService: ExportService,
    ) {
    }

    static requirement = 'Needs an estimation export';

    requirementsFulfilled(): Observable<boolean> {
        return defer(async () => {
            let page = 0;
            let res = {hasMore: true, found: false};
            while (!res.found && res.hasMore) {
                await this.search(100, page++).then(r => res = r);
            }
            return res.found;
        });
    }

    private search(pageSize: number, pageNo: number): Promise<{ found: boolean, hasMore: boolean }> {
        return this.exportService.getExports('', pageSize, pageNo * pageSize, 'created_at', 'desc')
            .pipe(map(r => {
                if (r === null) {
                    return {found: false, hasMore: false};
                }

                return {
                    found: r.filter(ex => EnergyPredictionEditDialogComponent.exportHasRequiredValues(ex.Values)).length !== 0,
                    hasMore: r.length === pageSize,
                };
            })).toPromise();
    }
}
