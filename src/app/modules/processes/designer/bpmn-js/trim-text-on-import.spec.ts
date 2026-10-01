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

import { createProcessModeler } from './bpmn-js';
import { createSmartServiceModeler } from '../../../smart-services/designer/smart-service-modeler';
import { trimTextRuns } from './trim-text-on-import';
import { fetchText, importXml, mountModeler, MountedModeler, saveXml } from '../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../testing/bpmn-xml-compare';

describe('trimTextRuns', () => {
    it('trims every text run and keeps the whitespace inside it', () => {
        expect(trimTextRuns('<a>  x  y  </a>\n  <b>\n z\n</b>')).toBe('<a>x  y</a><b>z</b>');
    });

    it('drops whitespace before the XML declaration', () => {
        expect(trimTextRuns('\n<?xml version="1.0"?>\n<a/>')).toBe('<?xml version="1.0"?><a/>');
    });

    it('leaves CDATA content untouched, as bpmn-js 4 did', () => {
        expect(trimTextRuns('<a> <![CDATA[ x > 1 ]]> </a>')).toBe('<a><![CDATA[ x > 1 ]]></a>');
    });

    it('leaves attributes untouched, including > and whitespace in quoted values', () => {
        expect(trimTextRuns('<a b=" > c " d=\'<\'>  t  </a>')).toBe('<a b=" > c " d=\'<\'>t</a>');
    });

    it('trims each run around a comment separately and keeps the comment', () => {
        expect(trimTextRuns('<a> x <!-- > y --> z </a>')).toBe('<a>x<!-- > y -->z</a>');
    });

    it('counts whitespace character references at the ends of a run as whitespace', () => {
        expect(trimTextRuns('<a>&#10;&#x9; x &#32;&#xA0;</a>')).toBe('<a>x</a>');
        expect(trimTextRuns('<a>&#65; x &#x42;</a>')).toBe('<a>&#65; x &#x42;</a>');
        expect(trimTextRuns('<a>&amp; x &lt;</a>')).toBe('<a>&amp; x &lt;</a>');
    });

    // saxen decoded with String.fromCharCode, so &#x10020; became a space and was trimmed
    it('decodes character references the way bpmn-js 4 did, wrapping code points to 16 bits', () => {
        expect(trimTextRuns('<a>&#x10020;x&#65568;</a>')).toBe('<a>x</a>');
        expect(trimTextRuns('<a>&#X20;x&#X9;</a>')).toBe('<a>x</a>');
    });

    it('trims long runs of trailing references in linear time', () => {
        const references = '&#32;'.repeat(200000);
        const started = Date.now();
        expect(trimTextRuns('<a>x' + references + '</a>')).toBe('<a>x</a>');
        expect(Date.now() - started).toBeLessThan(1000);
    });

    it('leaves markup that is not closed for the parser to report', () => {
        expect(trimTextRuns('<a> x <b c="1')).toBe('<a>x<b c="1');
    });
});

[
    { name: 'process designer', create: createProcessModeler },
    { name: 'smart-service designer', create: createSmartServiceModeler },
].forEach(({ name, create }) => {
    describe(`${name} import of a hand-formatted model`, () => {
        let mounted: MountedModeler;
        let modeler: any;
        let warnings: string[];

        beforeEach(async () => {
            mounted = mountModeler(create);
            modeler = mounted.modeler;
            warnings = await importXml(modeler, await fetchText('/bpmn-fixtures/process/hand_formatted.bpmn'));
        });

        afterEach(() => mounted.destroy());

        const bo = (id: string) => modeler.get('elementRegistry').get(id).businessObject;

        it('resolves references written with surrounding whitespace', () => {
            expect(warnings.filter((warning) => warning.startsWith('unresolved reference'))).toEqual([]);
            expect(bo('Lane_1').flowNodeRef.map((node: any) => node.id)).toEqual(['StartEvent_1', 'Task_notify']);
            expect(bo('StartEvent_1').outgoing.map((flow: any) => flow.id)).toEqual(['Flow_1']);
            expect(bo('Task_notify').incoming.map((flow: any) => flow.id)).toEqual(['Flow_1']);
        });

        it('saves trimmed text, untouched CDATA and untouched attributes', async () => {
            const doc = parseXml(await saveXml(modeler));
            const texts = (tag: string) => Array.from(doc.getElementsByTagName(tag)).map((el) => el.textContent);
            expect(texts('bpmn:flowNodeRef')).toEqual(['StartEvent_1', 'Task_notify']);
            expect(texts('bpmn:outgoing')).toEqual(['Flow_1']);
            expect(texts('camunda:connectorId')).toEqual(['http-connector']);
            const parameters = Array.from(doc.getElementsByTagName('camunda:inputParameter'));
            expect(parameters[0].textContent).toBe('{"message": "hot", "title": "alarm"}');
            expect(parameters[1].textContent).toBe('notification');
            expect(texts('camunda:script')).toEqual(['\n  var a = 1 > 0;\n']);
            expect(doc.getElementsByTagName('bpmn:startEvent')[0].getAttribute('senergy:script')).toBe('  value > 1  ');
        });
    });
});
