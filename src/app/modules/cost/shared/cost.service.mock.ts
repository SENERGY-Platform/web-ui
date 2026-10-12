/*
 * Copyright 2025 InfAI (CC SES)
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
import {Observable, of} from 'rxjs';
import { CostEstimationModel } from './cost.model';


@Injectable({
    providedIn: 'root',
})
export class CostMockService {

    userMayGetFlowCostEstimations(): boolean {
        console.log('Using mock cost class');
        return true;
    }
    getFlowCostEstimations(_: string[]): Observable<CostEstimationModel[]> {
        console.log('Using mock cost class');
        return of([] as CostEstimationModel[]);
    }

}
