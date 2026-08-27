/* Preview harness fixtures - local only. Answers every backend call locally. */
import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Environment } from '../app/modules/environments/shared/environments.model';

const industry: Environment = {
    id: 'env-industry',
    name: 'Industry',
    type: 'industrial_site',
    // Optimistic locking (see Environment.version): every PUT below echoes this back
    // incremented, so a second edit against a stale copy (e.g. two preview tabs) would 409.
    // Testing hook: PUT-ing a name ending in "conflict" simulates that second write landing
    // first, so the visual check can trigger the 409 conflict dialog without two tabs.
    version: 3,
    seed: 42,
    context: { outdoor_temperature: 12.5 },
    context_sources: {
        outdoor_temperature: {
            kind: 'profile',
            interval_seconds: 300,
            profile: {
                base: 12,
                spread_percent: 15,
                hour_factors: [
                    0.6, 0.6, 0.6, 0.6, 0.55, 0.5, 0.55, 0.65, 0.8, 0.95, 1.1, 1.2, 1.3, 1.4, 1.45, 1.5, 1.45, 1.35, 1.2, 1.05, 0.9, 0.8,
                    0.7, 0.65,
                ],
            },
        },
    },
    zones: [
        {
            id: 'z-site', name: 'Werksgelaende', type: 'site',
            initial_states: {},
            zones: [
                {
                    id: 'z-hall', name: 'Halle 1', type: 'hall',
                    initial_states: { temperature: 18, humidity: 40 },
                    time_constants: { temperature: 900 },
                    assets: [
                        {
                            id: 'a-compressor', name: 'Kompressor 1', kind: 'machine',
                            external_ref: 'urn:infai:ses:device:7283f08c-d41f-4d00-b89b-e88f932cfb3f',
                            external_type_id: 'urn:infai:ses:device-type:dc5bf705-4216-40c2-ba3f-24f57dc8f3e5',
                            external_managed: true, // created by the simulation when this environment was saved
                            initial_states: { rpm: 0, kwh: 290508.5 },
                            channels: [
                                {
                                    id: 'c-power', name: 'Get Current Consumption', direction: 'sensor',
                                    external_ref: 'urn:infai:ses:service:557a8519', interval_seconds: 30,
                                    characteristic_id: 'urn:infai:ses:characteristic:b59c3965',
                                    source: { kind: 'script', script: { code: 'var amp = moses.device.state.get("amp");\nmoses.service.send(amp);' }, interval_seconds: 5 },
                                },
                                {
                                    id: 'c-energy', name: 'Get Energy Consumption', direction: 'sensor',
                                    external_ref: 'urn:infai:ses:service:2af1bbcb', interval_seconds: 60,
                                    source: { kind: 'profile', profile: { base: 12, spread_percent: 10, cumulative: true, hour_factors: [0.2,0.2,0.2,0.2,0.3,0.5,0.9,1.4,1.6,1.5,1.4,1.3,1.1,1.3,1.5,1.4,1.2,0.9,0.6,0.4,0.3,0.2,0.2,0.2], weekday_factors: [1,1,1,1,1,0.4,0.2] } },
                                },
                                {
                                    id: 'c-grid', name: 'Netzbezug', direction: 'sensor',
                                    external_ref: 'urn:infai:ses:service:9151bbe7', interval_seconds: 30,
                                    source: { kind: 'formula', formula: { expression: 'last - pv', inputs: { last: 'channel.c-power', pv: 'asset.pv_kw' } } },
                                },
                                {
                                    id: 'c-replay', name: 'Referenzlastgang', direction: 'sensor',
                                    external_ref: 'urn:infai:ses:service:44ffd95e', interval_seconds: 60,
                                    source: { kind: 'dataset', dataset: { origin: 'file', ref: 'ds-1', column: 'Wirkleistung', resample: 'linear', anchor: 'loop' } },
                                },
                            ],
                        },
                        {
                            // A pre-existing device the user linked, not one the simulation created --
                            // external_managed stays false, so the Platform device block's other origin
                            // line is reachable in the preview too.
                            id: 'a-thermostat', name: 'Heizkoerperthermostat', kind: 'sensor',
                            external_ref: 'urn:infai:ses:device:existing-thermostat-af31',
                            external_type_id: 'urn:dt:thermo',
                            external_managed: false,
                            channels: [
                                {
                                    id: 'c-temp', name: 'Get Temperature', direction: 'sensor',
                                    external_ref: 'urn:svc:t1', interval_seconds: 60,
                                    source: { kind: 'profile', profile: { base: 20, spread_percent: 5 } },
                                },
                            ],
                        },
                    ],
                },
            ],
            assets: [],
        },
    ],
};

const datasets = [{
    id: 'ds-1', name: 'Lastgang Januar', timezone: 'Europe/Berlin', size_bytes: 48122, created_unix: 1767600000,
    columns: [{ name: 'Wirkleistung', points: 2976, from_unix: 1767222000, to_unix: 1769900400 }],
}];

const deviceTypes = [
    {
        id: 'urn:infai:ses:device-type:dc5bf705-4216-40c2-ba3f-24f57dc8f3e5',
        name: 'KREISEL Ceramic Rotary Valve',
        services: [
            { id: 'urn:svc:1', name: 'Get Current Consumption', direction: 'sensor', characteristic_id: 'urn:char:1', value_path: 'value' },
            { id: 'urn:svc:2', name: 'Get Energy Consumption', direction: 'sensor', characteristic_id: 'urn:char:2', value_path: 'value' },
            { id: 'urn:svc:3', name: 'Set Speed Level', direction: 'actuator', characteristic_id: '', value_path: '' },
        ],
    },
    { id: 'urn:dt:thermo', name: 'Devolo Radiator Thermostat (moses)', services: [
        { id: 'urn:svc:t1', name: 'Get Temperature', direction: 'sensor', characteristic_id: 'urn:char:t', value_path: 'value' },
    ] },
];

