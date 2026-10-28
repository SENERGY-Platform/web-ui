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

// Flow and pipeline images are SVG markup stored by users and shown to everyone the flow
// is shared with, so they never reach the DOM without passing through this file.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';

// What the flow designer's JointJS paper produces, plus plain shapes. Everything that can
// run script, load a resource or embed HTML (script, style, foreignObject, image, a,
// animate*, set, filter primitives) is missing on purpose.
const ALLOWED_ELEMENTS = new Set([
    'svg', 'g', 'defs', 'title', 'symbol', 'use', 'marker', 'clipPath',
    'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
    'text', 'tspan', 'linearGradient', 'radialGradient', 'stop',
]);

// Functions in transforms and colours. Anything else (expression, image-set, src, ...) may
// load a resource or run script; url() passes only with a reference into the image.
const SAFE_FUNCTIONS = new Set([
    'matrix', 'translate', 'translatex', 'translatey', 'scale', 'scalex', 'scaley',
    'rotate', 'skewx', 'skewy', 'rgb', 'rgba', 'hsl', 'hsla', 'calc',
]);

const ROOT_ATTRIBUTES = new Set(['viewBox', 'width', 'height', 'preserveAspectRatio']);

// Names the page font, which an <img> cannot inherit; the image cannot load the web font either, so Roboto
// renders only where it is installed locally and sans-serif elsewhere.
const IMAGE_FONT_STYLE = 'font-family: Roboto, sans-serif; letter-spacing: 0.0178571429em';

/** Parses stored image markup as XML; null unless it is well-formed with an svg root. */
export function parseSvgImage(markup: unknown): Element | null {
    if (typeof markup !== 'string' || markup === '') {
        return null;
    }
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const root = doc.documentElement;
    if (root.namespaceURI !== SVG_NS || root.localName !== 'svg' || doc.getElementsByTagNameNS('*', 'parsererror').length > 0) {
        return null;
    }
    return root;
}

/** Sets the height to the viewBox height, so the image is not stretched to its container; without a viewBox the height stays. */
export function fitSvgImageHeight(svg: Element): void {
    // the designer writes a lowercase viewbox, other tools viewBox
    const height = (svg.getAttribute('viewbox') ?? svg.getAttribute('viewBox'))?.trim().split(/[\s,]+/)[3];
    if (height !== undefined) {
        svg.setAttribute('height', height);
    }
}

/** Markup for [innerHtml], for sites that need the image as live DOM (clicks on operators). */
export function svgImageMarkup(svg: Element): string {
    return new XMLSerializer().serializeToString(sanitize(svg));
}

/** A data URL for <img src>; an image document runs no script and loads nothing. */
export function svgImageDataUrl(svg: Element): string {
    const clean = sanitize(svg);
    clean.setAttribute('style', IMAGE_FONT_STYLE);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clean));
}

function sanitize(svg: Element): Element {
    const doc = document.implementation.createDocument(SVG_NS, 'svg', null);
    const root = doc.documentElement;
    copyRootAttributes(svg, root);
    const referenced = referencedIds(svg);
    for (const child of Array.from(svg.childNodes)) {
        copyNode(child, root, referenced);
    }
    return root;
}

function copyRootAttributes(from: Element, to: Element) {
    for (const attribute of Array.from(from.attributes)) {
        if (attribute.namespaceURI !== null) {
            continue;
        }
        // The designer writes a lowercase viewbox, which only an HTML parser corrects.
        const name = attribute.name === 'viewbox' ? 'viewBox' : attribute.name;
        if (ROOT_ATTRIBUTES.has(name) && isSafeValue(attribute.value) && !to.hasAttribute(name)) {
            to.setAttribute(name, attribute.value);
        }
    }
}

function copyNode(node: Node, parent: Element, referenced: Set<string>) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
        parent.appendChild(parent.ownerDocument.createTextNode(node.nodeValue ?? ''));
        return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    const element = node as Element;
    if (element.namespaceURI !== SVG_NS || !ALLOWED_ELEMENTS.has(element.localName)) {
        return;
    }
    const copy = parent.ownerDocument.createElementNS(SVG_NS, element.localName);
    copyAttributes(element, copy, referenced);
    parent.appendChild(copy);
    if (element.localName === 'title') {
        // title is an HTML integration point, so it keeps text only
        copy.textContent = element.textContent;
        return;
    }
    for (const child of Array.from(element.childNodes)) {
        copyNode(child, copy, referenced);
    }
}

function copyAttributes(from: Element, to: Element, referenced: Set<string>) {
    for (const attribute of Array.from(from.attributes)) {
        const value = attribute.value;
        if (attribute.namespaceURI === XLINK_NS && attribute.localName === 'href') {
            if (isLocalReference(value)) {
                to.setAttributeNS(XLINK_NS, 'xlink:href', value);
            }
            continue;
        }
        if (attribute.namespaceURI === XML_NS && attribute.localName === 'space') {
            to.setAttributeNS(XML_NS, 'xml:space', value);
            continue;
        }
        if (attribute.namespaceURI !== null) {
            continue;
        }
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || !isSafeValue(value)) {
            continue;
        }
        if (name === 'href' && !isLocalReference(value)) {
            continue;
        }
        // An id that nothing in the image points to could only collide with the page's ids.
        if (name === 'id' && !referenced.has(value)) {
            continue;
        }
        to.setAttribute(attribute.name, value);
    }
}

function isLocalReference(value: string): boolean {
    return value.trim().startsWith('#');
}

// CSS escapes could spell a function name past the check, so they are rejected outright.
function isSafeValue(value: string): boolean {
    if (value.includes('\\')) {
        return false;
    }
    const calls = /([a-z-]+)\s*\(\s*['"]?\s*(.?)/gi;
    for (let call = calls.exec(value); call !== null; call = calls.exec(value)) {
        const name = call[1].toLowerCase();
        if (name === 'url' ? call[2] !== '#' : !SAFE_FUNCTIONS.has(name)) {
            return false;
        }
    }
    return true;
}

function referencedIds(svg: Element): Set<string> {
    const ids = new Set<string>();
    for (const element of [svg, ...Array.from(svg.getElementsByTagName('*'))]) {
        for (const attribute of Array.from(element.attributes)) {
            const value = attribute.value.trim();
            if (value.startsWith('#')) {
                ids.add(value.substring(1));
            }
            const refs = /url\s*\(\s*['"]?\s*#([^'")\s]+)/gi;
            for (let ref = refs.exec(value); ref !== null; ref = refs.exec(value)) {
                ids.add(ref[1]);
            }
        }
    }
    return ids;
}
