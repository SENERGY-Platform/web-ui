/* Preview harness fixtures - local only. Answers every backend call locally. */
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Environment } from '../app/modules/environments/shared/environments.model';

const industry: Environment = {
    id: 'env-industry',
    name: 'Industry',
    type: 'industrial_site',
    seed: 42,
    context: { outdoor_temperature: 12.5 },
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

@Injectable()
export class FixtureInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<unknown>, _next: HttpHandler): Observable<HttpEvent<unknown>> {
        const url = request.url;
        const answer = (body: unknown, status = 200): Observable<HttpEvent<unknown>> =>
            of(new HttpResponse({ status, body: body as object })).pipe(delay(80));

        if (url.endsWith('/environments') && request.method === 'GET') {
            return answer([industry]);
        }
        if (url.includes('/environments/env-industry') && url.endsWith('/state')) {
            return answer(null, 204);
        }
        if (url.includes('/environments/env-industry') && request.method === 'GET') {
            return answer(industry);
        }
        if (url.includes('/environments/env-industry') && request.method === 'PUT') {
            return answer(request.body);
        }
        if (url.endsWith('/device-types')) {
            return answer(deviceTypes);
        }
        if (url.endsWith('/datasets') && request.method === 'GET') {
            return answer(datasets);
        }
        //platform device/device-type lookups of the dataset editor and anything else
        return answer([]);
    }
}
