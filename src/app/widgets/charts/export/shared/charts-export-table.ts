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

import Color from 'color';
import { ChartDataTableModel } from '../../../../core/model/chart/chart-data-table.model';
import { WidgetModel, WidgetPropertiesModels } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { DeviceInstanceWithDeviceTypeModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportVAxesModel } from './charts-export-properties.model';

export const chartsExportDefaultColor = '#4484ce';

export interface ExportMetadata {
    exportId?: string;
    deviceId?: string;
    serviceId?: string;
    columnName?: string;
}

/** A stable colour per series title: the hash picks a palette entry, collisions beyond the palette get lighter or darker variants. */
export function themeColorsForTitles(titles: string[], themePalette: string[]): string[] {
    return titles.map(title => {
        const hash = getStableStringHash(title);
        const baseColor = themePalette[hash % themePalette.length];
        const variationLevel = Math.floor(hash / themePalette.length);
        return createThemeColorVariation(baseColor, variationLevel);
    });
}

export function getRgbDistance(a: any, b: any): number {
    const [ar, ag, ab] = a.rgb().array();
    const [br, bg, bb] = b.rgb().array();
    const dr = ar - br;
    const dg = ag - bg;
    const db = ab - bb;
    return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

export function createThemeColorVariation(color: string, variationLevel: number): string {
    if (variationLevel <= 0) {
        return color;
    }
    const step = Math.floor((variationLevel - 1) / 2) + 1;
    const amount = Math.min(0.08 * step, 0.36);
    try {
        const varied = variationLevel % 2 === 1
            ? Color(color).lighten(amount)
            : Color(color).darken(amount);

        const nearExtreme = (c: any) => getRgbDistance(c, Color('#ffffff')) < 24 || getRgbDistance(c, Color('#000000')) < 24;
        if (!nearExtreme(varied)) {
            return varied.hex();
        }

        // Pull extreme variants back toward the base theme color.
        const corrected = varied.mix(Color(color), 0.7);
        return nearExtreme(corrected) ? color : corrected.hex();
    } catch (_) {
        return color;
    }
}

export function getStableStringHash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * The chart table of a charts export widget: header ['time', series labels...], one row per timestamp with
 * converted values, and one colour per series. Pie, Timeline and broken ColumnChart reshape the table.
 */
export function chartsExportTable(data: any[][][][], properties: WidgetPropertiesModels, metadata: ExportMetadata[][], devices: Map<string, DeviceInstanceWithDeviceTypeModel>, groupInterval?: string, disableBreaking = false
): {
    table: ChartDataTableModel;
    colors?: string[];
    columnAxes?: number[];
} {
    // data[] -> requests/vAxis
    // data[][] -> number of columns within request
    // data[][][] -> rows
    // data[][][][] -> values per column

    const repeats: number[] = [];
    const table: any[][] = [];
    let columns = 1; // time column
    data.forEach(s => {
        columns += s.length;
        repeats.push(s.length);
    });

    const columnHasData = Array(columns).fill(false);
    let offset = 1;
    data.forEach(req => {
        req.forEach((series, seriesIndex) => {
            series.forEach(row => {
                if (row[1] === null || row[1] === undefined) {
                    return;
                }
                const tableRow: any[] = [row[0]]; // using timestamp, duplicate timestamps are ok for Google charts
                // every series keeps its own column; columns without data are dropped below through indices
                while (offset + seriesIndex > tableRow.length) {
                    tableRow.push(null); // insert leading null column values
                }
                tableRow.push(row[1]); // actual data
                table.push(tableRow);
                columnHasData[offset + seriesIndex] = true;
            });
        });
        offset += req.length;
    });

    const maxColumns = table.reduce((longest, row) => Math.max(longest, row.length), 0);

    table.forEach(row => {
        while (row.length < maxColumns) {
            row.push(null);  // insert trailing null column values
        }
    });


    const vAxes = properties.vAxes || [];
    const indices: {
        index: number;
        conversions: { from: any; to: any }[];
        conversionDefault?: number;
        type: string;
    }[] = [];
    const header: string[] = ['time'];
    const columnAxes: number[] = [];
    let colors = getColorArray(vAxes);
    if (vAxes) {
        const colors2: string[] = [];
        vAxes.forEach((vAxis: ChartsExportVAxesModel, index) => {
            let offset2 = 0;
            for (let i = 0; i < index; i++) {
                offset2 += repeats[i];
            }
            for (let i = 0; i < repeats[index]; i++) {
                if (columnHasData[offset2 + i + 1]) {
                    indices.push({
                        index: offset2 + i + 1,
                        conversions: vAxis.conversions || [],
                        conversionDefault: vAxis.conversionDefault,
                        type: vAxis.valueType,
                    });
                    // metadata is kept per request, so the series index within the request finds it
                    const metadataIndex = i;
                    let head = vAxis.valueAlias || vAxis.valueName;

                    if (repeats[index] > 1) {
                        // distinction required
                        if (metadata.length > index && metadata[index].length > metadataIndex
                            && metadata[index][metadataIndex].deviceId !== undefined) {

                            const deviceId = metadata[index][metadataIndex].deviceId || ''; // just checked above
                            const device = devices.get(deviceId);
                            if (head.length > 0 && head != ' ') {
                                head += ' - ';
                            }
                            head += device?.display_name || device?.name;

                            if (metadata[index].filter(m => m.deviceId === deviceId).length > 1 && metadata[index][metadataIndex].serviceId !== undefined) {
                                // distinction on service level required
                                head += ' - ' + device?.device_type.services.find(s => s.id === metadata[index][metadataIndex].serviceId)?.name;

                                if (metadata[index].filter(m => m.deviceId === deviceId && m.serviceId === metadata[index][metadataIndex].serviceId).length > 1 && metadata[index][metadataIndex].columnName !== undefined) {
                                    head += ' - ' + metadata[index][metadataIndex].columnName;
                                }
                            }
                        }
                    }
                    header.push(head);
                    colors2.push(colors[index]);
                    columnAxes.push(index);
                }
            }
        });
        colors = colors2;
    }
    const dataTable = new ChartDataTableModel([header]);
    let series2: any = [];
    if (table.length > 0 && table[0].length > 2) {
        /* Grouped Column -> all values for on x tick value need to be in one list
        series = [
            ["2023-07-18T00:00:00Z", 2.7930317029043543, 5, 3]
        ]
        */
        const tmp: any = {};
        table.forEach((item: any[]) => {
            const date: string = item[0];
            item.slice(1).forEach((element, index) => {
                if (element !== null && element !== undefined) {
                    if (!tmp[date]) {
                        tmp[date] = [];
                    }
                    tmp[date][index] = element;
                }
            });
        });


        for (const [date, list] of Object.entries(tmp)) {
            series2.push([date].concat(list as any[]));
        }

    } else {
        series2 = table;
    }

    series2.forEach((item: (string | number | boolean)[]) => {
        if (item[0] === null) {
            return;
        }
        const dataPoint: (Date | number | string | null)[] = [new Date(item[0] as string)];
        indices.forEach((resp) => {
            let value = item[resp.index] as any;
            if (value === null || value === undefined) {
                dataPoint.push(null);
                return;
            }
            const matchingRule = resp.conversions.find((rule) => {
                if (rule.from === value) {
                    return true;
                }
                try {
                    const fromParsed = JSON.parse(rule.from);
                    if (fromParsed === value) {
                        return true;
                    }
                } catch (_) {
                    //  no-op
                }
                return false;
            });
            if (matchingRule !== undefined) {
                try {
                    value = JSON.parse(matchingRule.to);
                } catch (_) {
                    value = matchingRule.to;
                    // this is fine, we just need to ensure correct data types for primitives
                }
            } else if ((resp.type === 'string' || resp.type === 'boolean') && resp.conversionDefault !== undefined) {
                value = resp.conversionDefault;
            }
            dataPoint.push(value);
        });
        dataTable.data.push(dataPoint);
    });

    if (properties.chartType === 'PieChart') {
        if (properties.calculateIntervals !== true) {
            // one slice per series with its first (newest) value; series sharing a timestamp share a row
            const transposed: any[] = [['', '']];
            header.slice(1).forEach((title, i) => {
                transposed.push([title, dataTable.data.slice(1).map((row) => row[i + 1]).find((x) => x !== null && x !== undefined)]);
            });
            dataTable.data = transposed;
        } else {
            const res = transformTableForTimeline(dataTable.data, properties.vAxes || []);
            dataTable.data = [['', '']];
            res.table.slice(1).forEach(r => {
                const val = (r[3] as Date).valueOf() - (r[2] as Date).valueOf();
                const i = dataTable.data.findIndex(s => s[0] === r[1]);
                if (i !== -1) {
                    (dataTable.data[i][1] as number) += val;
                } else {
                    dataTable.data.push([r[1], val]);
                }
            });
            return { table: dataTable, colors: res.colors.slice(1) };
        }
    } else if (properties.chartType === 'Timeline') {
        let breakInterval = -1;
        let breakValue = 0;
        let breakUnit = '';
        if (properties.breakInterval?.endsWith('m')) {
            breakUnit = 'm';
            breakInterval = 1000 * 60;
        }
        if (properties.breakInterval?.endsWith('h')) {
            breakUnit = 'h';
            breakInterval = 1000 * 60 * 60;
        }
        if (properties.breakInterval?.endsWith('d')) {
            breakUnit = 'd';
            breakInterval = 1000 * 60 * 60 * 24;
        }
        if (breakInterval !== -1) {
            breakValue = Number(properties.breakInterval?.split(breakUnit)[0]);
            breakInterval *= breakValue;
        }
        const res = transformTableForTimeline(dataTable.data, properties.vAxes || [], breakInterval, breakValue, breakUnit);
        dataTable.data = res.table;
        return { table: dataTable, colors: res.colors };
    } else if (properties.chartType === 'ColumnChart' && properties.break === true && !disableBreaking) {
        let breakInterval = 'm';
        if (groupInterval !== undefined && !groupInterval.endsWith('y')) {
            if (groupInterval.endsWith('m')) {
                breakInterval = 'h';
            } else if (groupInterval.endsWith('h')) {
                breakInterval = 'd';
            } else if (groupInterval.endsWith('d')) {
                breakInterval = 'months';
            } else if (groupInterval.endsWith('months')) {
                breakInterval = 'y';
            }
            const res = splitTableOnDate(dataTable.data, colors, breakInterval as 'h' | 'd' | 'm' | 'y' | 'months', columnAxes);
            dataTable.data = res.table;
            return { table: dataTable, colors: res.colors, columnAxes: res.columnAxes };
        }
    }
    return { table: dataTable, colors, columnAxes };
}

/** What a charts export widget draws, independent of the chart library. */
export interface ChartsExportChart {
    chartType: string;
    /** header ['time', series...] (pie: ['', '']), then the rows */
    dataTable: (Date | string | number | null)[][];
    /** one per table column after the first */
    colors: string[];
    hAxisLabel?: string;
    vAxisLabel?: string;
    secondVAxisLabel?: string;
    /** the stored or zoom level axis format, as stored */
    hAxisFormat?: string;
    curved: boolean;
    stacked?: boolean;
    /** per series: drawn against the second value axis; indexed like the widget's vAxes */
    secondAxis: boolean[];
    /** pie: the share below which slices are grouped; undefined for Google's default */
    sliceThreshold?: number;
    /** column chart: the index of the vAxis each table column after the first comes from */
    columnAxes?: number[];
}

/** The chart of a charts export widget: the colours of the series present in the table and the axis settings. */
export function chartsExportChart(widget: WidgetModel, dataTable: ChartDataTableModel, colorOverride?: string[], hAxisFormat?: string, columnAxes?: number[]): ChartsExportChart {
    const chartType = widget.properties.chartType === undefined || widget.properties.chartType === '' ? 'LineChart' : widget.properties.chartType;

    // Remove all elements from color array that are missing in the dataTable
    const colors = colorOverride || getColorArray(widget.properties.vAxes || []);
    if (widget.properties.vAxes && dataTable.data.length > 0 && chartType !== 'PieChart' && dataTable.data[0].length !== colors.length + 1) {
        const deleteColorIndices: number[] = [];
        widget.properties.vAxes.forEach((vAxes, index) => {
            if (dataTable.data[0].indexOf(vAxes.valueAlias || vAxes.valueName) === -1) {
                deleteColorIndices.push(index);
            }
        });
        for (let i = deleteColorIndices.length - 1; i >= 0; i--) {
            // reverse transition ensures valid indices
            colors.splice(deleteColorIndices[i], 1);
        }
    }
    const secondAxis = (widget.properties.vAxes || []).map((v) => v.displayOnSecondVAxis === true);
    return {
        chartType,
        dataTable: dataTable.data,
        colors,
        hAxisLabel: widget.properties.hAxisLabel,
        vAxisLabel: widget.properties.vAxisLabel,
        secondVAxisLabel: secondAxis.includes(true) ? widget.properties.secondVAxisLabel : undefined,
        hAxisFormat: hAxisFormat || widget.properties.hAxisFormat,
        curved: widget.properties.curvedFunction === true,
        stacked: chartType === 'ColumnChart' ? widget.properties.stacked : undefined,
        secondAxis: secondAxis.includes(true) ? secondAxis : secondAxis.map(() => false),
        sliceThreshold: chartType !== 'PieChart' || dataTable.data.length > 5 ? undefined : 0,
        columnAxes,
    };
}

export function getColorArray(vAxes?: ChartsExportVAxesModel[]): string[] {
    const array: string[] = [];
    vAxes?.forEach((vAxis: ChartsExportVAxesModel) => {
        array.push(vAxis.color ? vAxis.color : chartsExportDefaultColor);
    });
    return array;
}

function transformTableForTimeline(dat: any[][], vAxes: ChartsExportVAxesModel[], breakInterval: number = -1, breakValue: number = 0, breakUnit: string = ''): {
    table: any[][];
    colors: string[];
} {
    const allSlices: any[][] = [];
    const offset = 60 * 1000 * (new Date(0).getTimezoneOffset());
    const colors: string[] = [chartsExportDefaultColor];
    const header = dat[0];
    header.slice(1).forEach((head, j) => {
        const slices: any[][] = [[]];
        let end: any;
        let value: string | undefined;
        const filteredRows = dat.filter(r => r[j + 1] !== null);
        for (let i = 1; i < filteredRows.length; i++) {
            const slice = slices[slices.length - 1];
            let title = head;
            if (breakInterval !== -1 && slices.indexOf(slice) > 0) {
                title += ' -' + (slices.indexOf(slice) * breakValue) + breakUnit;
            }
            if (filteredRows[i][j + 1] != null) {
                if (value === undefined) {
                    end = filteredRows[i][0];
                    value = '' + filteredRows[i][j + 1];
                } else if ('' + filteredRows[i][j + 1] !== value || i === filteredRows.length - 1) {
                    let start = filteredRows[i][0] as Date;
                    if (breakInterval > -1) {
                        if (Math.floor(end / breakInterval) > Math.floor(start.valueOf() / breakInterval) && i === filteredRows.length - 1) {
                            start = new Date(offset);
                        } else {
                            start = new Date(start.valueOf() % breakInterval);
                        }
                        end = new Date((end) % breakInterval);
                        if (end.valueOf() >= breakInterval + offset) {
                            end = new Date(breakInterval + offset - 1);
                        }
                        if (start.valueOf() > end.valueOf()) {
                            start = new Date(start.valueOf() - breakInterval);
                        }
                    }
                    if (slice.findIndex((s: any[]) => s[1] === value) === -1 && allSlices.findIndex(s => s[1] === value) === -1 && slices.findIndex(s => s.findIndex(sub => sub[1] === value) !== -1) === -1) {
                        colors.push(vAxes?.[j].conversions?.find(c => c.to === value)?.color || vAxes?.[j].color || chartsExportDefaultColor);
                    }
                    slice.push([title, value, start, end]);
                    value = '' + filteredRows[i][j + 1];
                    end = filteredRows[i][0];
                } else if (breakInterval > -1 && Math.floor((slice.length > 0 ? slice[0][0].valueOf() : end) / breakInterval) > Math.floor((filteredRows[i][0] as Date).valueOf() / breakInterval)) {
                    if (slice.findIndex((s: any[]) => s[1] === value) === -1 && allSlices.findIndex(s => s[1] === value) === -1 && slices.findIndex(s => s.findIndex(sub => sub[1] === value) !== -1) === -1) {
                        colors.push(vAxes?.[j].conversions?.find(c => c.to === value)?.color || vAxes?.[j].color || chartsExportDefaultColor);
                    }
                    slice.push([title, value, new Date(offset), new Date(breakInterval + offset - 1)]);
                    end = filteredRows[i][0];
                    slices.push([]);
                }
            }
        }
        allSlices.push(...slices.filter(s => s.length > 0));
    });
    const table = [['', '', '', '']];
    allSlices.forEach(s => table.push(...s));
    return { table, colors };
}

function splitTableOnDate(dat: any[][], colors: string[], breakUnit: 'h' | 'd' | 'm' | 'y' | 'months', columnAxes: number[]): {
    table: any[][];
    colors: string[];
    columnAxes: number[];
} {
    if (dat.length === 0) {
        return { table: dat, colors: colors, columnAxes };
    }
    const initialHeaderLength = dat[0].length;
    const addedRows: any[] = [];
    const diffToIdx = new Map<number, number>();
    let addedColumns = 0;
    let end = new Date();
    if (dat.length > 1) {
        end = new Date(dat[1][0] as string);
    }
    for (let i = dat.length - 1; i > 1; i--) {
        let diff = 0;
        const diffTs = end.valueOf() - (new Date(dat[i][0] as string)).valueOf();
        switch (breakUnit) {
            case 'm':
                diff = Math.floor(diffTs / (1000 * 60));
                break;
            case 'h':
                diff = Math.floor(diffTs / (1000 * 60 * 60));
                break;
            case 'd':
                diff = Math.floor(diffTs / (1000 * 60 * 60 * 24));
                break;
            case 'months':
                diff = end.getMonth() - (new Date(dat[i][0] as string)).getMonth() + (12 * (end.getFullYear() - (new Date(dat[i][0] as string)).getFullYear()));
                break;
            case 'y':
                diff = end.getFullYear() - (new Date(dat[i][0] as string)).getFullYear();
                break;
        }

        if (diff > 0) {
            let idx = addedColumns;
            if (diffToIdx.has(diff)) {
                idx = diffToIdx.get(diff)!;
            } else {
                diffToIdx.set(diff, idx);
                const addedHeaders: string[] = [];
                dat[0].slice(1, initialHeaderLength).forEach((head, j) => {
                    let color = Color(colors[j] || chartsExportDefaultColor);
                    for (let k = 0; k < diff; k++) {
                        color = color.fade(0.5);
                    }
                    colors.push(color.hexa());
                    columnAxes.push(columnAxes[j]);
                    addedHeaders.push(head + ' -' + diff + breakUnit);
                    addedColumns++;
                });
                dat[0].push(...addedHeaders);
            }
            const d = new Date(dat[i][0] as string);
            switch (breakUnit) {
                case 'm':
                    d.setMinutes(end.getMinutes());
                // intentional fall-through
                case 'h':
                    d.setHours(end.getHours());
                // intentional fall-through
                case 'd':
                    d.setDate(end.getDate());
                // intentional fall-through
                case 'months':
                    d.setMonth(end.getMonth());
                // intentional fall-through
                case 'y':
                    d.setFullYear(end.getFullYear());
                    break;
            }
            const newRow: any[] = [d];
            newRow.push(...new Array(dat[0].length - initialHeaderLength).fill(null));
            newRow.push(...dat[i].slice(1));
            dat.splice(i, 1);
            addedRows.push(newRow);
        }

    }
    dat.push(...addedRows);
    return sortColumnsByFirstRow(dat, colors, columnAxes);
}

function sortColumnsByFirstRow(table: any[][], colors: string[], columnAxes: number[]): { table: any[][], colors: string[], columnAxes: number[] } {
    if (!table.length || table[0].length <= 1) return { table, colors, columnAxes };

    // Create array of column indices (excluding first column)
    const columnIndices = table[0]
        .map((_, i) => i)
        .slice(1)
        .sort((b, a) => {
            const valA = table[0][a];
            const valB = table[0][b];
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        });

    // Rebuild table with sorted columns
    return {
        table: table.map(row => [
            row[0], // keep first column fixed
            ...columnIndices.map(i => row[i])
        ]), colors: columnIndices.map(i => colors[i - 1]),
        columnAxes: columnIndices.map(i => columnAxes[i - 1]),
    };
}
