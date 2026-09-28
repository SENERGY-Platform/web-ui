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

import { classifyAspects } from '../../../../core/components/aspect-select/aspect-select.model';
import {
    criteriaAspectsLabel,
    criteriaHasAspectClassCollision,
    criteriaListHasAspectClassCollision,
    editableCriteria,
    setCriteriaAspects,
    SmartServiceCriteria,
    storableCriteria,
} from './smart-service-criteria';

const air = 'urn:infai:ses:aspect:air';
const water = 'urn:infai:ses:aspect:water';

describe('smart-service criteria', () => {
    it('stores a criteria without aspect as it was, with no list', () => {
        const fresh = { interaction: 'request', aspect_id: '', device_class_id: '', function_id: '' };
        expect(JSON.stringify(storableCriteria(editableCriteria(fresh)))).toBe(JSON.stringify(fresh));
        expect(storableCriteria({ function_id: 'f', aspect_ids: [] })).toEqual({ function_id: 'f' });
    });

    it('stores one aspect in both spellings', () => {
        const criteria: SmartServiceCriteria = { interaction: 'request', aspect_id: '', function_id: 'f' };
        setCriteriaAspects(criteria, [air]);
        expect(JSON.stringify(storableCriteria(criteria))).toBe(
            `{"interaction":"request","aspect_id":"${air}","function_id":"f","aspect_ids":["${air}"]}`,
        );
    });

    it('stores two aspects sorted, with the first as the alias, whatever order they were picked in', () => {
        const criteria: SmartServiceCriteria = { interaction: 'request', aspect_id: '', function_id: 'f' };
        setCriteriaAspects(criteria, [water, air]);
        expect(storableCriteria(criteria)).toEqual({ interaction: 'request', aspect_id: air, function_id: 'f', aspect_ids: [air, water] });
    });

    it('stores no aspect once the picked aspects are removed again', () => {
        const criteria = editableCriteria({ aspect_id: air, aspect_ids: [air, water], function_id: 'f' });
        setCriteriaAspects(criteria, []);
        expect(storableCriteria(criteria)).toEqual({ aspect_id: '', function_id: 'f' });
    });

    it('opens a criteria written before the list with its single aspect selected', () => {
        expect(editableCriteria({ aspect_id: air, function_id: 'f' }).aspect_ids).toEqual([air]);
    });

    it('opens and stores the union of inconsistent fields, as device-selection folds them', () => {
        const criteria = editableCriteria({ aspect_id: water, aspect_ids: [air, air] });
        expect(criteria.aspect_ids).toEqual([air, water]);
        expect(storableCriteria(criteria)).toEqual({ aspect_id: air, aspect_ids: [air, water] });
        expect(storableCriteria({ aspect_id: water, aspect_ids: [air] })).toEqual({ aspect_id: air, aspect_ids: [air, water] });
    });

    it('treats malformed aspect fields as absent', () => {
        const malformed = { aspect_ids: 'urn:not-a-list', aspect_id: 42 } as unknown as SmartServiceCriteria;
        expect(editableCriteria(malformed).aspect_ids).toBeUndefined();
    });

    it('names every aspect, falling back to the id', () => {
        const names = new Map([[air, 'Air']]);
        expect(criteriaAspectsLabel({ aspect_ids: [water, air] }, names)).toBe('Air, ' + water);
        expect(criteriaAspectsLabel({ aspect_id: '' }, names)).toBe('');
    });

    describe('aspect-class collision', () => {
        const environment = 'urn:infai:ses:aspect-class:environment';
        const classified = classifyAspects([
            { id: air, name: 'Air', aspect_class_id: environment },
            { id: water, name: 'Water', aspect_class_id: environment },
            { id: 'urn:infai:ses:aspect:free', name: 'Free' },
        ]);

        it('finds two aspects of one class in either spelling', () => {
            expect(criteriaHasAspectClassCollision({ aspect_ids: [air, water] }, classified)).toBeTrue();
            expect(criteriaHasAspectClassCollision({ aspect_id: air, aspect_ids: [water] }, classified)).toBeTrue();
        });

        it('accepts one classified aspect, unclassified aspects, and none', () => {
            expect(criteriaHasAspectClassCollision({ aspect_ids: [air] }, classified)).toBeFalse();
            expect(criteriaHasAspectClassCollision({ aspect_ids: [air, 'urn:infai:ses:aspect:free'] }, classified)).toBeFalse();
            expect(criteriaHasAspectClassCollision({}, classified)).toBeFalse();
        });

        it('judges a list by its worst criteria, and anything but a list as free of collisions', () => {
            expect(criteriaListHasAspectClassCollision([{ aspect_ids: [air] }, { aspect_ids: [air, water] }], classified)).toBeTrue();
            expect(criteriaListHasAspectClassCollision([null, 'x', { aspect_ids: [air] }], classified)).toBeFalse();
            expect(criteriaListHasAspectClassCollision({ aspect_ids: [air, water] }, classified)).toBeFalse();
        });
    });
});
