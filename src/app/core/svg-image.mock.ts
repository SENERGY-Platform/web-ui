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

// Cut from what the flow designer stores (JointJS 3.7): XML prolog, lowercase viewbox,
// an operator with a version title and a port, an operator with an empty line, a link.
export const FLOW_IMAGE =
    '<?xml version="1.0" standalone="no"?>\r\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewbox="4.546875 37.20000076293945 648.90625 142.8000030517578" width="100%" height="100%" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink" joint-selector="svg" id="v-2" style="overflow: hidden;">' +
    '<defs joint-selector="defs"/><g class="joint-layers"><g class="joint-back-layer"/><g class="joint-cells-layer joint-viewport">' +
    '<g model-id="n1" data-type="senergy.NodeElement" id="j_1" class="joint-cell joint-type-senergy joint-type-senergy-nodeelement  joint-theme-default" transform="translate(50,50)">' +
    '<rect id="v-8" stroke-width="2" stroke="black" fill="white" width="250" height="20"/>' +
    '<rect id="v-9" stroke-width="2" stroke="black" fill="#4484ce" visibility="visible" width="250" height="80" transform="matrix(1,0,0,1,0,20)"/>' +
    '<text id="v-11" font-size="14" xml:space="preserve" text-anchor="middle" fill="black" visibility="visible" transform="matrix(1,0,0,1,125,50)">' +
    '<tspan dy="0.3em" class="v-line">op  one &lt;b&gt;&amp;amp;</tspan></text>' +
    '<text id="v-12" font-size="11" xml:space="preserve" text-anchor="middle" fill="black" font-weight="bold" transform="matrix(1,0,0,1,125,85)">' +
    '<title>Pinned to v1.0.0, newer version v1.2.0 available</title><tspan dy="0.3em" class="v-line">v1.0.0 - update available</tspan></text>' +
    '<g id="v-20" class="joint-port" transform="matrix(1,0,0,1,250,50)"><circle class="joint-port-body" id="v-24" fill="#fff" stroke="#000" r="10"/>' +
    '<text class="joint-port-label" id="v-23" y=".3em" text-anchor="start" transform="matrix(1,0,0,1,15,10)" xml:space="preserve" fill="#000">' +
    '<tspan dy="0" class="v-line">out1</tspan></text></g></g>' +
    '<g model-id="n2" data-type="senergy.NodeElement" id="j_2" class="joint-cell joint-type-senergy joint-type-senergy-nodeelement joint-element joint-theme-default" transform="translate(350,80)">' +
    '<rect id="v-25" stroke-width="2" stroke="black" fill="white" width="250" height="20"/>' +
    '<text id="v-29" font-size="11" xml:space="preserve" display="none" text-anchor="middle" fill="black" font-weight="normal" transform="matrix(1,0,0,1,125,85)">' +
    '<title/><tspan dy="0.3em" style="fill-opacity: 0; stroke-opacity: 0;" class="v-line v-empty-line">-</tspan></text></g>' +
    '<g model-id="97a0aa33-ba4d-4766-891e-533b99e8d962" data-type="link" id="j_3" class="joint-cell joint-type-link joint-link joint-theme-default">' +
    '<path class="connection" stroke="black" d="M 343 110 L 315 107"/>' +
    '<path class="marker-target" fill="black" stroke="black" d="M 10 0 L 0 5 L 10 10 z" id="v-45" ' +
    'transform="matrix(0.9950030434491937,0.09984459688356685,-0.09984459688356685,0.9950030434491937,315.04923218123434,102.17498512597291)"/>' +
    '<path class="connection-wrap" d="M 343 110 L 315 107"/></g></g>' +
    '<g class="joint-labels-layer joint-viewport"/><g class="joint-front-layer"/><g class="joint-tools-layer"/></g></svg>';

// Every way into script the sanitizer has to close. Each payload writes to window.svgImageXss,
// so a spec can also see whether anything ran.
const HOSTILE_MARKUP =
    '<script>window.svgImageXss = "script"</script>' +
    '<image href="x" onerror="window.svgImageXss = \'image onerror\'"/>' +
    '<a xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="javascript:window.svgImageXss = \'a\'"><text>a link</text></a>' +
    '<use href="javascript:window.svgImageXss = \'use\'"/>' +
    '<foreignObject width="10" height="10"><img xmlns="http://www.w3.org/1999/xhtml" src="x" onerror="window.svgImageXss = \'foreignObject\'"/></foreignObject>' +
    '<animate attributeName="href" to="javascript:window.svgImageXss = \'animate\'"/>' +
    '<set attributeName="onmouseover" to="window.svgImageXss = \'set\'"/>' +
    '<g onclick="window.svgImageXss = \'g onclick\'"><rect width="5" height="5" onmouseover="window.svgImageXss = \'rect onmouseover\'"/></g>' +
    '<text>&lt;/svg&gt;&lt;img src="x" onerror="window.svgImageXss = \'text\'"&gt;</text>' +
    '<text><![CDATA[</text></svg><img src="x" onerror="window.svgImageXss = \'cdata\'">]]></text>' +
    '<rect width="5" height="5" style="fill: url(https://example.invalid/tracker)"/>';

/** The image with an onload on its root and every payload in front of its content. */
export function withHostileMarkup(image: string): string {
    return image.replace(/<svg\b([^>]*[^/])>/, '<svg$1 onload="window.svgImageXss = \'svg onload\'">' + HOSTILE_MARKUP);
}

export const HOSTILE_OPERATOR_ID = 'op-1';

export const HOSTILE_IMAGE = withHostileMarkup(
    '<?xml version="1.0" standalone="no"?>\r\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 200 100" width="100%" height="100%">' +
    '<g class="joint-cells-layer"><g class="joint-cell" data-type="senergy.NodeElement" model-id="' + HOSTILE_OPERATOR_ID + '" ' +
    'transform="translate(10,10)"><rect width="50" height="30" stroke="black" fill="white"/></g></g></svg>',
);

const LIVE_ELEMENTS = ['script', 'foreignobject', 'image', 'a', 'iframe', 'object', 'embed', 'animate', 'set', 'style'];

/** Everything below root that could run script or load from elsewhere, empty when the image is inert. */
export function liveMarkup(root: ParentNode): string[] {
    const found: string[] = [];
    for (const element of Array.from(root.querySelectorAll('*'))) {
        const name = element.localName.toLowerCase();
        if (LIVE_ELEMENTS.includes(name)) {
            found.push(name);
        }
        if (name === 'img' && !(element.getAttribute('src') ?? '').startsWith('data:image/svg+xml')) {
            found.push('img');
        }
        for (const attribute of Array.from(element.attributes)) {
            if (attribute.name.toLowerCase().startsWith('on') || /javascript:|url\(\s*['"]?\s*[^#'"\s]/i.test(attribute.value)) {
                found.push(name + '[' + attribute.name + ']');
            }
        }
    }
    return found;
}

/** The image document behind a data URL from svgImageDataUrl(). */
export function decodeSvgDataUrl(url: string): Document {
    const prefix = 'data:image/svg+xml;charset=utf-8,';
    expect(url.startsWith(prefix)).withContext('a data URL of an SVG image').toBeTrue();
    return new DOMParser().parseFromString(decodeURIComponent(url.substring(prefix.length)), 'image/svg+xml');
}
