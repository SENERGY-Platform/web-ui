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

import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, CamundaPlatformPropertiesProviderModule } from 'bpmn-js-properties-panel';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import SenergyPropertiesProviderModule from './properties-provider';
import { trimTextOnImportModule } from './trim-text-on-import';
import { extensionCopyRulesModule } from './extension-copy-rules';

// senergy:* attributes are untyped, so moddle keeps them in $attrs under their prefixed names.
export const senergyModdleExtensions = {
    camunda: camundaModdle,
    senergy: {
        name: 'senergy',
        uri: 'https://senergy.infai.org',
        prefix: 'senergy',
    },
};

/*
 * The modules both designers share. camunda-bpmn-js-behaviors is deliberately not loaded: the
 * designers ran without such behaviours, and some of them rewrite the model on ordinary edits.
 */
export const designerModules = [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    trimTextOnImportModule,
    extensionCopyRulesModule,
];

export function createModeler(container: string | HTMLElement, propertiesParent: string | HTMLElement, providerModule: any): any {
    return new Modeler({
        container,
        width: '100%',
        height: '100%',
        additionalModules: [...designerModules, providerModule],
        propertiesPanel: {
            parent: propertiesParent,
        },
        // the designers never had keyboard shortcuts; diagram-js 15 would bind them to the canvas
        keyboard: { bind: false },
        moddleExtensions: senergyModdleExtensions,
    });
}

/** The modeler of the process designer; the round-trip spec boots the same one. */
export function createProcessModeler(container: string | HTMLElement, propertiesParent: string | HTMLElement): any {
    return createModeler(container, propertiesParent, SenergyPropertiesProviderModule);
}

/** The model as the repositories store it: unformatted XML and the SVG preview; rejects with the message to show. */
export async function exportDiagram(modeler: any): Promise<{ xml: string; svg: string }> {
    let xml: string;
    let svg: string;
    try {
        xml = (await modeler.saveXML()).xml;
    } catch (err) {
        throw new Error('Error XML! ' + err);
    }
    try {
        svg = (await modeler.saveSVG()).svg;
    } catch (err) {
        throw new Error('Error SVG! ' + err);
    }
    return { xml, svg };
}
