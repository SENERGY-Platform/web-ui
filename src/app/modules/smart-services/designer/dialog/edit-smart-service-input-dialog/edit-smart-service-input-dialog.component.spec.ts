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

import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import {
    AbstractSmartServiceInput,
    abstractSmartServiceInputToSmartServiceInputsDescription,
    EditSmartServiceInputDialogComponent,
    smartServiceInputsDescriptionToAbstractSmartServiceInput,
} from './edit-smart-service-input-dialog.component';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceClassesService } from '../../../../metadata/device-classes/shared/device-classes.service';
import { CharacteristicsService } from '../../../../metadata/characteristics/shared/characteristics.service';
import { DeviceTypeAspectNodeModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { SmartServiceInputsDescription } from '../../shared/designer.model';

const air = 'urn:infai:ses:aspect:air';
const water = 'urn:infai:ses:aspect:water';

const iotInput = (criteriaList: AbstractSmartServiceInput['criteria_list']): AbstractSmartServiceInput => ({
    id: 'device',
    label: 'Device',
    type: 'string',
    order: 0,
    multiple: false,
    auto_select_all: false,
    optional: false,
    iot_selectors: ['device'],
    criteria_list: criteriaList,
});

const description = (properties: { id: string; value: string }[]): SmartServiceInputsDescription => ({
    inputs: [{ id: 'device', label: 'Device', type: 'string', default_value: '', properties }],
});

const writtenCriteria = (input: AbstractSmartServiceInput) =>
    abstractSmartServiceInputToSmartServiceInputsDescription([input]).inputs[0].properties.find((p) => p.id === 'criteria_list')?.value;

describe('smart-service input criteria', () => {
    it('writes a criteria without aspect with neither field, as before', () => {
        expect(writtenCriteria(iotInput([{ interaction: 'request', aspect_id: '' }]))).toBe('[{"interaction":"request"}]');
    });

    it('writes one aspect in both spellings', () => {
        expect(JSON.parse(writtenCriteria(iotInput([{ interaction: 'request', aspect_ids: [air] }])) as string)).toEqual([
            { interaction: 'request', aspect_id: air, aspect_ids: [air] },
        ]);
    });

    it('writes two aspects sorted, with the first as the alias', () => {
        expect(JSON.parse(writtenCriteria(iotInput([{ aspect_id: water, aspect_ids: [water, air] }])) as string)).toEqual([
            { aspect_id: air, aspect_ids: [air, water] },
        ]);
    });

    it('opens a legacy single criteria property with its aspect selected', () => {
        const [input] = smartServiceInputsDescriptionToAbstractSmartServiceInput(description([{ id: 'criteria', value: `{"aspect_id":"${air}"}` }]));
        expect(input.criteria_list).toEqual([{ aspect_id: air, aspect_ids: [air] }]);
    });

    it('opens a criteria list with the union of inconsistent fields', () => {
        const [input] = smartServiceInputsDescriptionToAbstractSmartServiceInput(
            description([{ id: 'criteria_list', value: `[{"aspect_id":"${water}","aspect_ids":["${air}"]}]` }]),
        );
        expect(input.criteria_list?.[0].aspect_ids).toEqual([air, water]);
    });
});

describe('EditSmartServiceInputDialogComponent criteria', () => {
    const node = (id: string, name: string): DeviceTypeAspectNodeModel =>
        ({ id, name, root_id: id, parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] });

    const environmentClass = 'urn:infai:ses:aspect-class:environment';
    const classified = [
        { ...node(air, 'Air'), aspect_class_id: environmentClass },
        { ...node(water, 'Water'), aspect_class_id: environmentClass },
    ];
    let dialogRef: Spy<MatDialogRef<EditSmartServiceInputDialogComponent>>;

    function init(properties: { id: string; value: string }[], listing = [node(air, 'Air'), node(water, 'Water')]): EditSmartServiceInputDialogComponent {
        dialogRef = createSpyFromClass<MatDialogRef<EditSmartServiceInputDialogComponent>>(MatDialogRef);
        const deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly.and.returnValue(of(listing));
        const functionsService = createSpyFromClass(FunctionsService);
        functionsService.getFunctions.and.returnValue(of({ result: [], total: 0 }));
        const deviceClassesService = createSpyFromClass(DeviceClassesService);
        deviceClassesService.getDeviceClasses.and.returnValue(of({ result: [], total: 0 }));
        const characteristicsService = createSpyFromClass(CharacteristicsService);
        characteristicsService.getCharacteristics.and.returnValue(of({ result: [], total: 0 }));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EditSmartServiceInputDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { info: description(properties), element: {} } },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: FunctionsService, useValue: functionsService },
                { provide: DeviceClassesService, useValue: deviceClassesService },
                { provide: CharacteristicsService, useValue: characteristicsService },
            ],
        });
        TestBed.overrideTemplate(EditSmartServiceInputDialogComponent, '');
        return TestBed.createComponent(EditSmartServiceInputDialogComponent).componentInstance;
    }

    it('names every aspect of a criteria', () => {
        const component = init([{ id: 'criteria_list', value: `[{"interaction":"event","aspect_ids":["${water}","${air}"]}]` }]);
        expect(component.criteriaToLabel(component.abstract[0].criteria_list![0])).toBe('event | Air, Water');
    });

    it('keeps a picked selection on the alias and offers a stored aspect the listing lacks under its id', () => {
        const gone = 'urn:infai:ses:aspect:gone';
        const component = init([{ id: 'criteria_list', value: `[{"aspect_ids":["${gone}"]},{}]` }]);
        expect(component.aspects.map((a) => a.name)).toEqual(['Air', 'Water', gone]);
        component.setAspects(component.abstract[0].criteria_list![1], [water, air]);
        expect(JSON.parse(writtenCriteria(component.abstract[0]) as string)).toEqual([
            { aspect_id: gone, aspect_ids: [gone] },
            { aspect_id: air, aspect_ids: [air, water] },
        ]);
    });

    describe('aspect-class collision', () => {
        it('blocks OK for a criteria naming two aspects of one class, until one is removed', () => {
            const component = init([{ id: 'criteria_list', value: '[{}]' }], classified);
            const criteria = component.abstract[0].criteria_list![0];
            expect(component.isValid()).toBeTrue();

            component.setAspects(criteria, [air, water]);
            expect(component.hasAspectClassCollision(criteria)).toBeTrue();
            expect(component.isValid()).toBeFalse();
            component.ok();
            expect(dialogRef.close).not.toHaveBeenCalled();

            component.setAspects(criteria, [air]);
            expect(component.isValid()).toBeTrue();
            component.ok();
            expect(dialogRef.close).toHaveBeenCalledTimes(1);
        });

        it('blocks OK for a stored criteria that already collides', () => {
            const component = init([{ id: 'criteria_list', value: `[{"aspect_ids":["${air}","${water}"]}]` }], classified);
            expect(component.isValid()).toBeFalse();
        });

        it('accepts two aspects without a class, as before', () => {
            const component = init([{ id: 'criteria_list', value: `[{"aspect_ids":["${air}","${water}"]}]` }]);
            expect(component.isValid()).toBeTrue();
        });
    });
});
