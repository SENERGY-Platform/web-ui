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
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportPropertiesModel, ChartsExportVAxesModel } from './charts-export-properties.model';
import {
    chartsExportChart,
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

        // SNRGY-4848 item 12: by operator precedence an unmatched string without default used to become undefined.
        it('keeps an unmatched string without conversionDefault, replaces it with one', () => {
            const without = table([[[[t1, 'on']]]], { chartType: 'LineChart', vAxes: [axis('state', { valueType: 'string', conversions: [] })] });
            const withDefault = table([[[[t1, 'on']]]], { chartType: 'LineChart', vAxes: [axis('state', { valueType: 'string', conversions: [], conversionDefault: 'x' as any })] });
            expect(without.table.data[1] as any[]).toEqual([d(t1), 'on']);
            expect(withDefault.table.data[1] as any[]).toEqual([d(t1), 'x']);
        });
    });

    describe('PieChart', () => {
        it('turns the last value of every series into a slice named after it', () => {
            const result = table([[[[t2, 3]]], [[[t1, 7]]]], { chartType: 'PieChart', vAxes: [axis('a'), axis('b')] });
            expect(result.table.data).toEqual([['', ''], ['a', 3], ['b', 7]]);
        });

        // SNRGY-4848 item 12: slices were taken per row, so series sharing their last timestamp collapsed into the first one.
        it('keeps a slice per series when all last values share a timestamp', () => {
            const result = table([[[[t1, 3]]], [[[t1, 7]]]], { chartType: 'PieChart', vAxes: [axis('a'), axis('b')] });
            expect(result.table.data).toEqual([['', ''], ['a', 3], ['b', 7]]);
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

describe('chartsExportTable of a ColumnChart', () => {
    const devices = new Map<string, DeviceInstanceWithDeviceTypeModel>(['d1', 'd2', 'd3', 'd4', 'dev-A', 'dev-B'].map(id => [id, { id, name: 'name of ' + id, display_name: 'Device ' + id, device_type: { services: [] } } as unknown as DeviceInstanceWithDeviceTypeModel]));
    // monthly buckets at local midnight, whatever zone the spec runs in
    const t = (month: number, year = 2026) => new Date(year, month - 1, 1).toISOString();
    const dev = (...ids: string[]) => ids.map(deviceId => ({ deviceId }));
    const separate = (alias: string) => axis(alias, { deviceGroupId: 'group-' + alias, deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Separate });
    const column = (data: any[][][][], vAxes: ChartsExportVAxesModel[], metadata: any[][], extra: Partial<ChartsExportPropertiesModel> = {}, groupInterval = '1months') =>
        chartsExportTable(data, { chartType: 'ColumnChart', vAxes, ...extra } as any, metadata, devices, groupInterval);
    const values = (result: { table: { data: any[][] } }): any[][] => result.table.data.slice(1).map(r => [(r[0] as Date).toISOString(), ...r.slice(1)]);
    const byTime = (rows: any[][]) => rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    it('drops the column of an axis without data and names the axis of the remaining one', () => {
        const result = column([[[]], [[[t(10), 5]]]], [axis('A'), axis('B')], [dev('dev-A'), dev('dev-B')]);
        expect(result.table.data[0]).toEqual(['time', 'B']);
        expect(values(result)).toEqual([[t(10), 5]]);
        expect(result.columnAxes).toEqual([1]);
    });

    it('splits a separate group axis into one column per device and names the axis of each', () => {
        const result = column([[[[t(10), 1]], [[t(10), 2]]], [[[t(10), 3]]]], [separate('G'), axis('B')], [dev('d1', 'd2'), dev('dev-B')]);
        expect(result.table.data[0]).toEqual(['time', 'G - Device d1', 'G - Device d2', 'B']);
        expect(values(result)).toEqual([[t(10), 1, 2, 3]]);
        expect(result.columnAxes).toEqual([0, 0, 1]);
    });

    it('keeps every device on its own values when an earlier device reported only nulls', () => {
        const result = column([[[[t(10), null]], [[t(10), 2]], [[t(10), 3]], [[t(9), 4]]]], [separate('G')], [dev('d1', 'd2', 'd3', 'd4')]);
        expect(result.table.data[0]).toEqual(['time', 'G - Device d2', 'G - Device d3', 'G - Device d4']);
        expect(byTime(values(result))).toEqual([[t(9), null, null, 4], [t(10), 2, 3, null]]);
    });

    it('keeps every device on its own values after an axis that reported only nulls', () => {
        const result = column([[[[t(10), null]]], [[[t(10), 1]], [[t(10), 2]], [[t(10), 3]]]], [axis('A'), separate('G')], [dev('dev-A'), dev('d1', 'd2', 'd3')]);
        expect(values(result)).toEqual([[t(10), 1, 2, 3]]);
    });

    it('names the devices of a separate group axis that follows another axis', () => {
        const result = column([[[[t(10), 5]]], [[[t(10), 1]], [[t(10), 2]]]], [axis('A'), separate('G')], [dev('dev-A'), dev('d1', 'd2')]);
        expect(result.table.data[0]).toEqual(['time', 'A', 'G - Device d1', 'G - Device d2']);
    });

    describe('with break', () => {
        const data = [[[[t(10), 1], [t(10, 2025), 2]]], [[[t(10), 3], [t(10, 2025), 4]]]];
        const broken = () => column(data, [axis('A'), axis('B')], [dev('dev-A'), dev('dev-B')], { break: true });

        it('adds a column per earlier year and sorts the columns by name, descending', () => {
            const result = broken();
            expect(result.table.data[0]).toEqual(['time', 'B -1y', 'B', 'A -1y', 'A']);
            expect(values(result)).toEqual([[t(10), undefined, 3, undefined, 1], [t(10), 4, null, 2, null]]);
        });

        it('keeps the source axis with every column through the sort', () => {
            expect(broken().columnAxes).toEqual([1, 1, 0, 0]);
        });
    });
});

describe('chartsExportChart', () => {
    function widget(properties: ChartsExportPropertiesModel): WidgetModel {
        return { id: 'w', name: '', type: '', properties } as WidgetModel;
    }

    it('defaults to a line chart and passes axis titles and format through', () => {
        const chart = chartsExportChart(widget({ vAxes: [axis('a')], hAxisLabel: 'Zeit', vAxisLabel: 'kWh', hAxisFormat: 'dd.MM.' }), new ChartDataTableModel([['time', 'a']]));
        expect(chart.chartType).toBe('LineChart');
        expect([chart.hAxisLabel, chart.vAxisLabel, chart.hAxisFormat]).toEqual(['Zeit', 'kWh', 'dd.MM.']);
        expect(chart.colors).toEqual(['#4484ce']);
    });

    it('prefers the zoomed axis format over the configured one', () => {
        expect(chartsExportChart(widget({ vAxes: [axis('a')], hAxisFormat: 'dd.MM.' }), new ChartDataTableModel([['time', 'a']]), undefined, 'HH').hAxisFormat).toBe('HH');
    });

    it('drops the colours of series missing from the table', () => {
        const chart = chartsExportChart(widget({ chartType: 'LineChart', vAxes: [axis('a', { color: '#111111' }), axis('b', { color: '#222222' })] }), new ChartDataTableModel([['time', 'b']]));
        expect(chart.colors).toEqual(['#222222']);
    });

    it('puts series marked for it on the second axis with its title', () => {
        const chart = chartsExportChart(widget({ vAxes: [axis('a'), axis('b', { displayOnSecondVAxis: true })], secondVAxisLabel: '%' }), new ChartDataTableModel([['time', 'a', 'b']]));
        expect(chart.secondVAxisLabel).toBe('%');
        expect(chart.secondAxis).toEqual([false, true]);
    });

    it('shows every slice of a pie with up to four, else hides those under half a degree', () => {
        const small = chartsExportChart(widget({ chartType: 'PieChart', vAxes: [axis('a')] }), new ChartDataTableModel([['', ''], ['a', 1], ['b', 2], ['c', 3], ['d', 4]]));
        const large = chartsExportChart(widget({ chartType: 'PieChart', vAxes: [axis('a')] }), new ChartDataTableModel([['', ''], ['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]]));
        expect(small.sliceThreshold).toBe(0);
        expect(large.sliceThreshold).toBeUndefined();
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
