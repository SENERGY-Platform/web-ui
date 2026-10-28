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

import { fitSvgImageHeight, parseSvgImage, svgImageDataUrl, svgImageMarkup } from './svg-image';
import { decodeSvgDataUrl, FLOW_IMAGE, HOSTILE_IMAGE, liveMarkup } from './svg-image.mock';

const SVG_NS = 'http://www.w3.org/2000/svg';

const parsed = (markup: string): Element => {
    const svg = parseSvgImage(markup);
    expect(svg).withContext('parsed').not.toBeNull();
    return svg as Element;
};

// What [innerHtml] does with the markup: the HTML parser, inside the page.
const insertAsHtml = (markup: string): HTMLElement => {
    const host = document.createElement('div');
    host.innerHTML = markup;
    document.body.appendChild(host);
    return host;
};

const wrap = (content: string) => '<svg xmlns="' + SVG_NS + '" xmlns:xlink="http://www.w3.org/1999/xlink" viewbox="0 0 10 10">' + content + '</svg>';

describe('svg-image', () => {
    let hosts: HTMLElement[];

    beforeEach(() => {
        hosts = [];
        delete (window as any).svgImageXss;
    });

    afterEach(() => hosts.forEach((host) => host.remove()));

    const rendered = (markup: string) => {
        const host = insertAsHtml(markup);
        hosts.push(host);
        return host;
    };

    describe('parseSvgImage', () => {
        it('reads an image behind the XML prolog the flow designer writes', () => {
            const svg = parseSvgImage(FLOW_IMAGE);
            expect(svg?.localName).toBe('svg');
            expect(svg?.getElementsByClassName('joint-cell').length).toBe(3);
        });

        it('refuses anything that is no well-formed svg image', () => {
            const malformed = ['<svg xmlns="' + SVG_NS + '"><g></svg>', '<svg xmlns="' + SVG_NS + '"><g/></svg><svg/>', '<svg xmlns="' + SVG_NS + '">&nbsp;</svg>'];
            for (const markup of [undefined, null, '', {}, '<html/>', '<svg/>', 'plain text', ...malformed]) {
                expect(parseSvgImage(markup)).withContext(String(markup)).toBeNull();
            }
        });
    });

    describe('fitSvgImageHeight', () => {
        const svg = (attributes: string) => parseSvgImage('<svg xmlns="http://www.w3.org/2000/svg" ' + attributes + '/>')!;

        it('takes the height from a lowercase viewbox, a camel-case viewBox and comma separators', () => {
            for (const attributes of ['viewbox="0 0 200 40" height="100%"', 'viewBox="0 0 200 40" height="100%"', 'viewBox=" 0,0,200,40 " height="100%"']) {
                const image = svg(attributes);
                fitSvgImageHeight(image);
                expect(image.getAttribute('height')).withContext(attributes).toBe('40');
            }
        });

        it('leaves the height of an image without a viewBox', () => {
            const image = svg('width="200" height="100%"');
            fitSvgImageHeight(image);
            expect(image.getAttribute('height')).toBe('100%');
        });
    });

    describe('svgImageMarkup', () => {
        it('keeps the flow designer markup as it is, except for ids nothing refers to', () => {
            const original = parsed(FLOW_IMAGE);
            const expected = original.cloneNode(true) as Element;
            expected.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
            const serializer = new XMLSerializer();

            const clean = parsed(svgImageMarkup(original));

            expect(Array.from(clean.children).map((child) => serializer.serializeToString(child)))
                .toEqual(Array.from(expected.children).map((child) => serializer.serializeToString(child)));
            // style, class and id of the root would be matched by the page's own CSS and scripts
            expect(Array.from(clean.attributes).map((attribute) => attribute.name).filter((name) => !name.startsWith('xmlns')))
                .toEqual(['viewBox', 'width', 'height']);
            expect(clean.getAttribute('width')).toBe('100%');
            expect(clean.getAttribute('height')).toBe('100%');
        });

        it('writes viewBox for the lowercase viewbox behind an XML prolog', () => {
            const markup = svgImageMarkup(parsed(FLOW_IMAGE));

            expect(markup.startsWith('<svg')).toBeTrue();
            const clean = parsed(markup);
            expect(clean.getAttribute('viewBox')).toBe('4.546875 37.20000076293945 648.90625 142.8000030517578');
            expect(clean.hasAttribute('viewbox')).toBeFalse();
            expect((rendered(markup).querySelector('svg') as SVGSVGElement).viewBox.baseVal.width).toBe(648.90625);
        });

        it('leaves no handler, script, foreign content or javascript: link in the page', async () => {
            const host = rendered(svgImageMarkup(parsed(HOSTILE_IMAGE)));
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(liveMarkup(host)).toEqual([]);
            expect(host.querySelectorAll('svg').length).toBe(1);
            expect(host.querySelector('[model-id="op-1"] > rect')).withContext('the operator itself is kept').not.toBeNull();
            expect((window as any).svgImageXss).toBeUndefined();
        });

        it('keeps markup written as text or CDATA as text', () => {
            const host = rendered(svgImageMarkup(parsed(HOSTILE_IMAGE)));

            const texts = Array.from(host.querySelectorAll('svg > text')).map((text) => text.textContent);
            expect(texts).toContain('</svg><img src="x" onerror="window.svgImageXss = \'text\'">');
            expect(texts).toContain('</text></svg><img src="x" onerror="window.svgImageXss = \'cdata\'">');
            expect(host.querySelectorAll('img').length).toBe(0);
        });

        it('keeps references into the image and drops those that leave it', () => {
            const clean = parsed(svgImageMarkup(parsed(wrap(
                '<defs><marker id="arrow"/><path id="shape" d="M 0 0 L 1 1"/></defs>' +
                '<path id="kept-by-url" d="M 0 0" marker-end="url(#arrow)" fill="url(\'https://example.invalid/a\')"/>' +
                '<use id="plain" href="#shape"/><use xlink:href="#shape"/><use href="https://example.invalid/b#shape"/>' +
                '<rect style="fill: url( #arrow ); stroke: red"/><rect style="fill: u\\72l(https://example.invalid/c)"/>' +
                '<rect style="width: expression(alert(1))"/><rect style="mask-image: image-set(\'https://example.invalid/d\' 1x)"/>',
            ))));

            const attributesOf = (selector: string) => Array.from(clean.querySelectorAll(selector)).map(
                (element) => Array.from(element.attributes).filter((attribute) => !attribute.name.startsWith('xmlns'))
                    .map((attribute) => attribute.name + '=' + attribute.value).join(' '));
            expect(attributesOf('marker, defs > path')).toEqual(['id=arrow', 'id=shape d=M 0 0 L 1 1']);
            expect(attributesOf('defs ~ path')).toEqual(['d=M 0 0 marker-end=url(#arrow)']);
            expect(attributesOf('use')).toEqual(['href=#shape', 'xlink:href=#shape', '']);
            expect(attributesOf('rect')).toEqual(['style=fill: url( #arrow ); stroke: red', '', '', '']);
        });

        it('keeps only the text of a title', () => {
            const host = rendered(svgImageMarkup(parsed(wrap('<title>a <tspan>b</tspan><g onclick="x()"/>c</title>'))));

            const title = host.querySelector('title') as Element;
            expect(title.textContent).toBe('a bc');
            expect(title.children.length).toBe(0);
        });
    });

    describe('svgImageDataUrl', () => {
        it('is a data URL of an inert image with a viewBox', () => {
            const image = decodeSvgDataUrl(svgImageDataUrl(parsed(HOSTILE_IMAGE)));

            expect(image.getElementsByTagName('parsererror').length).toBe(0);
            expect(image.documentElement.getAttribute('viewBox')).toBe('0 0 200 100');
            expect(liveMarkup(image)).toEqual([]);
            expect(image.querySelector('[model-id="op-1"] > rect')).not.toBeNull();
        });

        it('sets the page font, which an image cannot inherit', () => {
            const image = decodeSvgDataUrl(svgImageDataUrl(parsed(FLOW_IMAGE)));

            expect(image.documentElement.getAttribute('style')).toContain('font-family: Roboto, sans-serif');
        });

        it('is shown by an img at the size of its viewBox', async () => {
            const svg = parsed(FLOW_IMAGE);
            svg.setAttribute('height', '142.8000030517578');
            const img = document.createElement('img');
            img.src = svgImageDataUrl(svg);

            await img.decode();

            expect(img.naturalHeight).toBe(143);
            expect(img.naturalWidth).toBe(649);
        });
    });
});
