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

import {
    criteriaAspectFields,
    criteriaAspectIds,
    deprecatedAspectAlias,
} from '../../../metadata/device-types-overview/shared/device-type.model';

/**
 * A device-selection criteria as the smart-service designer stores it in task and input properties, which
 * the smart-service-repository and the module workers forward to device-selection unchanged.
 */
export interface SmartServiceCriteria {
    interaction?: string;
    function_id?: string;
    device_class_id?: string;
    /** @deprecated alias of aspect_ids, written for readers that predate the list */
    aspect_id?: string;
    aspect_ids?: string[];
}

/** The aspects a stored criteria demands: the union of both fields, as device-selection folds them. Malformed fields count as absent. */
export function smartServiceCriteriaAspectIds(criteria: SmartServiceCriteria): string[] {
    const list = Array.isArray(criteria.aspect_ids) ? criteria.aspect_ids.filter((id) => typeof id === 'string' && id !== '') : [];
    const single = typeof criteria.aspect_id === 'string' ? criteria.aspect_id : undefined;
    return criteriaAspectFields(criteriaAspectIds({ aspect_ids: list, aspect_id: single })).aspect_ids || [];
}

/** A stored criteria prepared for a picker: aspect_ids holds the sorted union, and is left out without an aspect. */
export function editableCriteria(criteria: SmartServiceCriteria): SmartServiceCriteria {
    if (criteria === null || typeof criteria !== 'object') {
        return criteria;
    }
    const { aspect_ids: _, ...rest } = criteria;
    const ids = smartServiceCriteriaAspectIds(criteria);
    return ids.length > 0 ? { ...rest, aspect_ids: ids } : rest;
}

/** Applies a picker selection, keeping aspect_id on the alias so an untouched criteria keeps its stored value. */
export function setCriteriaAspects(criteria: SmartServiceCriteria, aspectIds: string[] | null): void {
    criteria.aspect_ids = aspectIds || [];
    criteria.aspect_id = deprecatedAspectAlias(criteria.aspect_ids) || '';
}

/**
 * The criteria as it is stored: the sorted list plus aspect_id as its alias. Without an aspect the list is
 * left out and aspect_id keeps whatever "no aspect" value the criteria carried.
 */
export function storableCriteria(criteria: SmartServiceCriteria): SmartServiceCriteria {
    if (criteria === null || typeof criteria !== 'object') {
        return criteria;
    }
    const { aspect_ids: _, ...rest } = criteria;
    const fields = criteriaAspectFields(smartServiceCriteriaAspectIds(criteria));
    return fields.aspect_ids ? { ...rest, ...fields } : rest;
}

/** Names every aspect of a criteria, falling back to the id for an aspect the caller has no name for. */
export function criteriaAspectsLabel(criteria: SmartServiceCriteria, aspectNames: Map<string, string>): string {
    return smartServiceCriteriaAspectIds(criteria)
        .map((id) => aspectNames.get(id) || id)
        .join(', ');
}
