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

import _Modeler from 'bpmn-js/dist/bpmn-modeler.production.min.js';
import * as _PropertiesPanelModule from 'bpmn-js-properties-panel';
import * as _CamundaPropertiesProvider from 'bpmn-js-properties-panel/lib/provider/camunda';
import * as _ElementTemplates from 'bpmn-js-properties-panel/lib/provider/camunda/element-templates';
import _PaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';
import * as _CamundaBpmnModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import * as _SenergyPropertiesProvider from './properties-provider';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InjectionNames = {
    eventBus: 'eventBus',
    bpmnFactory: 'bpmnFactory',
    elementRegistry: 'elementRegistry',
    translate: 'translate',
    propertiesProvider: 'propertiesProvider',
    camundaPropertiesProvider: 'camundaPropertiesProvider',
    paletteProvider: 'paletteProvider',
    elementTemplates: 'elementTemplates',
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Modeler = _Modeler;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PropertiesPanelModule = _PropertiesPanelModule;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PaletteProvider = _PaletteProvider;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CamundaPropertiesProvider = _CamundaPropertiesProvider;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ElementTemplates = _ElementTemplates;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SenergyPropertiesProvider = _SenergyPropertiesProvider;
export const camundaBpmnModdle = _CamundaBpmnModdle.default;

export interface IPaletteProvider {
    getPaletteEntries(): any;
}

export interface IPalette {
    registerProvider(provider: IPaletteProvider): any;
}

export interface IPropertiesProvider {
    getTabs(element: any): any;
}
