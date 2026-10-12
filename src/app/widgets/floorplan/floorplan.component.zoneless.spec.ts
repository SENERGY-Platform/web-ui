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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { provideAppCharts } from '../../core/charts/provide-app-charts';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceCommandModel, DeviceCommandService } from '../../core/services/device-command.service';
import { DeviceGroupsService } from '../../modules/devices/device-groups/shared/device-groups.service';
import { DeviceInstancesService } from '../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceClassesService } from '../../modules/metadata/device-classes/shared/device-classes.service';
import { ConceptsService } from '../../modules/metadata/concepts/shared/concepts.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { FloorplanComponent } from './floorplan.component';
import { characteristicTypeFloat, FloorplanWidgetCapabilityModel } from './shared/floorplan.model';

const MEASURE = 'urn:infai:ses:measuring-function:get-temperature';
const SWITCH_ON = 'urn:infai:ses:controlling-function:set-on';

const criteria = (functionId: string) => ({ function_id: functionId, aspect_id: '', device_class_id: '', interaction: '' });

// The component is OnPush and runs without zone.js here: every repaint after the first one must come from a signal
// the template reads, so the async parts below never call fixture.detectChanges().
describe('FloorplanComponent without zone.js', () => {
    let fixture: ComponentFixture<FloorplanComponent>;
    let element: HTMLElement;
    let reads: Subject<{ status_code: number; message: unknown }[]>[];
    let sent: DeviceCommandModel[][];
    const dialogSpy = createSpyFromClass<MatDialog>(MatDialog);
    const commandSpy = createSpyFromClass<DeviceCommandService>(DeviceCommandService);
    const deviceGroupsSpy = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const conceptsSpy = createSpyFromClass<ConceptsService>(ConceptsService);
    const classesSpy = createSpyFromClass<DeviceClassesService>(DeviceClassesService);

    const widget = (placements: FloorplanWidgetCapabilityModel[]) => ({
        id: 'widgetId',
        name: 'widget',
        type: 'floorplan',
        properties: { floorplan: { image: null, dotSize: 10, placements, showUnplacedTable: true } },
    } as unknown as WidgetModel);

    const unplaced = (overwrite: Partial<FloorplanWidgetCapabilityModel>): FloorplanWidgetCapabilityModel => ({
        alias: 'Boiler',
        deviceGroupId: 'deviceGroupId',
        criteria: criteria(MEASURE),
        position: { x: null, y: null },
        coloring: [{ value: 0, icon: 'thermostat', color: '#ff0000', showValue: true, showValueWhenZoomed: true }],
        valueLow: null,
        valueHigh: null,
        colorLow: null,
        colorHigh: null,
        ...overwrite,
    });

    /** answers the next read of the device values, the way the backend does after a delay */
    const answerRead = async (value: number) => {
        const read = reads[reads.length - 1];
        read.next([{ status_code: 200, message: value }]);
        read.complete();
        await fixture.whenStable();
    };

    const render = async (placements: FloorplanWidgetCapabilityModel[]) => {
        fixture = TestBed.createComponent(FloorplanComponent);
        fixture.componentRef.setInput('widget', widget(placements));
        element = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    };

    const valueCell = () => element.querySelector('.unplaced-value')?.textContent?.trim();

    beforeEach(() => {
        reads = [];
        sent = [];
        commandSpy.runCommands.calls.reset();
        commandSpy.runCommands.and.callFake((commands: DeviceCommandModel[]) => {
            sent.push(commands);
            if (commands[0].function_id === SWITCH_ON) {
                return of([{ status_code: 200, message: null }]);
            }
            const read = new Subject<{ status_code: number; message: unknown }[]>();
            reads.push(read);
            return read;
        });
        deviceGroupsSpy.getAspectListByIds.and.returnValue(of([]));
        deviceGroupsSpy.getDeviceGroupListByIds.and.returnValue(of([
            { id: 'deviceGroupId', device_ids: [], criteria: [criteria(MEASURE), criteria(SWITCH_ON)] },
        ] as never));
        deviceGroupsSpy.getFunctionListByIds.and.returnValue(of([
            { id: MEASURE, name: 'Get Temperature', display_name: '', description: '', rdf_type: '', concept_id: 'temperature' },
            { id: SWITCH_ON, name: 'Set On', display_name: 'Switch on', description: '', rdf_type: '', concept_id: '' },
        ]));
        conceptsSpy.getConceptsWithCharacteristics.and.returnValue(of({
            result: [{
                id: 'temperature', name: 'Temperature', base_characteristic_id: 'celsius', characteristics: [
                    { id: 'celsius', name: 'Celsius', display_unit: '°C', type: characteristicTypeFloat, min_value: 5, max_value: 30 },
                ],
            }],
            total: 1,
        } as never));
        classesSpy.getDeviceClasses.and.returnValue(of({ result: [], total: 0 } as never));
        TestBed.configureTestingModule({
            imports: [FloorplanComponent],
            providers: [
                provideZonelessChangeDetection(),
                provideAppCharts(),
                { provide: MatDialog, useValue: dialogSpy },
                { provide: DashboardService, useValue: { initWidgetObservable: new Subject<string>(), manipulateWidget: () => undefined } },
                { provide: DeviceCommandService, useValue: commandSpy },
                { provide: DeviceGroupsService, useValue: deviceGroupsSpy },
                { provide: ConceptsService, useValue: conceptsSpy },
                { provide: DeviceClassesService, useValue: classesSpy },
                { provide: DeviceInstancesService, useValue: createSpyFromClass<DeviceInstancesService>(DeviceInstancesService) },
            ],
        });
    });

    it('shows the spinner until the first values are drawn, then the value that arrives asynchronously', async () => {
        await render([unplaced({})]);

        expect(element.querySelector('senergy-widget-spinner')).not.toBeNull();
        expect(element.querySelector('.unplaced-value')).toBeNull();

        await answerRead(21);

        expect(valueCell()).toBe('21 °C');
    });

    it('draws the next reading over the shown one', async () => {
        await render([unplaced({})]);
        await answerRead(21);

        fixture.componentInstance['refresh']().subscribe();
        await answerRead(23);

        expect(valueCell()).toBe('23 °C');
    });

    it('shows the result of a control click after the command and the refresh behind it', async () => {
        await render([unplaced({ tooltipCriteria: [criteria(SWITCH_ON)] })]);
        await answerRead(21);
        const button = element.querySelector<HTMLButtonElement>('.unplaced-action button');
        expect(button).not.toBeNull();

        button?.click();
        // the device gets a moment before the state is read again
        await new Promise(resolve => setTimeout(resolve, 800));
        expect(sent[sent.length - 1].map(c => c.function_id)).toContain(MEASURE);
        await answerRead(25);

        expect(sent.some(c => c[0].function_id === SWITCH_ON)).toBeTrue();
        expect(valueCell()).toBe('25 °C');
    });

    it('clears the busy flag once the values are drawn', async () => {
        await render([unplaced({})]);
        const busy = () => fixture.debugElement.componentInstance.refreshing();

        expect(busy()).toBeTrue();
        await answerRead(21);

        expect(busy()).toBeFalse();
    });

    describe('tooltip', () => {
        const hover = () => {
            const options = fixture.componentInstance.chartjs.options?.plugins?.tooltip as any;
            options.callbacks.afterBody([{ datasetIndex: 0, formattedValue: '21', dataset: { label: 'Boiler' }, raw: { x: 1 } }]);
            options.external({
                chart: { canvas: { offsetTop: 0, offsetLeft: 0, offsetHeight: 300 }, width: 300 },
                tooltip: { dataPoints: [{ datasetIndex: 0 }], title: [], caretX: 50, caretY: 50, labelColors: [{ backgroundColor: '#f00' }], opacity: 1 },
            });
        };
        const tooltip = () => element.querySelector<HTMLElement>('#chartjs-tooltip');

        it('appears when chart.js reports a hovered dot and closes with its button', async () => {
            await render([unplaced({})]);
            await answerRead(21);
            element.querySelector('mat-card')?.dispatchEvent(new MouseEvent('mouseenter'));
            await fixture.whenStable();
            expect(tooltip()).toBeNull();

            hover();
            await fixture.whenStable();

            expect(tooltip()?.textContent).toContain('Boiler');
            expect(tooltip()?.style.display).toBe('initial');

            tooltip()?.querySelector<HTMLButtonElement>('button')?.click();
            await fixture.whenStable();

            expect(tooltip()?.style.display).toBe('none');
        });
    });
});
