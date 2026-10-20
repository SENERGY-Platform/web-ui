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
import { MatDialog } from '@angular/material/dialog';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportVAxesModel } from '../../shared/charts-export-properties.model';
import { AxisConfigComponent } from './axis-config.component';

describe('AxisConfigComponent grouping per axis', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: {} }] }));

    function configure(element: Partial<ChartsExportVAxesModel>, widgetGroupType: string | undefined, axisGroupAllowed = true): AxisConfigComponent {
        const component = TestBed.runInInjectionContext(() => new AxisConfigComponent());
        component.element = { exportName: 'e', valueName: 'a', valueType: 'float', math: '*2', color: '', ...element };
        component.groupType = widgetGroupType;
        component.groupTypeIsDifference = widgetGroupType?.startsWith('difference') === true;
        component.axisGroupAllowed = axisGroupAllowed;
        return component;
    }

    it('hides Math and clears it only on the axis whose own group is a difference', () => {
        const own = configure({}, 'mean');
        own.groupChoice = 'difference-last';
        expect(own.effectiveGroupIsDifference).toBeTrue();
        expect(own.element.math).toBe('');

        const other = configure({}, 'mean');
        other.groupChoice = 'median';
        expect(other.effectiveGroupIsDifference).toBeFalse();
        expect(other.element.math).toBe('*2');

        const likeWidget = configure({}, 'difference-last');
        expect(likeWidget.effectiveGroupIsDifference).toBeTrue();
        const rawUnderDifference = configure({ ownGroup: { type: '', time: '' } }, 'difference-last');
        expect(rawUnderDifference.effectiveGroupIsDifference).toBeFalse();
    });

    it('offers the Sum merging strategy by the group type of the axis itself', () => {
        expect(configure({ ownGroup: { type: 'median', time: '1h' } }, undefined).effectiveGroupType).toBe('median');
        expect(configure({ ownGroup: { type: '', time: '' } }, 'mean').effectiveGroupType).toBeFalsy();
        expect(configure({}, 'mean').effectiveGroupType).toBe('mean');
        expect(configure({ ownGroup: { type: 'median', time: '1h' } }, 'mean', false).effectiveGroupType).toBe('mean');
    });

    it('drops a stored Sum strategy when the axis is set to raw values, and keeps it with an own group type', () => {
        const raw = configure({ deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Sum }, 'mean');
        raw.groupChoice = '';
        expect(raw.element.deviceGroupMergingStrategy).toBe(ChartsExportDeviceGroupMergingStrategy.Separate);

        const grouped = configure({ deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Sum }, 'mean');
        grouped.groupChoice = 'median';
        expect(grouped.element.deviceGroupMergingStrategy).toBe(ChartsExportDeviceGroupMergingStrategy.Sum);
    });

    it('keeps the chosen unit while the number is empty or half typed', () => {
        const component = configure({ ownGroup: { type: 'median', time: '1h' } }, undefined);
        component.groupTimeValue = '';
        expect(component.groupTimeLevel).toBe('h');
        component.groupTimeValue = '1.';
        expect(component.groupTimeLevel).toBe('h');
        expect(component.groupTimeValue).toBe('1.');
        component.groupTimeValue = '1 ';
        expect(component.groupTimeLevel).toBe('h');
        component.groupTimeValue = '2';
        expect(component.element.ownGroup?.time).toBe('2h');
    });

    it('reads number and unit again when the stored time changes from outside', () => {
        const component = configure({ ownGroup: { type: 'median', time: '1h' } }, undefined);
        expect(component.groupTimeValue).toBe('1');
        component.element = { ...component.element, ownGroup: { type: 'median', time: '3d' } };
        expect([component.groupTimeValue, component.groupTimeLevel]).toEqual(['3', 'd']);
    });
});
