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

/**
 * Processes and smart services pin platform metadata by id, spread over camunda input parameters,
 * JSON payloads, criteria lists and event selections. There is no single field to read, so the ids
 * are picked up by their urn shape wherever they appear.
 */

export type MetadataKind = 'function' | 'aspect' | 'device-class' | 'characteristic';

const urnSegmentToKind = new Map<string, MetadataKind>([
    ['measuring-function', 'function'],
    ['controlling-function', 'function'],
    ['function', 'function'],
    ['aspect', 'aspect'],
    ['device-class', 'device-class'],
    ['characteristic', 'characteristic'],
]);

const kindLabels: { [kind in MetadataKind]: { one: string; many: string } } = {
    'function': { one: 'function', many: 'functions' },
    'aspect': { one: 'aspect', many: 'aspects' },
    'device-class': { one: 'device class', many: 'device classes' },
    'characteristic': { one: 'characteristic', many: 'characteristics' },
};

// the trailing ':' keeps 'urn:infai:ses:aspect-class:...' out, it is not a metadata reference
const metadataUrnPattern = new RegExp('urn:infai:ses:(' + [...urnSegmentToKind.keys()].join('|') + '):[A-Za-z0-9_-]+', 'g');

// moddle keeps back-references to the rest of the diagram; following them would attribute another
// element's metadata to this one
const skippedKeys = ['$parent', 'di', 'incoming', 'outgoing', 'sourceRef', 'targetRef', 'attachedToRef', 'default', 'processRef', 'flowElements'];

export const metadataKindOf = (urn: string): MetadataKind | undefined => urnSegmentToKind.get(urn.split(':')[3]);

export const collectMetadataUrnsFromText = (text: string | null | undefined): string[] => {
    if (!text) {
        return [];
    }
    return [...new Set(text.match(metadataUrnPattern) || [])];
};

/** collects the urns of an object graph, used for the bpmn business object of a single element */
export const collectMetadataUrnsFromObject = (value: unknown): string[] => {
    const found = new Set<string>();
    const seen = new Set<object>();
    const walk = (current: unknown) => {
        if (typeof current === 'string') {
            collectMetadataUrnsFromText(current).forEach((urn) => found.add(urn));
            return;
        }
        if (current === null || typeof current !== 'object') {
            return;
        }
        if (seen.has(current)) {
            return;
        }
        seen.add(current);
        if (Array.isArray(current)) {
            current.forEach(walk);
            return;
        }
        Object.entries(current).forEach(([key, entry]) => {
            if (!skippedKeys.includes(key)) {
                walk(entry);
            }
        });
    };
    walk(value);
    return [...found];
};

const maxListedUrns = 6;

/** tooltip text for the warning icon, rendered with white-space: pre-line */
export const describeMissingMetadata = (urns: string[]): string => {
    const counts = new Map<MetadataKind, number>();
    urns.forEach((urn) => {
        const kind = metadataKindOf(urn);
        if (kind) {
            counts.set(kind, (counts.get(kind) || 0) + 1);
        }
    });
    const summary = [...counts.entries()]
        .map(([kind, count]) => count + ' ' + (count === 1 ? kindLabels[kind].one : kindLabels[kind].many))
        .join(', ');
    const lines = ['References metadata that no longer exists: ' + summary];
    urns.slice(0, maxListedUrns).forEach((urn) => lines.push(urn));
    if (urns.length > maxListedUrns) {
        lines.push('and ' + (urns.length - maxListedUrns) + ' more');
    }
    return lines.join('\n');
};
