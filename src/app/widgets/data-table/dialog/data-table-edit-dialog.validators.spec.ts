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

import { FormBuilder, FormGroup } from '@angular/forms';
import { exportValidator } from './data-table-edit-dialog.validators';

describe('exportValidator', () => {
    const fb = new FormBuilder();

    const element = (overrides: {
        createdByWidget?: boolean;
        exportId?: string;
        valueName?: string;
        valuePath?: string;
        deviceId?: string;
    }): FormGroup =>
        fb.group({
            exportCreatedByWidget: [overrides.createdByWidget ?? null],
            exportId: [overrides.exportId ?? null],
            exportValueName: [overrides.valueName ?? null],
            exportValuePath: [overrides.valuePath ?? null],
            elementDetails: fb.group({
                device: fb.group({ deviceId: [overrides.deviceId ?? null] }),
            }),
        });

    it('rejects an element without a chosen value while the widget creates the export', () => {
        const group = element({ createdByWidget: true });

        expect(exportValidator()(group)).toEqual({ 'missing value': 'exportValuePath' });
        expect(group.get('exportValuePath')?.errors).toEqual({ 'missing value': true });
    });

    it('accepts the element once a value is chosen', () => {
        const group = element({ createdByWidget: true, valuePath: 'value.HourPrediction' });

        expect(exportValidator()(group)).toBeNull();
        expect(group.get('exportValuePath')?.errors).toBeNull();
    });

    it('accepts an element that reads an export of the user', () => {
        const group = element({
            createdByWidget: false,
            exportId: 'export-1',
            valueName: 'HourPrediction',
            valuePath: 'value.HourPrediction',
        });

        expect(exportValidator()(group)).toBeNull();
    });
});
