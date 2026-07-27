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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DeviceCommandService } from '../../core/services/device-command.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceGroupsService } from '../../modules/devices/device-groups/shared/device-groups.service';
import { DeviceInstancesService } from '../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceClassesService } from '../../modules/metadata/device-classes/shared/device-classes.service';
import { ConceptsService } from '../../modules/metadata/concepts/shared/concepts.service';
import { FloorplanComponent } from './floorplan.component';
import { DeviceGroupWithValueModel, FloorplanWidgetCapabilityModel, fpCriteriaConnectionStatus } from './shared/floorplan.model';

const placement = (overwrite: Partial<FloorplanWidgetCapabilityModel>): FloorplanWidgetCapabilityModel => ({
    alias: 'alias',
    deviceGroupId: 'deviceGroupId',
    criteria: { function_id: 'function', aspect_id: '', device_class_id: '', interaction: '' },
    position: { x: 0.5, y: 0.5 },
    coloring: [{ value: 0, icon: 'lightbulb', color: '#ff0000', showValue: false, showValueWhenZoomed: false }],
    valueLow: null,
    valueHigh: null,
    colorLow: null,
    colorHigh: null,
    ...overwrite,
});

/** the dot size normally depends on the rendered widget size, which is 0 in tests */
const DOT_SIZE = 40;

