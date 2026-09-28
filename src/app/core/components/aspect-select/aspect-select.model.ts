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

import { DeviceTypeAspectModel, DeviceTypeAspectNodeModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';

/** A flattened, dot-prefixed aspect option; aspect_class_name is filled in once the aspect classes are known. */
export interface AspectSelectOption extends DeviceTypeAspectModel {
    aspect_class_name?: string;
}

export interface AspectClassification {
    classId: string;
    name: string;
}

/** The root of a hierarchy assigns its class, so every aspect below it shares that one. */
export function classifyAspects(roots: DeviceTypeAspectModel[]): Map<string, AspectClassification> {
    const result = new Map<string, AspectClassification>();
    const collect = (node: DeviceTypeAspectModel, classId: string) => {
        result.set(node.id, { classId, name: node.name });
        node.sub_aspects?.forEach((sub) => collect(sub, classId));
    };
    roots.forEach((root) => {
        if (root.aspect_class_id) {
            collect(root, root.aspect_class_id);
        }
    });
    return result;
}

/**
 * The device-repository refuses a content variable or criteria holding two aspects of the same
 * class. A hierarchy carries exactly one class, so the rule reads: at most one aspect out of any
 * classified hierarchy. Two unclassified aspects never collide -- there is no class to collide on.
 */
export function collidingAspectNames(classified: Map<string, AspectClassification>, aspectIds: unknown): string[] {
    if (!Array.isArray(aspectIds)) {
        return [];
    }
    const namesByClass = new Map<string, string[]>();
    aspectIds.forEach((id) => {
        const classification = classified.get(id);
        if (classification === undefined) {
            return;
        }
        namesByClass.set(classification.classId, (namesByClass.get(classification.classId) || []).concat(classification.name));
    });
    const colliding: string[] = [];
    namesByClass.forEach((names) => {
        if (names.length > 1) {
            colliding.push(...names);
        }
    });
    return colliding;
}

/**
 * Converts a flat aspect NODE list (root_id/parent_id/child_ids, as used by device-instance and
 * deployment pickers) into the aspect-select's tree input. Aspect nodes carry no aspect_class_id,
 * so a tree built this way offers no aspect-class grouping or collision validation. A node whose
 * parent is missing from the list becomes a root of its own: filtered listings such as
 * /aspect-nodes?function=measuring-function omit the ancestors of the aspects they return.
 */
export function aspectTreeFromAspectNodes(nodes: DeviceTypeAspectNodeModel[]): DeviceTypeAspectModel[] {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const build = (node: DeviceTypeAspectNodeModel): DeviceTypeAspectModel => ({
        id: node.id,
        name: node.name,
        sub_aspects: (node.child_ids ?? [])
            .map((id) => byId.get(id))
            .filter((n): n is DeviceTypeAspectNodeModel => n !== undefined)
            .map(build),
    });
    return nodes.filter((n) => n.parent_id === n.id || !byId.has(n.parent_id)).map(build);
}
