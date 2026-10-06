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

/* Preview harness - local only. One widget per chart type with deterministic backend answers, for screenshot comparison. */
import { HttpRequest } from '@angular/common/http';
import { environment } from '../environments/environment';
import { WidgetModel } from '../app/modules/dashboard/shared/dashboard-widget.model';
import { AnomalyResultModel } from '../app/widgets/anomaly/shared/anomaly.model';

/** The screenshots freeze the browser clock at this instant, all fixture times are relative to it. */
export const PREVIEW_NOW = Date.parse('2026-10-05T08:00:00Z');
const M = 60000;
const H = 60 * M;
const iso = (ms: number) => new Date(ms).toISOString();
const timescale = environment.exportDatabaseIdInternalTimescaleDb;

/** Rows newest first, one per step back from end, as the export APIs answer with orderDirection desc. */
function rows(count: number, step: number, value: (i: number, t: number) => any, end = PREVIEW_NOW): [string, any][] {
    return Array.from({ length: count }, (_, i) => {
        const t = end - i * step;
        return [iso(t), value(i, t)];
    });
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;
const wave = (i: number, base: number, amp: number, period: number) => round(base + amp * Math.sin((2 * Math.PI * i) / period));

/** Answers per export or device id and column; each answer is the list of tables of one request. */
const series: Record<string, (element: any) => any[][][]> = {
    'exp-climate:temperature': () => [rows(48, 30 * M, (i) => wave(i, 21, 3, 24))],
    'exp-climate:humidity': () => [rows(48, 30 * M, (i) => wave(i + 6, 55, 12, 30))],
    'exp-energy:power': () => [rows(36, H, (i) => (i >= 5 && i <= 7 ? null : round(4 + 3 * Math.abs(Math.sin(i / 4)), 3))).filter((r) => r[1] !== null)],
    'exp-energy:pv': () => [rows(36, H, (i) => (i >= 5 && i <= 7 ? null : i % 24 > 6 && i % 24 < 18 ? 0 : round(2.5 * Math.abs(Math.cos(i / 5)), 3))).filter((r) => r[1] !== null)],
    'exp-energy:daily': () => [rows(60, H, (i) => round(1 + (i % 7) * 0.4, 2))],
    'exp-share:a': () => [[[iso(PREVIEW_NOW - 2 * M), 42]]],
    'exp-share:b': () => [[[iso(PREVIEW_NOW - 5 * M), 27]]],
    'exp-share:c': () => [[[iso(PREVIEW_NOW - 9 * M), 13.5]]],
    'exp-state:pump': () => [rows(24, 15 * M, (i) => (Math.floor(i / 5) % 2 === 0 ? 1 : 0))],
    'exp-state:fan': () => [rows(24, 15 * M, (i) => (Math.floor(i / 3) % 3 === 0 ? 1 : 0))],
    'exp-pv:output': () => [rows(48, H, (i) => {
        const hourOfDay = new Date(PREVIEW_NOW + 24 * H - i * H).getUTCHours();
        return hourOfDay >= 5 && hourOfDay <= 17 ? round(3200 * Math.sin(((hourOfDay - 5) / 12) * Math.PI), 1) : 0;
    }, PREVIEW_NOW + 24 * H)],
    'dev-pump:value': (element) => element.groupTime === '1m'
        ? [rows(6 * 60, M, (i) => (i === 300 ? 95.2 : wave(i, 60, 8, 90)))]
        : [rows(20, 30 * 1000, (i) => round(20 + (i % 4) * 3, 1), PREVIEW_NOW).map(([t, v], i) => [iso(Date.parse(t) - (i % 3) * 7000), v])],
    'dev-hum:humidity': () => [rows(3 * 60, M, (i) => (i < 40 ? round(58 + i * 0.3, 1) : wave(i, 52, 4, 50)))],
    'exp-vent:humidity_too_fast_too_high': () => [[
        [iso(PREVIEW_NOW - 20 * M), iso(PREVIEW_NOW - 25 * M)],
        [iso(PREVIEW_NOW - 60 * M), ''],
        [iso(PREVIEW_NOW - 100 * M), ''],
        [iso(PREVIEW_NOW - 150 * M), ''],
    ]],
    'exp-vent:window_open': () => [[
        [iso(PREVIEW_NOW - 20 * M), false],
        [iso(PREVIEW_NOW - 60 * M), false],
        [iso(PREVIEW_NOW - 100 * M), true],
        [iso(PREVIEW_NOW - 150 * M), false],
    ]],
};

function anomaly(deviceId: string, type: string, fromMin: number, toMin: number, value: string): AnomalyResultModel {
    const start = PREVIEW_NOW - fromMin * M;
    const end = PREVIEW_NOW - toMin * M;
    const curves: [number, number, number][] = type === 'curve'
        ? rows(Math.max(2, (fromMin - toMin) / 5), 5 * M, (i) => i, end).reverse().map(([t], i) => [Date.parse(t), round(70 + 6 * Math.sin(i / 2)), round(62 + 2 * Math.sin(i / 2))])
        : [];
    return {
        value, type, subType: '', threshold: 0, mean: 0, timestamp: iso(type === 'curve' ? end : start), initial_phase: '', device_id: deviceId,
        start_time: iso(start), end_time: iso(end), original_reconstructed_curves: curves,
    };
}

/** The anomaly history, oldest first. */
export const previewAnomalies: AnomalyResultModel[] = [
    anomaly('dev-pump', 'extreme_value', 300, 300, '95.2'),
    anomaly('dev-pump', 'curve', 240, 210, '0.82'),
    anomaly('dev-fan', 'curve', 200, 170, '0.64'),
    anomaly('dev-pump', 'curve', 120, 80, '0.91'),
    anomaly('dev-pump', 'curve', 100, 60, '0.88'),
    anomaly('dev-pump', 'freq', 50, 50, '12'),
];

const anomalyColumns = ['value', 'type', 'sub_type', 'threshold', 'mean', 'time', 'device_id', 'initial_phase', 'start_time', 'end_time', 'original_reconstructed_curves'];

function anomalyColumn(name: string): [string, any][] {
    return previewAnomalies.map((a) => {
        const values: Record<string, any> = {
            value: a.value, type: a.type, sub_type: a.subType, threshold: a.threshold, mean: a.mean, time: a.timestamp, device_id: a.device_id,
            initial_phase: a.initial_phase, start_time: a.start_time, end_time: a.end_time, original_reconstructed_curves: JSON.stringify(a.original_reconstructed_curves),
        };
        return [a.timestamp, values[name]];
    });
}

function timescaleAnswer(body: any[]): any[] {
    return body.map((element, requestIndex) => {
        const id = element.exportId || element.deviceId;
        if (id === 'exp-anomaly') {
            return { requestIndex, data: element.columns.map((c: any) => (anomalyColumns.includes(c.name) ? anomalyColumn(c.name) : [])) };
        }
        if (id === 'exp-vent') {
            return { requestIndex, data: element.columns.map((c: any) => series['exp-vent:' + c.name](element)[0]) };
        }
        const answer = series[id + ':' + element.columns[0].name];
        let data = answer === undefined ? [[]] : answer(element);
        if (element.limit !== undefined) {
            data = data.map((table) => table.slice(0, element.limit));
        }
        return { requestIndex, data, exportId: element.exportId, deviceId: element.deviceId, serviceId: element.serviceId };
    });
}

const consumptions = (anomalous: number[]) => JSON.stringify(rows(14, 24 * H, (i) => round(8 + 2 * Math.sin(i), 2)).map(([t, v], i) => [t, anomalous.includes(i) ? v + 9 : v, anomalous.includes(i) ? 1 : 0]).reverse());

function lastValuesAnswer(body: any[]): any[] {
    const exportId = body[0]?.exportId;
    const time = iso(PREVIEW_NOW - 3 * M);
    const pair = (value: any) => ({ time, value });
    if (exportId === 'exp-cons') {
        return [pair(true), pair('high'), pair(consumptions([1, 4])), pair('06:00 - 07:00'), pair(time), pair('')];
    }
    if (exportId === 'exp-leak') {
        return [pair(1), pair(''), pair(consumptions([0])), pair('07:55 - 08:00'), pair(time), pair('')];
    }
    return body.map(() => pair(null));
}

const processes = [
    ...rows(6, 26 * H, () => 'COMPLETED'), ...rows(3, 31 * H, () => 'ACTIVE'), ...rows(2, 50 * H, () => 'EXTERNALLY_TERMINATED'),
    ...rows(1, H, () => 'SUSPENDED'), ...rows(1, H, () => 'INTERNALLY_TERMINATED'),
].map(([startTime, state], i) => ({ id: 'p-' + i, startTime, state }));

const hubs = [
    { id: 'hub-1', name: 'Gateway Halle', device_local_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], connection_state: 'online' },
    { id: 'hub-2', name: 'Gateway Buero', device_local_ids: ['h', 'i'], connection_state: 'online' },
    { id: 'hub-3', name: 'Gateway Lager', device_local_ids: null, connection_state: 'offline' },
    { id: 'hub-4', name: 'Gateway Dach', device_local_ids: ['j', 'k', 'l', 'm'], connection_state: '' },
];

