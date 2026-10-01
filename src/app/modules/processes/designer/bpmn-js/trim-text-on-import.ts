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
 * bpmn-js 4 (moddle-xml 7) trimmed every text run on import, bpmn-js 18 (moddle-xml 12) keeps
 * the whitespace. The backends compare text exactly and references resolve from it, so the
 * designers keep trimming: each text run between markup, after decoding, CDATA untouched.
 */

const CHARACTER_REFERENCE = /&#(?:([0-9]+)|x([0-9a-f]+));/iy;
const WHOLE_CHARACTER_REFERENCE = /^&#(?:([0-9]+)|x([0-9a-f]+));$/i;

/** Decodes like saxen, which moddle-xml 7 used: String.fromCharCode, so code points wrap to 16 bits. */
function isWhitespaceReference(match: RegExpExecArray | null): boolean {
    if (!match) {
        return false;
    }
    const code = match[1] !== undefined ? Number(match[1]) : parseInt(match[2], 16);
    return String.fromCharCode(code).trim() === '';
}

/** Trims like String.prototype.trim on the decoded run, so &#10; at an end counts as whitespace. */
function trimRun(run: string): string {
    let start = 0;
    while (start < run.length) {
        if (run[start].trim() === '') {
            start++;
            continue;
        }
        CHARACTER_REFERENCE.lastIndex = start;
        const match = CHARACTER_REFERENCE.exec(run);
        if (isWhitespaceReference(match)) {
            start += match![0].length;
            continue;
        }
        break;
    }
    let end = run.length;
    while (end > start) {
        if (run[end - 1].trim() === '') {
            end--;
            continue;
        }
        if (run[end - 1] === ';') {
            const ampersand = run.lastIndexOf('&', end - 1);
            if (ampersand >= start && isWhitespaceReference(WHOLE_CHARACTER_REFERENCE.exec(run.slice(ampersand, end)))) {
                end = ampersand;
                continue;
            }
        }
        break;
    }
    return run.slice(start, end);
}

/** The end index (exclusive) of the markup starting at `start`, or -1 when it is not closed. */
function markupEnd(xml: string, start: number): number {
    const closing = (terminator: string) => {
        const index = xml.indexOf(terminator, start);
        return index === -1 ? -1 : index + terminator.length;
    };
    if (xml.startsWith('<!--', start)) {
        return closing('-->');
    }
    if (xml.startsWith('<![CDATA[', start)) {
        return closing(']]>');
    }
    if (xml.startsWith('<?', start)) {
        return closing('?>');
    }
    // a tag or declaration: '>' inside quoted attribute values does not end it
    let quote: string | null = null;
    for (let i = start + 1; i < xml.length; i++) {
        const c = xml[i];
        if (quote) {
            if (c === quote) {
                quote = null;
            }
        } else if (c === '"' || c === '\'') {
            quote = c;
        } else if (c === '>') {
            return i + 1;
        }
    }
    return -1;
}

/** Trims the whitespace around every text run of the document, leaving all markup as it is. */
export function trimTextRuns(xml: string): string {
    let result = '';
    let position = 0;
    while (position < xml.length) {
        const markup = xml.indexOf('<', position);
        if (markup === -1) {
            result += trimRun(xml.slice(position));
            break;
        }
        result += trimRun(xml.slice(position, markup));
        const end = markupEnd(xml, markup);
        if (end === -1) {
            // not well-formed: leave the rest for the parser to report
            result += xml.slice(markup);
            break;
        }
        result += xml.slice(markup, end);
        position = end;
    }
    return result;
}

class TrimTextOnImport {
    static $inject = ['eventBus'];

    constructor(eventBus: any) {
        eventBus.on('import.parse.start', (event: { xml: string }) => trimTextRuns(event.xml));
    }
}

export const trimTextOnImportModule = {
    __init__: ['trimTextOnImport'],
    trimTextOnImport: ['type', TrimTextOnImport],
};
