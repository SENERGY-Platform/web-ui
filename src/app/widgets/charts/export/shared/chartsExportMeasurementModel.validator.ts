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

import { AbstractControl, ValidatorFn } from '@angular/forms';

export function chartsExportMeasurementModelValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
        isChartsExportMeasurementModel(control.value) ? null : { isExport: { value: control.value } };
}

export function isChartsExportMeasurementModel(test: any): boolean {
    let isExport =
        test !== undefined &&
        test !== null &&
        typeof test.id === 'string' &&
        'name' in test &&
        typeof test.name === 'string' &&
        'values' in test &&
        Array.isArray(test.values);

    if (isExport) {
        test.values.forEach((val: any) => {
            if (isExport) {
                isExport =
                    'Name' in val &&
                    typeof val.Name === 'string' &&
                    'Path' in val &&
                    typeof val.Path === 'string' &&
                    'Type' in val &&
                    typeof val.Type === 'string' &&
                    'InstanceID' in val &&
                    typeof val.InstanceID === 'string';
            }
        });
    }

    return isExport;
}