const hubHistory: Record<string, any[]> = {
    'hub-1': [{ id: 'hub-1', prev_state: { connected: true, time: iso(PREVIEW_NOW - 8 * 24 * H) }, states: [
        { connected: false, time: iso(PREVIEW_NOW - 3 * 24 * H) }, { connected: true, time: iso(PREVIEW_NOW - 3 * 24 * H + 5 * H) },
    ] }],
    'hub-2': [{ id: 'hub-2', prev_state: { connected: true, time: iso(PREVIEW_NOW - 8 * 24 * H) }, states: [] }],
    'hub-3': [{ id: 'hub-3', prev_state: { connected: false, time: iso(PREVIEW_NOW - 9 * 24 * H) }, states: [
        { connected: true, time: iso(PREVIEW_NOW - 2 * 24 * H) },
    ] }],
};

const devices = ['dev-1', 'dev-2', 'dev-3'].map((id) => ({ id, name: id, display_name: id }));

function deviceHistory(): Record<string, any[]> {
    const midnight = new Date(PREVIEW_NOW);
    midnight.setHours(0, 0, 0, 0);
    const at = (h: number, m = 0) => iso(midnight.getTime() + h * H + m * M);
    return {
        'dev-1': [{ id: 'dev-1', prev_state: { connected: true, time: '' }, states: [{ connected: false, time: at(3, 10) }, { connected: true, time: at(4, 40) }] }],
        'dev-2': [{ id: 'dev-2', prev_state: { connected: true, time: '' }, states: [{ connected: false, time: at(7, 20) }] }],
        'dev-3': [{ id: 'dev-3', prev_state: null, states: [{ connected: true, time: at(1, 0) }, { connected: false, time: at(1, 30) }, { connected: true, time: at(2, 0) }] }],
    };
}

