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

/* Preview harness - local only. Backend answers for the process and smart-service designers. */
import { HttpRequest } from '@angular/common/http';
import { environment } from '../environments/environment';
import processXml from '../testing/bpmn-fixtures/process/senergy_all_attributes.bpmn';
import smartServiceXml from '../testing/bpmn-fixtures/smart-service/json_location_input.bpmn';

/** Open /processes/designer/<previewProcessId> and /smart-services/designer/<previewDesignId>. */
export const previewProcessId = 'senergy_all_attributes';
export const previewDesignId = 'json_location_input';

export interface DesignerAnswer {
    body: unknown;
    headers?: Record<string, string>;
}

/** Every model the designers saved, newest last, for the preview checks to read. */
const saved: { url: string; method: string; body: unknown }[] = [];
(window as any).senergyPreviewSaved = saved;

const temperature = {
    id: 'urn:infai:ses:measuring-function:temperature',
    name: 'Get Temperature',
    concept_id: 'urn:infai:ses:concept:temperature',
    rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
};
const setOn = {
    id: 'urn:infai:ses:controlling-function:on',
    name: 'Set On',
    concept_id: '',
    rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction',
};
const lamp = { id: 'urn:infai:ses:device-class:lamp', name: 'Lamp', image: '' };
const aspectNode = (id: string, name: string) => ({
    id, name, root_id: id, parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [],
});
const air = aspectNode('urn:infai:ses:aspect:air', 'Air');
const water = aspectNode('urn:infai:ses:aspect:water', 'Water');
const characteristics = [
    { id: 'urn:infai:ses:characteristic:celsius', name: 'Celsius', type: 'https://schema.org/Float', sub_characteristics: null },
    { id: 'urn:infai:ses:characteristic:0b041ea3-8efd-4ce4-8130-d8af320326a4', name: 'Location', type: 'https://schema.org/Text', sub_characteristics: null },
];

const list = (items: unknown[]): DesignerAnswer => ({ body: items, headers: { 'X-Total-Count': '' + items.length } });

const record = (request: HttpRequest<unknown>): DesignerAnswer => {
    saved.push({ url: request.url, method: request.method, body: request.body });
    return { body: request.body };
};

/** The answer for a designer request, or undefined for any other request. */
export function designerAnswer(request: HttpRequest<unknown>): DesignerAnswer | undefined {
    const url = request.url;
    const processRepo = environment.processRepoUrl;
    const designs = environment.smartServiceRepoUrl + '/designs';
    const deviceRepo = environment.deviceRepoUrl;

    if (url === processRepo + '/' + previewProcessId && request.method === 'GET') {
        return { body: { _id: previewProcessId, owner: '', date: 0, svgXML: '', bpmn_xml: processXml } };
    }
    if (url.startsWith(processRepo + '/') && request.method === 'PUT') {
        return record(request);
    }
    if (url === designs + '/' + previewDesignId && request.method === 'GET') {
        return { body: { id: previewDesignId, name: 'JSON location input', description: 'location of a PV', bpmn_xml: smartServiceXml, svg_xml: '' } };
    }
    if ((url === designs && request.method === 'POST') || (url.startsWith(designs + '/') && request.method === 'PUT')) {
        const answer = record(request);
        return { body: { id: previewDesignId, ...(answer.body as object) } };
    }

    // catalogs the missing-metadata check compares the model's ids against
    if (url === deviceRepo + '/query/functions') {
        return list([setOn, temperature]);
    }
    if (url.startsWith(deviceRepo + '/v2/device-classes?')) {
        return list([lamp]);
    }
    if (url.startsWith(deviceRepo + '/v2/characteristics?')) {
        return list(characteristics);
    }
    if (url === deviceRepo + '/aspects') {
        return { body: [{ ...air, sub_aspects: [] }, { ...water, sub_aspects: [] }] };
    }

    // what the task config dialog offers
    if (url === deviceRepo + '/concepts/' + temperature.concept_id + '?sub-class=true') {
        return { body: { id: temperature.concept_id, name: 'Temperature', base_characteristic_id: characteristics[0].id, characteristics: [characteristics[0]] } };
    }
    if (url === deviceRepo + '/device-classes?function=controlling-function') {
        return { body: [lamp] };
    }
    if (url === deviceRepo + '/device-classes/' + lamp.id + '/controlling-functions') {
        return { body: [setOn] };
    }
    if (url === deviceRepo + '/aspect-nodes?function=measuring-function') {
        return { body: [air, water] };
    }
    if (url.startsWith(deviceRepo + '/aspects/') && url.endsWith('/measuring-functions')) {
        return { body: [temperature] };
    }
    return undefined;
}
