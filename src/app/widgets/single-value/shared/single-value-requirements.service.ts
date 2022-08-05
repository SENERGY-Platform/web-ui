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

import { Injectable } from '@angular/core';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExportResponseModel } from '../../../modules/exports/shared/export.model';

@Injectable({
    providedIn: 'root',
})
export class SingleValueRequirementsService {
    constructor(private exportService: ExportService) {}

    static requirement = 'Needs an export';

    requirementsFulfilled(): Observable<boolean> {
        return this.exportService.getExports(true, '', 1, 0, 'name', 'asc').pipe(map((r) => r !== null && r.total !== undefined && r.total > 0));
    }
}