/** The demo anomaly widget's two Influx exports, temperature (anomalous above 100) and pressure (above 3), newest first. */
const influxSeries: Record<string, () => [string, number][]> = {
    '1ad3994f-c03f-4c7d-9b9c-eec1595fd7f9': () => rows(72, 5 * M, (i) => (i >= 20 && i < 32 ? 120 : 80)),
    'f53512e9-8427-4d27-a55b-799c4ad418d8': () => rows(72, 5 * M, (i) => (i >= 45 && i < 60 ? 4 : 2)),
};

/** The backend answer for a chart widget request, undefined for requests the charts do not make. */
export function chartAnswer(request: HttpRequest<unknown>): { body: unknown; headers?: Record<string, string> } | undefined {
    const url = request.url;
    if (url.endsWith('/v2/queries?format=per_query') && request.method === 'POST') {
        return { body: (request.body as any[]).map((element) => (influxSeries[element.measurement] || (() => []))()) };
    }
    if (url.endsWith('/queries/v2') && request.method === 'POST') {
        return { body: timescaleAnswer(request.body as any[]) };
    }
    if (url.endsWith('/last-values') && request.method === 'POST') {
        return { body: lastValuesAnswer(request.body as any[]) };
    }
    if (url.endsWith('/v2/history/process-instances')) {
        return { body: processes };
    }
    if (url.endsWith('/extended-hubs')) {
        return { body: hubs, headers: { 'X-Total-Count': String(hubs.length) } };
    }
    if (url.endsWith('/historical/query/map-original')) {
        return { body: hubHistory };
    }
    if (url.endsWith('/historical//query/map-original')) {
        return { body: deviceHistory() };
    }
    if (url.includes('/commands/batch') && request.method === 'POST') {
        return { body: (request.body as any[]).map((c) => ({ status_code: 200, message: floorplanValues[c.group_id] })) };
    }
    if (url.endsWith('/query/functions') && request.method === 'POST') {
        return { body: [{ id: 'urn:fn:get-temperature', name: 'getTemperature', display_name: 'Get Temperature', concept_id: 'urn:concept:temperature' }] };
    }
    if (url.endsWith('/v2/concepts-with-characteristics')) {
        return {
            body: [{ id: 'urn:concept:temperature', name: 'Temperature', base_characteristic_id: 'urn:char:celsius', characteristics: [{ id: 'urn:char:celsius', name: 'Celsius', display_unit: '°C', type: 'https://schema.org/Float' }] }],
            headers: { 'X-Total-Count': '1' },
        };
    }
    if (url.endsWith('/extended-devices') && request.method === 'GET') {
        return { body: devices, headers: { 'X-Total-Count': String(devices.length) } };
    }
    return undefined;
}

