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

import {environment} from '../../../../environments/environment';
import {AcControlCandidate, acControlElements, deviceGroupCandidates, deviceTypeCandidates, isLegacyAcControl, keepsEveryRole} from './ac-control-elements';

const FLOAT = 'https://schema.org/Float';
const BOOLEAN = 'https://schema.org/Boolean';

describe('acControlElements', () => {
    // the placeholders in environment.ts are the same string for every function and every aspect
    const ids = {
        getTemperatureFunctionId: 'get-temperature',
        setTemperatureFunctionId: 'set-temperature',
        getBinaryStateFunctionId: 'get-binary-state',
        getRemainingRelativeDurabilityFunctionId: 'get-remaining-relative-durability',
        aspectTargetId: 'target',
        aspectReadingId: 'reading',
        aspectDeviceId: 'device',
        aspectFilterId: 'filter',
    };
    let saved: Record<string, string> = {};

    beforeEach(() => {
        saved = {};
        Object.keys(ids).forEach(k => saved[k] = (environment as any)[k]);
        Object.assign(environment, ids);
    });

    afterEach(() => Object.assign(environment, saved));

    it('tells the measured temperature from the setpoint by their aspects', () => {
        // a thermostat that also accepts an external room temperature, like the Aqara SRTS-A01
        const candidates: AcControlCandidate[] = [
            {functionId: 'get-temperature', serviceId: 'get', aspectIds: ['air', 'indoor', 'reading'], type: FLOAT},
            {functionId: 'get-temperature', serviceId: 'get', aspectIds: ['target', 'air', 'indoor'], type: FLOAT},
            {functionId: 'set-temperature', serviceId: 'set', aspectIds: ['air', 'indoor', 'reading'], type: FLOAT},
            {functionId: 'set-temperature', serviceId: 'set', aspectIds: ['target', 'air', 'indoor'], type: FLOAT},
        ];

        const elements = acControlElements(candidates);

        expect(elements.getTemperatureMeasurements?.map(e => e.aspectIds)).toEqual([['air', 'indoor', 'reading']]);
        expect(elements.getTargetTemperature?.map(e => e.aspectIds)).toEqual([['target', 'air', 'indoor']]);
        expect(elements.setTargetTemperature?.map(e => e.aspectIds)).toEqual([['target', 'air', 'indoor']]);
        expect(elements.tempStep).toBe(0.5);
    });

    it('commands only a setpoint that carries Target', () => {
        const candidates: AcControlCandidate[] = [
            {functionId: 'set-temperature', serviceId: 'set', aspectIds: ['air'], type: FLOAT},
        ];

        const elements = acControlElements(candidates);

        expect(elements.setTargetTemperature).toBeUndefined();
        expect(elements.tempStep).toBe(-1);
    });

    it('leaves the measurement out when no temperature carries Reading', () => {
        const candidates: AcControlCandidate[] = [
            {functionId: 'get-temperature', serviceId: 'get', aspectIds: ['air', 'indoor'], type: FLOAT},
            {functionId: 'get-temperature', serviceId: 'get', aspectIds: ['target', 'air', 'indoor'], type: FLOAT},
        ];

        const elements = acControlElements(candidates);

        expect(elements.getTemperatureMeasurements).toBeUndefined();
        expect(elements.getTargetTemperature?.length).toBe(1);
    });

    it('reads the power state and the filter state from Get-Binary State by their aspects', () => {
        // like the Daikin Madoka
        const candidates: AcControlCandidate[] = [
            {functionId: 'get-binary-state', serviceId: 'status', aspectIds: ['filter'], type: BOOLEAN},
            {functionId: 'get-binary-state', serviceId: 'status', aspectIds: ['device', 'air'], type: BOOLEAN},
        ];

        const elements = acControlElements(candidates);

        expect(elements.getOnOff?.aspectIds).toEqual(['device', 'air']);
        expect(elements.getCleaningRequired?.aspectIds).toEqual(['filter']);
    });

    it('takes every content variable of the widget\'s functions from a device type, nested ones included', () => {
        const deviceType: any = {
            services: [{
                id: 'status',
                inputs: [],
                outputs: [{content_variable: {
                    name: 'root', type: 'https://schema.org/StructuredValue', aspect_ids: [],
                    sub_content_variables: [
                        {name: 'indoor', type: FLOAT, function_id: 'get-temperature', aspect_ids: ['air', 'reading']},
                        {name: 'humidity', type: FLOAT, function_id: 'get-humidity', aspect_ids: ['air']},
                    ],
                }}],
            }, {
                id: 'set',
                inputs: [{content_variable: {name: 'temperature', type: FLOAT, function_id: 'set-temperature', aspect_ids: ['target', 'air']}}],
                outputs: [],
            }],
        };

        expect(deviceTypeCandidates(deviceType)).toEqual([
            {functionId: 'get-temperature', serviceId: 'status', aspectIds: ['air', 'reading'], type: FLOAT},
            {functionId: 'set-temperature', serviceId: 'set', aspectIds: ['target', 'air'], type: FLOAT},
        ]);
    });

    it('takes the single-aspect criteria of a device group once per function and aspect', () => {
        const group: any = {
            criteria: [
                {function_id: 'get-temperature', aspect_id: 'reading', aspect_ids: ['reading'], interaction: 'event'},
                {function_id: 'get-temperature', aspect_id: 'reading', aspect_ids: ['reading'], interaction: 'request'},
                {function_id: 'get-temperature', aspect_id: 'air', aspect_ids: ['air', 'reading'], interaction: 'event'},
                {function_id: 'set-temperature', aspect_id: 'target', aspect_ids: ['target'], interaction: 'request'},
            ],
        };

        expect(deviceGroupCandidates(group)).toEqual([
            {functionId: 'get-temperature', aspectIds: ['reading']},
            {functionId: 'set-temperature', aspectIds: ['target']},
        ]);
    });

    it('recognises a configuration saved before the aspect lists', () => {
        const legacy: any = {minTarget: 15, maxTarget: 30, tempStep: -1, deviceId: 'd1',
            getTargetTemperature: [{functionId: 'old-get-target-temperature', aspectId: 'air', serviceId: 's1'}]};
        const current: any = {minTarget: 15, maxTarget: 30, tempStep: 0.5, deviceId: 'd1',
            getTargetTemperature: [{functionId: 'get-temperature', aspectIds: ['target', 'air'], serviceId: 's1'}]};

        expect(isLegacyAcControl(legacy)).toBeTrue();
        expect(isLegacyAcControl(current)).toBeFalse();
    });

    it('accepts a derived configuration only if it fills every role the earlier one did, apart from the lock', () => {
        const element = {functionId: 'f', aspectIds: []};
        const before: any = {getTargetTemperature: [element], setTargetTemperature: [element], getLocked: element, minTarget: 15};

        expect(keepsEveryRole(before, {getTargetTemperature: [element], setTargetTemperature: [element]})).toBeTrue();
        expect(keepsEveryRole(before, {getTargetTemperature: [element], setTargetTemperature: undefined})).toBeFalse();
    });
});
