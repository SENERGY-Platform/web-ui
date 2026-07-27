/*
 * Copyright 2025 InfAI (CC SES)
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

import { draw, FloorplanWidgetCapabilityModel, FloorplanWidgetPropertiesModel, isPlaced } from './floorplan.model';

const placement = (overwrite: Partial<FloorplanWidgetCapabilityModel>): FloorplanWidgetCapabilityModel => ({
    alias: 'alias',
    deviceGroupId: 'deviceGroupId',
    criteria: { function_id: 'function', aspect_id: '', device_class_id: '', interaction: '' },
    position: { x: 0.5, y: 0.5 },
    coloring: [{ value: 0, icon: 'circle', color: '#000000', showValue: false, showValueWhenZoomed: false }],
    valueLow: null,
    valueHigh: null,
    colorLow: null,
    colorHigh: null,
    ...overwrite,
});

describe('FloorplanModel', () => {
    describe('isPlaced', () => {
        it('is true once a position is set', () => {
            expect(isPlaced(placement({ position: { x: 0.5, y: 0.5 } }))).toBeTrue();
        });

        it('is true for a position at the origin', () => {
            // 0 is a valid coordinate and must not be confused with a missing position
            expect(isPlaced(placement({ position: { x: 0, y: 0 } }))).toBeTrue();
        });

        it('is false while any coordinate is missing', () => {
            expect(isPlaced(placement({ position: { x: null, y: null } }))).toBeFalse();
            expect(isPlaced(placement({ position: { x: 0.5, y: null } }))).toBeFalse();
            expect(isPlaced(placement({ position: { x: null, y: 0.5 } }))).toBeFalse();
        });
    });

    describe('draw', () => {
        let canvas: HTMLCanvasElement;
        let wrapper: HTMLDivElement;

        beforeEach(() => {
            wrapper = document.createElement('div');
            wrapper.style.width = '200px';
            wrapper.style.height = '100px';
            canvas = document.createElement('canvas');
            wrapper.appendChild(canvas);
            document.body.appendChild(wrapper);
        });

        afterEach(() => document.body.removeChild(wrapper));

        it('draws a dot for placed placements only', () => {
            const arc = spyOn(CanvasRenderingContext2D.prototype, 'arc').and.callThrough();
            const properties: FloorplanWidgetPropertiesModel = {
                floorplan: {
                    image: null,
                    dotSize: 10,
                    placements: [
                        placement({ alias: 'placed' }),
                        placement({ alias: 'unplaced', position: { x: null, y: null } }),
                        placement({ alias: 'also placed' }),
                    ],
                },
            };

            draw(canvas, properties);

            expect(arc.calls.count()).toBe(2);
        });
    });
});