function widget(id: string, type: string, properties: any, name = id): WidgetModel {
    return { id, name, type, properties };
}

const relative = (last: string) => ({ timeRangeType: 'relative', time: { last, ahead: undefined, start: undefined, end: undefined } });
const exp = (id: string) => ({ id, name: id, values: [], exportDatabaseId: timescale });
const axis = (instanceId: string, valueName: string, extra: any = {}) => ({ instanceId, exportName: instanceId, valueName, valueType: 'float', math: '', color: '', ...extra });

const climate = {
    exports: [exp('exp-climate')],
    vAxes: [
        axis('exp-climate', 'temperature', { valueAlias: 'Temperatur', color: '#e91e63' }),
        axis('exp-climate', 'humidity', { valueAlias: 'Feuchte', color: '#2196f3', displayOnSecondVAxis: true }),
    ],
    hAxisLabel: 'Zeit', vAxisLabel: '°C', secondVAxisLabel: '%', hAxisFormat: 'HH:mm',
    ...relative('24h'),
};

const timelineAxis = (instanceId: string, valueAlias: string) => axis(instanceId, valueAlias.toLowerCase(), {
    valueAlias, valueType: 'int',
    conversions: [{ from: 1, to: 1, alias: 'An', color: '#4caf50' }, { from: 0, to: 0, alias: 'Aus', color: '#9e9e9e' }],
});

const anomalyProperties = (visualizationType: string, extra: any = {}) => ({
    anomalyDetection: {
        export: 'exp-anomaly', visualizationType, showDebug: false, showFrequencyAnomalies: false,
        timelineConfig: { hAxisLabel: 'Zeit', vAxisLabel: 'Geraet' },
        timeRangeConfig: { timeRange: { time: 6, level: 'h', type: 'relative' } },
        deviceValueConfig: { exports: [{ id: 'dev-pump', name: 'Pumpe' }], fields: [{ serviceId: 'svc-pump', valuePath: 'value', valueName: 'value', exportName: '', valueType: 'float', math: '', color: '' }] },
        ...extra,
    },
});

