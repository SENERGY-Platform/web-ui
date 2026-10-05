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

import { ChartDataTableModel } from '../../../../core/model/chart/chart-data-table.model';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { DeviceInstanceWithDeviceTypeModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportPropertiesModel, ChartsExportVAxesModel } from './charts-export-properties.model';
import {
    chartsExportModel,
    chartsExportTable,
    createThemeColorVariation,
    getStableStringHash,
    themeColorsForTitles,
} from './charts-export-table';

const noDevices = new Map<string, DeviceInstanceWithDeviceTypeModel>();
const t1 = '2026-10-05T08:00:00Z';
const t2 = '2026-10-05T09:00:00Z';
const t3 = '2026-10-05T10:00:00Z';
const t4 = '2026-10-05T11:00:00Z';
const d = (iso: string) => new Date(iso);

function axis(valueName: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel {
    return { exportName: 'e', valueName, valueType: 'float', math: '', color: '', ...extra };
}

function table(data: any[][][][], properties: ChartsExportPropertiesModel, groupInterval?: string, metadata: any[][] = [], devices = noDevices) {
    return chartsExportTable(data, properties as any, metadata, devices, groupInterval);
}

describe('chartsExportTable', () => {
    it('labels each series by alias or value name and merges the series per timestamp', () => {
        const result = table(
            [[[[t2, 1], [t1, 2]]], [[[t2, 10], [t1, 20]]]],
            { chartType: 'LineChart', vAxes: [axis('temp', { valueAlias: 'Temperature', color: '#ff0000' }), axis('hum')] },
        );
        expect(result.table.data).toEqual([
            ['time', 'Temperature', 'hum'],
            [d(t2), 1, 10],
            [d(t1), 2, 20],
        ]);
        expect(result.colors).toEqual(['#ff0000', '#4484ce']);
    });

    it('fills the timestamps a series has no value for with null', () => {
        const result = table(
            [[[[t2, 1]]], [[[t1, 20]]]],
            { chartType: 'LineChart', vAxes: [axis('a'), axis('b')] },
        );
        expect(result.table.data).toEqual([['time', 'a', 'b'], [d(t2), 1, null], [d(t1), null, 20]]);
    });

    it('keeps the rows of a single series as they come, skipping missing values', () => {
        const result = table([[[[t3, 3], [t2, null], [t1, 1]]]], { chartType: 'LineChart', vAxes: [axis('a')] });
        expect(result.table.data).toEqual([['time', 'a'], [d(t3), 3], [d(t1), 1]]);
    });

    it('drops a series without any value together with its colour', () => {
        const result = table([[[]], [[[t1, 5]]]], { chartType: 'LineChart', vAxes: [axis('a', { color: '#111111' }), axis('b', { color: '#222222' })] });
        expect(result.table.data).toEqual([['time', 'b'], [d(t1), 5]]);
        expect(result.colors).toEqual(['#222222']);
    });

    it('names the series of a device group by device when one axis returns several', () => {
        const devices = new Map<string, DeviceInstanceWithDeviceTypeModel>([
            ['dev-1', { display_name: 'Kitchen' } as DeviceInstanceWithDeviceTypeModel],
            ['dev-2', { name: 'Hall' } as DeviceInstanceWithDeviceTypeModel],
        ]);
        const result = table(
            [[[[t1, 1]], [[t1, 2]]]],
            { chartType: 'LineChart', vAxes: [axis('temp', { valueAlias: 'Temp' })] },
            undefined,
            [[{ deviceId: 'dev-1' }, { deviceId: 'dev-2' }]],
            devices,
        );
        expect(result.table.data[0]).toEqual(['time', 'Temp - Kitchen', 'Temp - Hall']);
    });

    describe('conversions', () => {
        it('converts a value matching a rule, comparing rule.from also parsed as JSON', () => {
            const result = table([[[[t1, true], [t2, false]]]], {
                chartType: 'LineChart',
                vAxes: [axis('open', { valueType: 'boolean', conversions: [{ from: 'true', to: '1' }, { from: false, to: 'shut' }] })],
            });
            expect(result.table.data.slice(1)).toEqual([[d(t1), 1], [d(t2), 'shut']]);
        });

        it('falls back to conversionDefault for an unmatched boolean, keeps it without default', () => {
            const withDefault = table([[[[t1, true]]]], { chartType: 'LineChart', vAxes: [axis('open', { valueType: 'boolean', conversions: [], conversionDefault: 0 })] });
            const without = table([[[[t1, true]]]], { chartType: 'LineChart', vAxes: [axis('open', { valueType: 'boolean', conversions: [] })] });
            expect(withDefault.table.data[1]).toEqual([d(t1), 0]);
            expect(without.table.data[1] as any[]).toEqual([d(t1), true]);
        });

        // `type === 'string' || type === 'boolean' && default !== undefined` binds as string || (boolean && default).
        it('replaces an unmatched string by conversionDefault even when there is none', () => {
            const result = table([[[[t1, 'on']]]], { chartType: 'LineChart', vAxes: [axis('state', { valueType: 'string', conversions: [] })] });
            expect(result.table.data[1] as any[]).toEqual([d(t1), undefined]);
        });
    });

    describe('PieChart', () => {
        it('turns the last value of every series into a slice named after it', () => {
            const result = table([[[[t2, 3]]], [[[t1, 7]]]], { chartType: 'PieChart', vAxes: [axis('a'), axis('b')] });
            expect(result.table.data).toEqual([['', ''], ['a', 3], ['b', 7]]);
        });

        // Slices are taken per row, so series sharing their last timestamp collapse into the first one.
        it('shows only the first series when all last values share a timestamp', () => {
            const result = table([[[[t1, 3]]], [[[t1, 7]]]], { chartType: 'PieChart', vAxes: [axis('a'), axis('b')] });
            expect(result.table.data).toEqual([['', ''], ['a', 3]]);
        });

        it('sums the duration of every value with calculateIntervals', () => {
            const conversions = [{ from: 'o', to: 'open', color: '#00ff00' }, { from: 'c', to: 'closed', color: '#ff0000' }];
            const result = table([[[[t4, 'o'], [t3, 'o'], [t2, 'c'], [t1, 'c']]]], {
                chartType: 'PieChart', calculateIntervals: true, vAxes: [axis('door', { valueType: 'string', conversions })],
            });
            const hour = 3600000;
            expect(result.table.data).toEqual([['', ''], ['open', 2 * hour], ['closed', hour]]);
            expect(result.colors).toEqual(['#00ff00', '#ff0000']);
        });
    });

    describe('Timeline', () => {
        it('turns every run of a value into a bar [row, value, start, end], coloured by its conversion', () => {
            const conversions = [{ from: 'o', to: 'open', color: '#00ff00' }, { from: 'c', to: 'closed', color: '#ff0000' }];
            const result = table([[[[t4, 'o'], [t3, 'o'], [t2, 'c'], [t1, 'c']]]], {
                chartType: 'Timeline', vAxes: [axis('door', { valueType: 'string', valueAlias: 'Door', conversions })],
            });
            expect(result.table.data).toEqual([
                ['', '', '', ''],
                ['Door', 'open', d(t2), d(t4)],
                ['Door', 'closed', d(t1), d(t2)],
            ]);
            expect(result.colors).toEqual(['#4484ce', '#00ff00', '#ff0000']);
        });
    });

    describe('ColumnChart with break', () => {
        // local wall-clock times, the split works on local calendar fields
        const day2 = new Date(2026, 9, 5, 10).toISOString();
        const day1 = new Date(2026, 9, 4, 10).toISOString();

        it('moves older days into faded columns named "-1d" etc., sorted by name descending', () => {
            const result = table([[[[day2, 1], [day1, 2]]]], { chartType: 'ColumnChart', break: true, vAxes: [axis('Temp')] }, '1h');
            expect(result.table.data as any[][]).toEqual([
                ['time', 'Temp -1d', 'Temp'],
                [new Date(day2), undefined, 1],
                [new Date(day2), 2, null],
            ]);
            expect((result.colors || []).map((c) => c.toLowerCase())).toEqual(['#4484ce80', '#4484ce']);
        });

        it('does not split without group interval or with disableBreaking', () => {
            const props: ChartsExportPropertiesModel = { chartType: 'ColumnChart', break: true, vAxes: [axis('Temp')] };
            expect(table([[[[day2, 1], [day1, 2]]]], props).table.data[0]).toEqual(['time', 'Temp']);
            expect(chartsExportTable([[[[day2, 1], [day1, 2]]]], props as any, [], noDevices, '1h', true).table.data[0]).toEqual(['time', 'Temp']);
        });
    });
});

describe('chartsExportModel (Google)', () => {
    const element = { width: 400, height: 300, widthPercentage: '90%', heightPercentage: '90%' };

    function widget(properties: ChartsExportPropertiesModel): WidgetModel {
        return { id: 'w', name: '', type: '', properties } as WidgetModel;
    }

    it('defaults to a line chart and passes axis titles and format through', () => {
        const model = chartsExportModel(widget({ vAxes: [axis('a')], hAxisLabel: 'Zeit', vAxisLabel: 'kWh', hAxisFormat: 'dd.MM.' }), new ChartDataTableModel([['time', 'a']]), element);
        expect(model.chartType).toBe('LineChart');
        expect(model.options?.hAxis?.title).toBe('Zeit');
        expect(model.options?.hAxis?.format).toBe('dd.MM.');
        expect(model.options?.vAxes?.[0]?.title).toBe('kWh');
        expect(model.options?.colors).toEqual(['#4484ce']);
    });

    it('prefers the zoomed axis format over the configured one', () => {
        const model = chartsExportModel(widget({ vAxes: [axis('a')], hAxisFormat: 'dd.MM.' }), new ChartDataTableModel([['time', 'a']]), element, undefined, 'HH');
        expect(model.options?.hAxis?.format).toBe('HH');
    });

    it('drops the colours of series missing from the table', () => {
        const model = chartsExportModel(
            widget({ chartType: 'LineChart', vAxes: [axis('a', { color: '#111111' }), axis('b', { color: '#222222' })] }),
            new ChartDataTableModel([['time', 'b']]), element,
        );
        expect(model.options?.colors).toEqual(['#222222']);
    });

    it('puts series marked for it on the second axis', () => {
        const model = chartsExportModel(
            widget({ vAxes: [axis('a'), axis('b', { displayOnSecondVAxis: true })], secondVAxisLabel: '%' }),
            new ChartDataTableModel([['time', 'a', 'b']]), element,
        );
        expect(model.options?.vAxes?.[1]?.title).toBe('%');
        expect(model.options?.series).toEqual({ 0: { targetAxisIndex: 0 }, 1: { targetAxisIndex: 1 } });
    });

    it('starts the value axis of a column chart at 0 only without negative values', () => {
        const positive = chartsExportModel(widget({ chartType: 'ColumnChart', vAxes: [axis('a')] }), new ChartDataTableModel([['time', 'a'], [d(t1), 2]]), element);
        const negative = chartsExportModel(widget({ chartType: 'ColumnChart', vAxes: [axis('a')] }), new ChartDataTableModel([['time', 'a'], [d(t1), -2]]), element);
        expect(positive.options?.vAxis?.viewWindow?.min).toBe(0);
        expect(negative.options?.vAxis?.viewWindow?.min).toBeUndefined();
    });
});

describe('theme colours', () => {
    it('hashes titles stably', () => {
        expect(getStableStringHash('')).toBe(0);
        expect(getStableStringHash('a')).toBe(97);
        expect(getStableStringHash('ab')).toBe(3105);
    });

    it('picks the palette entry by hash and varies it beyond the palette', () => {
        // hash('a') = 97 = 32 * 3 + 1: palette entry 1, variation level 32
        expect(themeColorsForTitles(['', 'a'], ['#4484ce', '#ff0000', '#00ff00'])).toEqual(['#4484ce', createThemeColorVariation('#ff0000', 32)]);
        expect(createThemeColorVariation('#ff0000', 32)).not.toBe('#ff0000');
    });

    it('lightens odd and darkens even variation levels in growing steps', () => {
        expect(createThemeColorVariation('#4484ce', 0)).toBe('#4484ce');
        expect(createThemeColorVariation('#4484ce', 1)).toBe('#558FD3');
        expect(createThemeColorVariation('#4484ce', 2)).toBe('#3479C8');
        expect(createThemeColorVariation('#4484ce', 3)).toBe('#679BD7');
    });

    it('keeps the base colour when the variation would come out near white or black', () => {
        expect(createThemeColorVariation('#eeeeee', 1)).toBe('#eeeeee');
    });
});
