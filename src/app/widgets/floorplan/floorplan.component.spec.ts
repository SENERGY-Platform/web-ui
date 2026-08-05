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
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { DeviceGroupCriteriaModel } from '../../modules/devices/device-groups/shared/device-groups.model';
import { DeviceTypeFunctionModel } from '../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceCommandModel, DeviceCommandService } from '../../core/services/device-command.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceGroupsService } from '../../modules/devices/device-groups/shared/device-groups.service';
import { DeviceInstancesService } from '../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceClassesService } from '../../modules/metadata/device-classes/shared/device-classes.service';
import { ConceptsService } from '../../modules/metadata/concepts/shared/concepts.service';
import { FloorplanComponent } from './floorplan.component';
import {
    characteristicTypeFloat,
    DeviceGroupWithValueModel,
    FloorplanControlInput,
    FloorplanWidgetCapabilityModel,
    fpCriteriaConnectionStatus,
} from './shared/floorplan.model';

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
    const commandSpy: Spy<DeviceCommandService> = createSpyFromClass<DeviceCommandService>(DeviceCommandService);
    const deviceGroupsSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const conceptsSpy: Spy<ConceptsService> = createSpyFromClass<ConceptsService>(ConceptsService);

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FloorplanComponent],
            providers: [
                { provide: MatDialog, useValue: dialogSpy },
                { provide: DashboardService, useValue: createSpyFromClass<DashboardService>(DashboardService) },
                { provide: DeviceCommandService, useValue: commandSpy },
                { provide: DeviceGroupsService, useValue: deviceGroupsSpy },
                { provide: ConceptsService, useValue: conceptsSpy },
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

    describe('tooltip', () => {
        const external = (context: any) => {
            const handler = component.chartjs.options?.plugins?.tooltip?.external as unknown as (c: any) => void;
            handler(context);
        };

        const hovering = (datasetIndex: number) => ({
            chart: { canvas: { offsetTop: 0, offsetLeft: 0, offsetHeight: 300 }, width: 300 },
            tooltip: { dataPoints: [{ datasetIndex }], title: [], caretX: 50, caretY: 50, labelColors: [{}], opacity: 1 },
        });

        /** chart.js reports an empty tooltip once the pointer is no longer on a dot */
        const cleared = () => ({
            chart: { canvas: { offsetTop: 0, offsetLeft: 0, offsetHeight: 300 }, width: 300 },
            tooltip: { dataPoints: [], title: [], caretX: 0, caretY: 0, labelColors: [], opacity: 0 },
        });

        beforeEach(() => drawPlacements([placement({ alias: 'Kitchen' })]));

        it('names the hovered placement', () => {
            external(hovering(0));

            expect(component.chartjs.tooltipContext?.tooltip.title).toEqual(['Kitchen']);
        });

        it('keeps the tooltip once the pointer moves onto it, instead of flickering', () => {
            // taking over the cleared tooltip would empty it, give the pointer back to the dot below and
            // show it again, over and over
            external(hovering(0));
            const shown = component.chartjs.tooltipContext;

            external(cleared());

            expect(component.chartjs.tooltipContext).toBe(shown);
            expect(component.chartjs.tooltipContext?.tooltip.title).toEqual(['Kitchen']);
            expect(component.chartjs.tooltipDisplay).toBe('initial');
        });

        it('is hidden when the pointer leaves the widget', () => {
            external(hovering(0));

            component.forbidChartjsTooltip();

            expect(component.chartjs.tooltipDisplay).toBe('none');
        });
    });

    describe('function info', () => {
        const getTemperature = 'urn:infai:ses:measuring-function:get-temperature';
        const setTemperature = 'urn:infai:ses:controlling-function:set-temperature';

        const withPlacements = (placements: FloorplanWidgetCapabilityModel[]) => {
            component.widget = {
                id: 'widgetId', name: 'widget', type: 'floorplan',
                properties: { floorplan: { image: null, dotSize: 10, placements } },
            } as WidgetModel;
            component.deviceGroups = [];
        };

        beforeEach(() => {
            component.functionIdToUnit.clear();
            component.functionIdToCharacteristic.clear();
            deviceGroupsSpy.getFunctionListByIds.calls.reset();
            deviceGroupsSpy.getFunctionListByIds.and.returnValue(of([
                { id: getTemperature, name: 'Get Temperature', display_name: '', description: '', rdf_type: '', concept_id: 'temperature' },
            ]));
            conceptsSpy.getConceptsWithCharacteristics.and.returnValue(of({
                result: [{
                    id: 'temperature', name: 'Temperature', base_characteristic_id: 'celsius', characteristics: [
                        { id: 'celsius', name: 'Celsius', display_unit: '°C', type: characteristicTypeFloat, min_value: 5, max_value: 30 },
                    ],
                }],
                total: 1,
            }));
        });

        it('does not ask the repository for the connection status, which is no real function', () => {
            // a rejected query would leave every function unresolved and show raw ids everywhere
            withPlacements([placement({
                criteria: { function_id: fpCriteriaConnectionStatus, aspect_id: '', device_class_id: '', interaction: '' },
                tooltipCriteria: [{ function_id: getTemperature, aspect_id: '', device_class_id: '', interaction: '' }],
            })]);

            component.loadMissingFunctionInfo().subscribe();

            expect(deviceGroupsSpy.getFunctionListByIds.calls.first().args[0]).toEqual([getTemperature]);
        });

        it('asks for the controlling criteria selected for a placement', () => {
            withPlacements([placement({
                tooltipCriteria: [{ function_id: setTemperature, aspect_id: '', device_class_id: '', interaction: '' }],
            })]);

            component.loadMissingFunctionInfo().subscribe();

            expect(deviceGroupsSpy.getFunctionListByIds.calls.first().args[0]).toContain(setTemperature);
        });

        it('asks for every function only once', () => {
            withPlacements([placement({
                criteria: { function_id: getTemperature, aspect_id: '', device_class_id: '', interaction: '' },
                tooltipCriteria: [{ function_id: getTemperature, aspect_id: 'air', device_class_id: '', interaction: '' }],
            })]);

            component.loadMissingFunctionInfo().subscribe();

            expect(deviceGroupsSpy.getFunctionListByIds.calls.first().args[0]).toEqual([getTemperature]);
        });

        it('does not ask again for a function the repository does not know', () => {
            withPlacements([placement({
                criteria: { function_id: setTemperature, aspect_id: '', device_class_id: '', interaction: '' },
            })]);

            component.loadMissingFunctionInfo().subscribe();
            component.loadMissingFunctionInfo().subscribe();

            expect(deviceGroupsSpy.getFunctionListByIds.calls.count()).toBe(1);
        });

        it('caches the base characteristic of the concept, which describes the input', () => {
            withPlacements([placement({
                criteria: { function_id: getTemperature, aspect_id: '', device_class_id: '', interaction: '' },
            })]);

            component.loadMissingFunctionInfo().subscribe();

            expect(component.functionIdToCharacteristic.get(getTemperature)?.max_value).toBe(30);
            expect(component.functionIdToUnit.get(getTemperature)).toBe('°C');
        });
    });

    describe('describeCriteria', () => {
        const named = (id: string, name: string, displayName: string): DeviceTypeFunctionModel =>
            ({ id, name, display_name: displayName, description: '', rdf_type: '', concept_id: '' });

        const forFunction = (functionId: string): DeviceGroupCriteriaModel =>
            ({ function_id: functionId, aspect_id: '', device_class_id: '', interaction: '' });

        it('prefers the display name of the function', () => {
            component.functions = [named('f', 'setTemperature', 'Set Temperature')];

            expect(component.describeCriteria(forFunction('f'))).toBe('Set Temperature');
        });

        it('falls back to the name when the function has no display name', () => {
            // controlling functions are not guaranteed to carry a display name
            component.functions = [named('f', 'setTemperature', '')];

            expect(component.describeCriteria(forFunction('f'))).toBe('setTemperature');
        });

        it('shows the id only when the function is unknown', () => {
            component.functions = [];

            expect(component.describeCriteria(forFunction('f'))).toBe('f');
        });
    });

    describe('controls', () => {
        const setOn = 'urn:infai:ses:controlling-function:set-on';
        const setOff = 'urn:infai:ses:controlling-function:set-off';
        const setTargetTemperature = 'urn:infai:ses:controlling-function:set-target-temperature';
        const getOnOff = 'urn:infai:ses:measuring-function:get-on-off';
        const getTargetTemperature = 'urn:infai:ses:measuring-function:get-target-temperature';

        const criteria = (functionId: string): DeviceGroupCriteriaModel =>
            ({ function_id: functionId, aspect_id: '', device_class_id: '', interaction: '' });

        const fn = (id: string, conceptId: string): DeviceTypeFunctionModel =>
            ({ id, name: id, display_name: id, description: '', rdf_type: '', concept_id: conceptId });

        /** the values a refresh read land on the criteria of the device group */
        const groupReads = (values: { functionId: string; value: any }[]) =>
            component.deviceGroups[0].criteria?.forEach(c => {
                const read = values.find(v => v.functionId === c.function_id);
                if (read !== undefined) {
                    c.value = { status_code: 200, message: read.value };
                }
            });

        beforeEach(() => {
            dialogSpy.open.calls.reset();
            commandSpy.runCommands.calls.reset();
            commandSpy.runCommands.and.returnValue(of([{ status_code: 200, message: false }]));
            component.deviceGroups = [{
                id: 'deviceGroupId',
                device_ids: [],
                criteria: [criteria(getOnOff), criteria(getTargetTemperature), criteria(setOn), criteria(setOff), criteria(setTargetTemperature)],
            } as unknown as DeviceGroupWithValueModel];
            component.functions = [
                fn(getOnOff, ''),
                fn(setOn, ''),
                fn(setOff, ''),
                fn(getTargetTemperature, 'temperature'),
                fn(setTargetTemperature, 'temperature'),
            ];
            // the real ids come from the environment, which only holds placeholders outside a deployment
            component.voidTogglePairs = [{ state: getOnOff, on: setOn, off: setOff }];
            component.functionIdToCharacteristic.set(setOn, undefined);
            component.functionIdToCharacteristic.set(setOff, undefined);
            component.functionIdToCharacteristic.set(setTargetTemperature, {
                name: 'Celsius', display_unit: '°C', type: characteristicTypeFloat, min_value: 5, max_value: 30,
            });
            // keeps refresh() from reloading the function info
            [getOnOff, setOn, setOff, getTargetTemperature, setTargetTemperature, 'function']
                .forEach(id => component.functionIdToUnit.set(id, ''));
        });

        it('offers a slider for a clamped controlling criteria selected for the placement', () => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setTargetTemperature)] })]);

            expect(component.controls[0].length).toBe(1);
            expect(component.controls[0][0].input).toBe(FloorplanControlInput.Slider);
            expect(component.controls[0][0].characteristic?.max_value).toBe(30);
        });

        it('offers a plain button for a controlling criteria without an input', () => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn)] })]);

            expect(component.controls[0][0].input).toBe(FloorplanControlInput.Action);
        });

        it('merges a selected set on and set off into a single switch', () => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn), criteria(setOff)] })]);

            expect(component.controls[0].length).toBe(1);
            expect(component.controls[0][0].input).toBe(FloorplanControlInput.Toggle);
            expect(component.controls[0][0].offCriteria?.function_id).toBe(setOff);
        });

        it('takes the state of the switch from the on off function of the group', () => {
            groupReads([{ functionId: getOnOff, value: [true, true] }]);

            drawPlacements([placement({ tooltipCriteria: [criteria(setOn), criteria(setOff)] })]);

            expect(component.controls[0][0].state).toBeTrue();
        });

        it('takes the state of a slider from the measuring function of the same concept', () => {
            // a curtain set to 22% shows 22% on its control, without that function being configured
            groupReads([{ functionId: getTargetTemperature, value: 21.5 }]);

            drawPlacements([placement({ tooltipCriteria: [criteria(setTargetTemperature)] })]);

            expect(component.controls[0][0].state).toBe(21.5);
        });

        it('has no state while the value could not be read', () => {
            component.deviceGroups[0].criteria?.forEach(c => {
                if (c.function_id === getTargetTemperature) {
                    c.value = { status_code: 500 };
                }
            });

            drawPlacements([placement({ tooltipCriteria: [criteria(setTargetTemperature)] })]);

            expect(component.controls[0][0].state).toBeUndefined();
        });

        it('takes the state of a control from the measurement it is reached through', () => {
            // the value in the tooltip and the value on the control have to be the same number
            drawPlacements([placement({
                criteria: { ...criteria(getTargetTemperature), value: { status_code: 200, message: [100] } },
            })]);

            const control = component.controls[0][0];
            expect(control.criteria.function_id).toBe(setTargetTemperature);
            expect(control.via?.function_id).toBe(getTargetTemperature);
            expect(control.state).toBe(100);
        });

        it('operates the control of a displayed measurement through its value, not through a row of its own', () => {
            drawPlacements([placement({
                criteria: { ...criteria(getTargetTemperature), value: { status_code: 200, message: [100] } },
            })], true);

            expect(component.standaloneControls(0)).toEqual([]);
            expect(component.compactControls(0)).toEqual([]);
            expect(component.linkedControl(0, criteria(getTargetTemperature))?.criteria.function_id).toBe(setTargetTemperature);
        });

        it('does not offer a control twice when it is also selected on its own', () => {
            drawPlacements([placement({
                criteria: { ...criteria(getTargetTemperature), value: { status_code: 200, message: [100] } },
                tooltipCriteria: [criteria(setTargetTemperature)],
            })]);

            expect(component.controls[0].length).toBe(1);
        });

        it('turns an on off measurement into a toggle reached through its value', () => {
            drawPlacements([placement({
                criteria: { ...criteria(getOnOff), value: { status_code: 200, message: [true] } },
            })]);

            const control = component.controls[0][0];
            expect(control.input).toBe(FloorplanControlInput.Toggle);
            expect(control.offCriteria?.function_id).toBe(setOff);
            expect(control.state).toBeTrue();
            expect(control.via?.function_id).toBe(getOnOff);
        });

        it('flips the toggle a measurement is linked to when its value is clicked', fakeAsync(() => {
            drawPlacements([placement({
                criteria: { ...criteria(getOnOff), value: { status_code: 200, message: [true] } },
            })], true);

            component.performLinkedControl(0, criteria(getOnOff));
            tick(750);

            expect(commandSpy.runCommands.calls.first().args[0][0].function_id).toBe(setOff);
        }));

        it('asks for the value in the dialog when a linked control takes one', () => {
            drawPlacements([placement({
                criteria: { ...criteria(getTargetTemperature), value: { status_code: 200, message: [100] } },
            })], true);

            component.performLinkedControl(0, criteria(getTargetTemperature));

            expect(dialogSpy.open).toHaveBeenCalled();
            expect(commandSpy.runCommands).not.toHaveBeenCalled();
        });

        it('does nothing when a measurement without a control is clicked', () => {
            drawPlacements([placement({})], true);

            component.performLinkedControl(0, criteria('function'));

            expect(dialogSpy.open).not.toHaveBeenCalled();
            expect(commandSpy.runCommands).not.toHaveBeenCalled();
        });

        it('keeps offering the related controlling function for placements configured without controls', () => {
            // placements saved before controlling criteria could be selected must keep working
            drawPlacements([placement({
                criteria: { ...criteria(getTargetTemperature), value: { status_code: 200, message: 21.5 } },
            })]);

            expect(component.controls[0].length).toBe(1);
            expect(component.controls[0][0].criteria.function_id).toBe(setTargetTemperature);
        });

        it('opens the dialog when a value has to be entered first', () => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setTargetTemperature)] })], true);

            component.performRowAction(0);

            expect(dialogSpy.open).toHaveBeenCalled();
            expect(commandSpy.runCommands).not.toHaveBeenCalled();
        });

        it('opens the dialog when more than one control is configured', () => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn), criteria(setTargetTemperature)] })], true);

            component.performRowAction(0);

            expect(dialogSpy.open).toHaveBeenCalled();
        });

        it('runs the only control of a placement without asking', fakeAsync(() => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn)] })], true);

            component.performRowAction(0);
            tick(750);

            expect(dialogSpy.open).not.toHaveBeenCalled();
            expect(commandSpy.runCommands.calls.first().args[0]).toEqual([{
                function_id: setOn, group_id: 'deviceGroupId', device_class_id: '', aspect_id: '', input: undefined,
            }]);
        }));

        it('sends the value of a control as the input of the command', fakeAsync(() => {
            drawPlacements([placement({ tooltipCriteria: [criteria(setTargetTemperature)] })], true);

            component.performControl(0, { criteria: criteria(setTargetTemperature), value: 23.5 });
            tick(750);

            expect(commandSpy.runCommands.calls.first().args[0]).toEqual([{
                function_id: setTargetTemperature, group_id: 'deviceGroupId', device_class_id: '', aspect_id: '', input: 23.5,
            }]);
        }));

        it('switches off when the merged toggle is on', fakeAsync(() => {
            groupReads([{ functionId: getOnOff, value: true }]);
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn), criteria(setOff)] })], true);

            component.performRowAction(0);
            tick(750);

            expect(commandSpy.runCommands.calls.first().args[0][0].function_id).toBe(setOff);
        }));

        it('reads the measuring function a control needs, even when it is not configured', fakeAsync(() => {
            // performing a control refreshes afterwards, which is where the read commands are built
            drawPlacements([placement({ tooltipCriteria: [criteria(setOn), criteria(setOff)] })], true);

            component.performRowAction(0);
            tick(750);

            const read = commandSpy.runCommands.calls.all()[1].args[0] as DeviceCommandModel[];
            expect(read.map(c => c.function_id)).toEqual(['function', getOnOff]);
        }));

        it('never reads a controlling criteria while refreshing', fakeAsync(() => {
            drawPlacements([placement({
                criteria: criteria(getOnOff),
                tooltipCriteria: [criteria(setOn), criteria(setOff)],
            })], true);

            component.performRowAction(0);
            tick(750);

            const read = commandSpy.runCommands.calls.all()[1].args[0] as DeviceCommandModel[];
            expect(read.map(c => c.function_id)).toEqual([getOnOff]);
        }));
    });
});