const floorplanImage = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#f5f5f5"/>' +
    '<g fill="none" stroke="#607d8b" stroke-width="6"><rect x="20" y="20" width="760" height="460"/><line x1="420" y1="20" x2="420" y2="300"/>' +
    '<line x1="20" y1="300" x2="600" y2="300"/></g><text x="40" y="60" font-family="sans-serif" font-size="24" fill="#90a4ae">Halle</text>' +
    '<text x="440" y="60" font-family="sans-serif" font-size="24" fill="#90a4ae">Buero</text></svg>');

const placement = (alias: string, x: number, y: number, value: any, coloring: any[], extra: any = {}) => ({
    alias, deviceGroupId: 'dg-' + alias, position: { x, y }, coloring,
    criteria: { function_id: 'urn:fn:get-temperature', aspect_id: 'urn:aspect:air', device_class_id: '', interaction: 'request', value: { status_code: 200, message: value } },
    valueLow: null, valueHigh: null, colorLow: null, colorHigh: null, ...extra,
});

const floorplanValues: Record<string, number> = { 'dg-Halle': 16.5, 'dg-Buero': 21, 'dg-Lager': 27.25 };

const temperatureColoring = [
    { value: 18, icon: 'ac_unit', color: '#2196f3', showValue: true, showValueWhenZoomed: true },
    { value: 24, icon: 'thermostat', color: '#4caf50', showValue: true, showValueWhenZoomed: true },
    { value: 100, icon: 'local_fire_department', color: '#f44336', showValue: true, showValueWhenZoomed: true },
];