// Platform devices behind the two assets' external_ref, resolved by the environment editor's
// Platform device block (via extended-devices) so its screenshots show a real name instead of
// falling back to the raw id.
const extendedDevices: Record<string, { id: string; display_name: string; device_type_id: string }> = {
    'urn:infai:ses:device:7283f08c-d41f-4d00-b89b-e88f932cfb3f': {
        id: 'urn:infai:ses:device:7283f08c-d41f-4d00-b89b-e88f932cfb3f',
        display_name: 'Kompressor 1 (Platform)',
        device_type_id: 'urn:infai:ses:device-type:dc5bf705-4216-40c2-ba3f-24f57dc8f3e5',
    },
    'urn:infai:ses:device:existing-thermostat-af31': {
        id: 'urn:infai:ses:device:existing-thermostat-af31',
        display_name: 'Heizkoerper Buero 2 (Bestand)',
        device_type_id: 'urn:dt:thermo',
    },
};

/**
 * Mimics the server behaviour a save() round trip in the real MOSES relies on: a new asset
 * (external_type_id set, no external_ref yet, see assetFromDeviceType) gets a platform device
 * created for it, with external_managed set true. Mutates in place -- the request body is a
 * throwaway parsed object, not the shared `industry` fixture.
 */
function assignPendingDeviceRefs(zones: any[] | undefined): void {
    (zones || []).forEach((zone) => {
        (zone.assets || []).forEach((asset: any, i: number) => {
            if (asset.external_type_id && !asset.external_ref) {
                asset.external_ref = 'urn:infai:ses:device:preview-generated-' + (zone.id || 'zone') + '-' + i;
                asset.external_managed = true;
            }
        });
        assignPendingDeviceRefs(zone.zones);
    });
}

// When the preview app started -- liveEnvironmentState below uses the elapsed time since
// then, not the absolute epoch time itself, so the compressor's cumulative kwh counts up
// from its starting reading instead of jumping to "epoch seconds times a scale factor".
const previewStart = Date.now() / 1000;

/**
 * The GET .../state answer: ticks with real time so two polls a few seconds apart visibly
 * differ, for the Live state tab's "updates every 10s" preview screenshots. running: true
 * always -- there is no fixture path for a stopped simulation, the editor's own hint text
 * covers that case.
 */
function liveEnvironmentState(): unknown {
    const t = Date.now() / 1000;
    const elapsed = t - previewStart;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    return {
        running: true,
        as_of: new Date().toISOString(),
        context: { outdoor_temperature: round1(12.5 + 3 * Math.sin(t / 20)) },
        zones: {
            'z-hall': {
                temperature: round1(18 + 2 * Math.sin(t / 25)),
                humidity: round1(40 + 5 * Math.sin(t / 33)),
            },
        },
        assets: {
            'a-compressor': {
                rpm: Math.round(1200 + 300 * Math.sin(t / 15)),
                kwh: Math.round((290508.5 + elapsed * 0.05) * 100) / 100,
            },
        },
    };
}

@Injectable()
export class FixtureInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<unknown>, _next: HttpHandler): Observable<HttpEvent<unknown>> {
        const url = request.url;
        const answer = (body: unknown, status = 200): Observable<HttpEvent<unknown>> =>
            of(new HttpResponse({ status, body: body as object })).pipe(delay(80));
        // HttpResponse (above) is always a *successful* event as far as HttpClient is
        // concerned, whatever numeric status it carries -- an HttpErrorResponse is what
        // actually makes the request's Observable error out, the same way a real non-2xx
        // response does when it comes back through HttpXhrBackend.
        const answerError = (body: unknown, status: number): Observable<HttpEvent<unknown>> =>
            throwError(() => new HttpErrorResponse({ status, error: body, url })).pipe(delay(80));

        if (url.endsWith('/environments') && request.method === 'GET') {
            return answer([industry]);
        }
        if (url.includes('/environments/env-industry') && url.endsWith('/state')) {
            if (request.method === 'GET') {
                return answer(liveEnvironmentState());
            }
            return answer(null, 204); // PATCH: applying a live-state change
        }
        if (url.includes('/environments/env-industry') && request.method === 'GET') {
            return answer(industry);
        }
        if (url.includes('/environments/env-industry') && request.method === 'PUT') {
            const saved = request.body as Environment;
            // Testing hook for the visual 409 check: naming the environment "...conflict"
            // simulates a concurrent write landing first, without needing two preview tabs.
            if ((saved.name || '').endsWith('conflict')) {
                industry.version = (industry.version || 0) + 1;
                return answerError(
                    'version conflict: you have version ' + (saved.version ?? 0) + ', current is ' + industry.version,
                    409,
                );
            }
            assignPendingDeviceRefs(saved.zones);
            industry.version = (industry.version || 0) + 1;
            saved.version = industry.version;
            return answer(saved);
        }
        if (url.endsWith('/device-types')) {
            return answer(deviceTypes);
        }
        if (url.endsWith('/datasets') && request.method === 'GET') {
            return answer(datasets);
        }
        if (url.includes('/extended-devices/')) {
            const id = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1));
            return answer(extendedDevices[id] || null);
        }
        //platform device/device-type lookups of the dataset editor and anything else
        return answer([]);
    }
}
