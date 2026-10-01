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

import { createModeler } from '../../processes/designer/bpmn-js/bpmn-js';
import SmartServicePropertiesProviderModule from './smart-service-properties-provider';

/** The modeler of the smart-service designer; the round-trip spec boots the same one. */
export function createSmartServiceModeler(container: string | HTMLElement, propertiesParent: string | HTMLElement): any {
    return createModeler(container, propertiesParent, SmartServicePropertiesProviderModule);
}