/** Every chart the screenshots cover, by route name; zoom shows the maximised widget. */
export const previewCharts: Record<string, { widget: WidgetModel; zoom?: boolean }> = {
    'export-line': { widget: widget('export-line', 'charts_export', { chartType: 'LineChart', ...climate }, 'Klima') },
    'export-line-curved': { widget: widget('export-line-curved', 'charts_export', { chartType: 'LineChart', curvedFunction: true, ...climate }, 'Klima geglaettet') },
    'export-line-zoom': { widget: widget('export-line-zoom', 'charts_export', { chartType: 'LineChart', ...climate }, 'Klima'), zoom: true },
    'export-scatter': { widget: widget('export-scatter', 'charts_export', { chartType: 'ScatterChart', ...climate }, 'Klima Punkte') },
    'export-pie': { widget: widget('export-pie', 'charts_export', {
        chartType: 'PieChart', exports: [exp('exp-share')], ...relative('1h'),
        vAxes: [axis('exp-share', 'a', { valueAlias: 'Halle', color: '#3f51b5' }), axis('exp-share', 'b', { valueAlias: 'Buero', color: '#ff9800' }), axis('exp-share', 'c', { valueAlias: 'Lager' })],
    }, 'Verbrauch nach Bereich') },
    'export-column': { widget: widget('export-column', 'charts_export', {
        chartType: 'ColumnChart', exports: [exp('exp-energy')], ...relative('36h'), group: { time: '1h', type: 'mean' }, hAxisFormat: '',
        vAxes: [axis('exp-energy', 'power', { valueAlias: 'Bezug', color: '#673ab7' }), axis('exp-energy', 'pv', { valueAlias: 'PV', color: '#ffc107', displayOnSecondVAxis: true })],
        vAxisLabel: 'kWh', secondVAxisLabel: 'kWh PV',
    }, 'Energie stuendlich') },
    'export-column-stacked': { widget: widget('export-column-stacked', 'charts_export', {
        chartType: 'ColumnChart', exports: [exp('exp-energy')], ...relative('36h'), group: { time: '1h', type: 'mean' }, hAxisFormat: '', stacked: true,
        vAxes: [axis('exp-energy', 'power', { valueAlias: 'Bezug', color: '#673ab7' }), axis('exp-energy', 'pv', { valueAlias: 'PV', color: '#ffc107' })],
    }, 'Energie gestapelt') },
    'export-column-break': { widget: widget('export-column-break', 'charts_export', {
        chartType: 'ColumnChart', exports: [exp('exp-energy')], ...relative('60h'), group: { time: '1h', type: 'sum' }, hAxisFormat: 'HH', break: true,
        vAxes: [axis('exp-energy', 'daily', { valueAlias: 'Verbrauch', color: '#009688' })],
    }, 'Verbrauch je Tag') },
    'export-timeline': { widget: widget('export-timeline', 'charts_export', {
        chartType: 'Timeline', exports: [exp('exp-state')], ...relative('6h'),
        vAxes: [timelineAxis('exp-state', 'Pump'), timelineAxis('exp-state', 'Fan')], hAxisLabel: 'Zeit', vAxisLabel: 'Anlage',
    }, 'Betriebszustand') },
    'pv-prediction': { widget: widget('pv-prediction', 'pv_prediction', {
        pvPrediction: { exportID: 'exp-pv', displayTimeline: true, displayNextValue: false, nextValueConfig: { level: 'h', time: 6 } },
    }, 'PV Prognose') },
    'device-total-downtime': { widget: widget('device-total-downtime', 'charts_device_total_downtime', {}, 'Ausfallquote heute') },
    'device-downtime-gateway': { widget: widget('device-downtime-gateway', 'charts_device_downtime_rate_per_gateway', { hideZeroPercentage: false }, 'Ausfall je Gateway') },
    'device-gateway': { widget: widget('device-gateway', 'charts_device_per_gateway', {}, 'Geraete je Gateway') },
    'process-deployments': { widget: widget('process-deployments', 'charts_process_deployments', {}, 'Prozessstarts') },
    'process-instances': { widget: widget('process-instances', 'charts_process_instances', {}, 'Prozessstatus') },
    'anomaly-timeline': { widget: widget('anomaly-timeline', 'anomaly_detection', anomalyProperties('timeline'), 'Anomalien Verlauf') },
    'anomaly-line': { widget: widget('anomaly-line', 'anomaly_detection', anomalyProperties('device'), 'Anomalien Pumpe') },
    'anomaly-line-debug': { widget: widget('anomaly-line-debug', 'anomaly_detection', anomalyProperties('device', { showDebug: true, showFrequencyAnomalies: true }), 'Anomalien Pumpe Debug'), zoom: true },
    'fake-anomaly': { widget: widget('fake-anomaly', 'fake-anomaly', {}, 'Demo Anomalie') },
    'bad-ventilation': { widget: widget('bad-ventilation', 'bad_ventilation', {
        badVentilation: {
            exportConfig: { exports: [exp('exp-vent')] },
            deviceConfig: { exports: [{ id: 'dev-hum', name: 'Sensor' }], fields: [{ serviceId: 'svc-hum', valuePath: 'humidity', valueName: 'humidity', exportName: '', valueType: 'float', math: '', color: '' }] },
            timeRangeConfig: { timeRange: { time: 3, level: 'h', type: 'relative' } },
        },
    }, 'Lueftung') },
    'consumption-profile': { widget: widget('consumption-profile', 'consumption_profile', { consumptionProfile: { exportID: 'exp-cons' } }, 'Verbrauchsprofil') },
    'leakage-detection': { widget: widget('leakage-detection', 'leakage_detection', { leakageDetection: { exportID: 'exp-leak' } }, 'Leckage') },
    'floorplan': { widget: widget('floorplan', 'floorplan', {
        floorplan: {
            image: floorplanImage, dotSize: 10, showUnplacedTable: false, placements: [
                placement('Halle', 0.25, 0.3, 16.5, temperatureColoring, { showAlias: true }),
                placement('Buero', 0.7, 0.3, 21, temperatureColoring),
                placement('Lager', 0.4, 0.8, 27.25, temperatureColoring, { showAlias: true }),
            ],
        },
    }, 'Grundriss') },
};

/** The anomaly the reconstruction dialog shows. */
export const previewReconstruction = previewAnomalies[3];
