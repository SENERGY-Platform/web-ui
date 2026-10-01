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
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';

/**
 * Keeps CDK overlays (dialogs, menus) out of the browser's top layer. The mtx-select panels are
 * appended to .ng-select-anchor in the body, and nothing outside the top layer can stack above a popover.
 */
export function provideOverlayDefaults(): Provider {
    return { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } };
}
