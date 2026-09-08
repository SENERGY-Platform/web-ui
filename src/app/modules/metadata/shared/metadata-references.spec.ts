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

import { collectMetadataUrnsFromObject, collectMetadataUrnsFromText, describeMissingMetadata, metadataKindOf } from './metadata-references';

describe('metadata-references', () => {
    const measuring = 'urn:infai:ses:measuring-function:20d3c1d3-77d7-4181-a9f3-b487add58cd0';
    const controlling = 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9';
    const aspect = 'urn:infai:ses:aspect:a7470d73-dde3-41fc-92bd-f16bb28f2da6';
    const deviceClass = 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86';
    const characteristic = 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43';

    it('maps every referenced urn to its kind', () => {
        expect(metadataKindOf(measuring)).toBe('function');
        expect(metadataKindOf(controlling)).toBe('function');
        expect(metadataKindOf(aspect)).toBe('aspect');
        expect(metadataKindOf(deviceClass)).toBe('device-class');
        expect(metadataKindOf(characteristic)).toBe('characteristic');
    });

    it('ignores urns of other resources', () => {
        expect(metadataKindOf('urn:infai:ses:device:abc')).toBeUndefined();
        expect(collectMetadataUrnsFromText('urn:infai:ses:aspect-class:abc urn:infai:ses:service:def')).toEqual([]);
    });

    it('reads the ids out of a task payload without duplicates', () => {
        const payload = JSON.stringify({
            function: { id: measuring },
            device_class: { id: deviceClass },
            aspect: { id: aspect },
            characteristic_id: characteristic,
        });
        const xml = '<camunda:inputParameter name="payload">' + payload + payload + '</camunda:inputParameter>';
        expect(collectMetadataUrnsFromText(xml).sort()).toEqual([aspect, deviceClass, characteristic, measuring].sort());
    });

    it('reads the ids out of an object graph and stops at back references', () => {
        const parent = { criteria: controlling };
        const businessObject: any = {
            extensionElements: { values: [{ value: '[{"function_id":"' + measuring + '"}]' }] },
            $parent: parent,
            incoming: [{ value: aspect }],
        };
        expect(collectMetadataUrnsFromObject(businessObject)).toEqual([measuring]);
    });

    it('survives a cycle', () => {
        const a: any = { value: characteristic };
        a.self = a;
        expect(collectMetadataUrnsFromObject(a)).toEqual([characteristic]);
    });

    it('summarises the missing references and caps the list', () => {
        expect(describeMissingMetadata([measuring, controlling, aspect])).toBe(
            'References metadata that no longer exists: 2 functions, 1 aspect\n' + measuring + '\n' + controlling + '\n' + aspect,
        );
        const many = Array.from({ length: 8 }, (_, i) => 'urn:infai:ses:aspect:a' + i);
        expect(describeMissingMetadata(many).split('\n').length).toBe(8);
        expect(describeMissingMetadata(many)).toContain('and 2 more');
    });
});
