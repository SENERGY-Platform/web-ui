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

import { Provider } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { MAT_SLIDE_TOGGLE_DEFAULT_OPTIONS } from '@angular/material/slide-toggle';
import { MAT_TABS_CONFIG } from '@angular/material/tabs';

/**
 * Every form field is outlined with a floating label. The subscript keeps its fixed line, so a validation
 * message appears without pushing the fields below it down, and rows of fields stay aligned.
 */
export const FORM_FIELD_DEFAULTS: MatFormFieldDefaultOptions = { appearance: 'outline', subscriptSizing: 'fixed' };

export function provideFormFieldDefaults(): Provider[] {
    return [
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: FORM_FIELD_DEFAULTS },
        // Toggles show no check or minus glyph in the handle; position and colour carry the state.
        { provide: MAT_SLIDE_TOGGLE_DEFAULT_OPTIONS, useValue: { hideIcon: true } },
        // Tab headers keep the width of their labels and sit on the left instead of filling the row.
        { provide: MAT_TABS_CONFIG, useValue: { stretchTabs: false } },
    ];
}