describe('FloorplanComponent', () => {
    let component: FloorplanComponent;
    let fixture: ComponentFixture<FloorplanComponent>;
    const dialogSpy: Spy<MatDialog> = createSpyFromClass<MatDialog>(MatDialog);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FloorplanComponent],
            providers: [
                { provide: MatDialog, useValue: dialogSpy },
                { provide: DashboardService, useValue: createSpyFromClass<DashboardService>(DashboardService) },
                { provide: DeviceCommandService, useValue: createSpyFromClass<DeviceCommandService>(DeviceCommandService) },
                { provide: DeviceGroupsService, useValue: createSpyFromClass<DeviceGroupsService>(DeviceGroupsService) },
                { provide: ConceptsService, useValue: createSpyFromClass<ConceptsService>(ConceptsService) },
                { provide: DeviceClassesService, useValue: createSpyFromClass<DeviceClassesService>(DeviceClassesService) },
                { provide: DeviceInstancesService, useValue: createSpyFromClass<DeviceInstancesService>(DeviceInstancesService) },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FloorplanComponent);
        component = fixture.componentInstance;
        // no detectChanges(): ngOnInit would load the widget data, these tests drive draw() directly
        spyOnProperty(FloorplanComponent.prototype, 'dotSize', 'get').and.returnValue(DOT_SIZE);
    });

    /** prepares the component as if the image was loaded and draws the given placements */
    const drawPlacements = (placements: FloorplanWidgetCapabilityModel[], showUnplacedTable = false) => {
        component.widget = {
            id: 'widgetId',
            name: 'widget',
            type: 'floorplan',
            properties: { floorplan: { image: null, dotSize: 10, placements, showUnplacedTable } },
        } as WidgetModel;
        component.img = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
        component.drawShift = { centerShiftX: 0, centerShiftY: 0, ratio: 1 };
        component.draw();
    };

    const pointStyle = (ctx: any): any => {
        const style = component.chartjs.options?.elements?.point?.pointStyle as unknown as (c: any) => any;
        return style(ctx);
    };

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('placements without a position', () => {
        it('are not drawn on the map', () => {
            drawPlacements([placement({ alias: 'placed' }), placement({ alias: 'unplaced', position: { x: null, y: null } })]);

            const datasets = component.chartjs.data?.datasets || [];
            expect(datasets[0].data.length).toBe(1);
            expect(datasets[1].data.length).toBe(0);
        });

        it('keep their dataset, so the indices stay aligned with the placements', () => {
            // the tooltip and the actions look up placements by dataset index
            drawPlacements([
                placement({ alias: 'unplaced', position: { x: null, y: null } }),
                placement({ alias: 'placed' }),
            ]);

            expect(component.chartjs.data?.datasets.length).toBe(2);
            expect(component.chartjs.icons.length).toBe(2);
        });

        it('are listed in the table when the option is enabled', () => {
            drawPlacements(
                [placement({ alias: 'placed' }), placement({ alias: 'unplaced', position: { x: null, y: null } })],
                true,
            );

            expect(component.unplacedRows.length).toBe(1);
            expect(component.unplacedRows[0].alias).toBe('unplaced');
            expect(component.unplacedRows[0].index).toBe(1);
            expect(component.unplacedRows[0].icon).toBe('lightbulb');
            expect(component.unplacedRows[0].color).toBe('#ff0000');
        });

        it('are not listed when the option is disabled', () => {
            drawPlacements([placement({ alias: 'unplaced', position: { x: null, y: null } })], false);

            expect(component.unplacedRows).toEqual([]);
        });

        it('show their value including the unit', () => {
            component.functionIdToUnit.set('function', '°C');
            drawPlacements(
                [
                    placement({
                        alias: 'unplaced',
                        position: { x: null, y: null },
                        criteria: {
                            function_id: 'function',
                            aspect_id: '',
                            device_class_id: '',
                            interaction: '',
                            value: { status_code: 200, message: 21 },
                        },
                    }),
                ],
                true,
            );

            expect(component.unplacedRows[0].value).toBe('21 °C');
        });

        it('show no value while the criteria has none', () => {
            drawPlacements([placement({ alias: 'unplaced', position: { x: null, y: null } })], true);

            expect(component.unplacedRows[0].value).toBe('');
        });
    });

    describe('pointStyle', () => {
        it('falls back to the default style when resolved without a data point', () => {
            // chart.js resolves the options of a dataset without data against a dataset context,
            // which has no parsed values - throwing here aborts the whole chart update
            drawPlacements([placement({ alias: 'unplaced', position: { x: null, y: null } })]);

            expect(pointStyle({ parsed: undefined })).toBe('circle');
        });

        it('draws the plain dot when nothing should be displayed next to it', () => {
            drawPlacements([placement({ showAlias: false })]);

            const style = pointStyle({ parsed: { x: 50, y: 50 } }) as HTMLCanvasElement;
            expect(style instanceof HTMLCanvasElement).toBeTrue();
            expect(style.width).toBe(DOT_SIZE);
        });

        it('widens the dot to fit the alias when enabled', () => {
            drawPlacements([placement({ alias: 'Kitchen', showAlias: true })]);

            const style = pointStyle({ parsed: { x: 50, y: 50 } }) as HTMLCanvasElement;
            expect(style.width).toBeGreaterThan(DOT_SIZE);
        });

        it('shows the alias of a maximized widget only when configured for it', () => {
            component.zoom = true;
            drawPlacements([placement({ alias: 'Kitchen', showAlias: true, showAliasWhenZoomed: false })]);
            expect((pointStyle({ parsed: { x: 50, y: 50 } }) as HTMLCanvasElement).width).toBe(DOT_SIZE);

            drawPlacements([placement({ alias: 'Kitchen', showAlias: false, showAliasWhenZoomed: true })]);
            expect((pointStyle({ parsed: { x: 50, y: 50 } }) as HTMLCanvasElement).width).toBeGreaterThan(DOT_SIZE);
        });
    });

    describe('actions', () => {
        const connectionStatus = placement({
            alias: 'unplaced',
            position: { x: null, y: null },
            criteria: { function_id: fpCriteriaConnectionStatus, aspect_id: '', device_class_id: '', interaction: '' },
        });

        beforeEach(() => {
            dialogSpy.open.calls.reset();
            component.deviceGroups = [{ id: 'deviceGroupId', criteria: [] } as unknown as DeviceGroupWithValueModel];
        });

        it('are offered for a controllable placement', () => {
            drawPlacements([connectionStatus], true);

            expect(component.hasAction(0)).toBeTrue();
        });

        it('are not offered without a matching controlling criteria', () => {
            drawPlacements([placement({ alias: 'unplaced', position: { x: null, y: null } })], true);

            expect(component.hasAction(0)).toBeFalse();
        });

        it('are performed for the placement behind the table row', () => {
            drawPlacements([connectionStatus], true);

            component.performRowAction(component.unplacedRows[0].index);

            expect(dialogSpy.open).toHaveBeenCalled();
        });

        it('do nothing for a placement without an action', () => {
            drawPlacements([placement({ alias: 'unplaced', position: { x: null, y: null } })], true);

            component.performRowAction(0);

            expect(dialogSpy.open).not.toHaveBeenCalled();
        });
    });
});
