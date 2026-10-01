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

import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';

/**
 * Pins mat-icon to the `material-icons` class that assets/fonts/google-icons.css styles.
 * Since Material 22 the registry infers `material-symbols-outlined` from the loaded fonts instead.
 */
export function provideIconFontSet(): EnvironmentProviders {
    return provideAppInitializer(() => {
        inject(MatIconRegistry).setDefaultFontSetClass('material-icons', 'mat-ligature-font');
    });
}
