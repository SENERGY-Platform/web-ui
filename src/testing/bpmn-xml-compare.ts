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

/*
 * Compares BPMN documents the way the backends read them: by prefixed element and attribute
 * names (beevik/etree paths), ignoring formatting, comments and attribute order. Text that
 * parses as JSON is compared as data, all other text exactly.
 */

export interface CanonicalNode {
    name: string;
    attrs: [string, string][];
    text?: string;
    json?: unknown;
    children: CanonicalNode[];
}

const XMLNS = 'http://www.w3.org/2000/xmlns/';
const DC = 'http://www.omg.org/spec/DD/20100524/DC';
const DI = 'http://www.omg.org/spec/DD/20100524/DI';
const NUMERIC_DI_ATTRIBUTES = ['x', 'y', 'width', 'height'];

export function parseXml(xml: string): Document {
    // bpmn-js accepts whitespace before the XML declaration, DOMParser does not
    const doc = new DOMParser().parseFromString(xml.trimStart(), 'application/xml');
    const error = doc.getElementsByTagName('parsererror')[0];
    if (error) {
        throw new Error('not well-formed XML: ' + error.textContent);
    }
    return doc;
}

/** trimText trims element text the way bpmn-js 4 did on import; use it for the expected side only. */
export function canonicalBpmn(xml: string, options: { trimText?: boolean } = {}): CanonicalNode {
    return canonicalElement(parseXml(xml).documentElement, !!options.trimText);
}

function canonicalElement(element: Element, trimText: boolean): CanonicalNode {
    const numeric = element.namespaceURI === DC || element.namespaceURI === DI;
    const attrs: [string, string][] = [];
    for (const attr of Array.from(element.attributes)) {
        if (attr.namespaceURI === XMLNS) {
            continue;
        }
        const value = numeric && NUMERIC_DI_ATTRIBUTES.includes(attr.name) ? String(parseFloat(attr.value)) : attr.value;
        attrs.push([attr.name, value]);
    }
    attrs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const children: CanonicalNode[] = [];
    let text = '';
    for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            children.push(canonicalElement(child as Element, trimText));
        } else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
            text += child.nodeValue || '';
        }
    }

    if (trimText) {
        text = text.trim();
    }
    const node: CanonicalNode = { name: element.tagName, attrs, children };
    // whitespace between child elements is formatting, text without children is data
    if (children.length === 0 && text !== '') {
        const json = parseJson(text);
        if (json !== undefined) {
            node.json = json;
        } else {
            node.text = text;
        }
    } else if (text.trim() !== '') {
        node.text = text;
    }
    return node;
}

function parseJson(text: string): unknown {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return undefined;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return undefined;
    }
}

/** Key-order independent text of a JSON value. */
function stableJson(value: unknown): string {
    if (Array.isArray(value)) {
        return '[' + value.map(stableJson).join(',') + ']';
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return '{' + Object.keys(record).sort().map((key) => JSON.stringify(key) + ':' + stableJson(record[key])).join(',') + '}';
    }
    return JSON.stringify(value);
}

function label(node: CanonicalNode): string {
    const id = node.attrs.find((attr) => attr[0] === 'id' || attr[0] === 'name');
    return id ? `${node.name}[${id[0]}=${id[1]}]` : node.name;
}

/** Every difference between two canonical trees, one line each; empty when they match. */
export function diffCanonical(expected: CanonicalNode, actual: CanonicalNode, path = ''): string[] {
    const here = path + '/' + label(expected);
    if (expected.name !== actual.name) {
        return [`${here}: element ${actual.name} instead of ${expected.name}`];
    }
    const diffs: string[] = [];
    const expectedAttrs = new Map(expected.attrs);
    const actualAttrs = new Map(actual.attrs);
    expectedAttrs.forEach((value, name) => {
        if (!actualAttrs.has(name)) {
            diffs.push(`${here}: attribute ${name}="${value}" lost`);
        } else if (actualAttrs.get(name) !== value) {
            diffs.push(`${here}: attribute ${name}="${actualAttrs.get(name)}" instead of "${value}"`);
        }
    });
    actualAttrs.forEach((value, name) => {
        if (!expectedAttrs.has(name)) {
            diffs.push(`${here}: attribute ${name}="${value}" added`);
        }
    });
    if (expected.text !== actual.text) {
        diffs.push(`${here}: text ${JSON.stringify(actual.text)} instead of ${JSON.stringify(expected.text)}`);
    }
    if (stableJson(expected.json) !== stableJson(actual.json)) {
        diffs.push(`${here}: JSON ${stableJson(actual.json)} instead of ${stableJson(expected.json)}`);
    }
    const count = Math.max(expected.children.length, actual.children.length);
    for (let i = 0; i < count; i++) {
        const e = expected.children[i];
        const a = actual.children[i];
        if (!e) {
            diffs.push(`${here}: element ${label(a)} added`);
        } else if (!a) {
            diffs.push(`${here}: element ${label(e)} lost`);
        } else {
            diffs.push(...diffCanonical(e, a, here));
        }
    }
    return diffs;
}

/** prefix -> namespace URI of every namespace declared anywhere in the document. */
export function namespaceDeclarations(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const visit = (element: Element) => {
        for (const attr of Array.from(element.attributes)) {
            if (attr.namespaceURI === XMLNS && attr.prefix === 'xmlns') {
                result[attr.localName] = attr.value;
            }
        }
        Array.from(element.children).forEach(visit);
    };
    visit(parseXml(xml).documentElement);
    return result;
}

/** prefix -> namespace URI of every element and attribute name in use. */
export function prefixesInUse(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const visit = (element: Element) => {
        if (element.prefix) {
            result[element.prefix] = element.namespaceURI || '';
        }
        for (const attr of Array.from(element.attributes)) {
            if (attr.prefix && attr.namespaceURI !== XMLNS) {
                result[attr.prefix] = attr.namespaceURI || '';
            }
        }
        Array.from(element.children).forEach(visit);
    };
    visit(parseXml(xml).documentElement);
    return result;
}

/** Every senergy:* attribute as "elementId senergy:name=value", in document order. */
export function senergyAttributes(xml: string): string[] {
    const result: string[] = [];
    const visit = (element: Element) => {
        for (const attr of Array.from(element.attributes)) {
            if (attr.prefix === 'senergy') {
                result.push(`${element.getAttribute('id')} ${attr.name}=${attr.value}`);
            }
        }
        Array.from(element.children).forEach(visit);
    };
    visit(parseXml(xml).documentElement);
    return result;
}
