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
 * The aspects a process element names, in both spellings the process-deployment reads: the
 * deprecated single field (senergy:aspect, payload.aspect) and the list (senergy:aspects,
 * payload.aspects). The designer writes both, with the single field set to the alias.
 */

import { compareAspectIds, criteriaAspectIds, deprecatedAspectAlias } from '../../../../metadata/device-types-overview/shared/device-type.model';

export interface AspectNodeLike {
    id: string;
    name: string;
}

interface AspectNodeSelection {
    aspect?: AspectNodeLike | null;
    aspects?: AspectNodeLike[] | null;
}

/**
 * The aspect nodes a task payload or selection demands. Readers of a payload fold the deprecated
 * aspect into the list, so a payload carrying both names their union; the result is sorted by id.
 */
export function selectedAspectNodes(selection: AspectNodeSelection | null | undefined): AspectNodeLike[] {
    const byId = new Map<string, AspectNodeLike>();
    (selection?.aspects || []).forEach((node) => {
        if (node && node.id && !byId.has(node.id)) {
            byId.set(node.id, node);
        }
    });
    const single = selection?.aspect;
    if (single && single.id && !byId.has(single.id)) {
        byId.set(single.id, single);
    }
    return [...byId.values()].sort((a, b) => compareAspectIds(a.id, b.id));
}

/** Both payload fields for a task: aspect is the alias node or null, aspects is left out when empty. */
export function payloadAspectFields(selection: AspectNodeSelection | null | undefined): { aspect: AspectNodeLike | null; aspects?: AspectNodeLike[] } {
    const nodes = selectedAspectNodes(selection);
    if (nodes.length === 0) {
        return { aspect: null };
    }
    return { aspect: nodes[0], aspects: nodes };
}

/** The part of a task name that names its aspects, or undefined when it names none. */
export function aspectsLabel(selection: AspectNodeSelection | null | undefined): string | undefined {
    const nodes = selectedAspectNodes(selection);
    if (nodes.length === 0) {
        return undefined;
    }
    return nodes.map((node) => node.name).join(', ');
}

/**
 * The aspect ids an event element demands, from its senergy:aspects and senergy:aspect attributes.
 * The list attribute is split the way the process-deployment splits it: on ',' with blanks dropped.
 */
export function eventAspectIds(aspectsAttribute: string | null | undefined, aspectAttribute: string | null | undefined): string[] {
    const list = (aspectsAttribute || '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');
    const single = (aspectAttribute || '').trim();
    return criteriaAspectIds({ aspect_ids: [...new Set(list)], aspect_id: single });
}

/**
 * The two event attributes for a selection of aspect ids. An empty selection sets both to
 * undefined, which removes them from the element instead of leaving empty attributes behind.
 */
export function eventAspectAttributes(aspectIds: string[] | null | undefined): { 'senergy:aspects': string | undefined; 'senergy:aspect': string | undefined } {
    const ids = [...new Set((aspectIds || []).map((id) => id.trim()).filter((id) => id !== ''))].sort(compareAspectIds);
    if (ids.length === 0) {
        return { 'senergy:aspects': undefined, 'senergy:aspect': undefined };
    }
    return { 'senergy:aspects': ids.join(','), 'senergy:aspect': deprecatedAspectAlias(ids) };
}
