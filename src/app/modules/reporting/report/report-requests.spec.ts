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
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ReportComponent } from './report.component';
import { ReportingService } from '../shared/reporting.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from '../../devices/device-groups/shared/device-groups.service';
import { environment } from '../../../../environments/environment';
import { findNode } from '../shared/report-object-node';

/**
 * Pins the requests the report editor sends to the reporting service: the report engine reads them, so they
 * must not change with the page around them. Runs against the real ReportingService and checks the HTTP bodies.
 */
describe('ReportComponent requests', () => {
    const base = environment.reportEngineUrl;
    const objects = () => ({
        consumption: {
            name: 'consumption', valueType: 'float64',
            query: { columns: [{ name: 'root.value' }], deviceId: 'd1', serviceId: 's1' },
        },
        label: { name: 'label', valueType: 'string', value: 'old' },
    });
    const stored = () => ({
        id: 'r1', name: 'Energy Report', templateId: 't1', templateName: 'Template t1', data: objects(),
        cron: '0 0 1 * *', emailReceivers: ['a@b.c'], emailSubject: 'subject',
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
    });
    const template = () => ({
        id: 't1', name: 'Template t1', type: 'pdf',
        data: { id: 't1', name: 'Template t1', dataJsonString: '', dataStructured: objects() },
    });
    let httpMock: HttpTestingController;

    const open = (params: { [key: string]: string }): ReportComponent => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatDialogModule, MatSnackBarModule, ReportComponent],
            providers: [
                ReportingService,
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => undefined } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstances: () => of({ result: [], total: 0 }) } },
                { provide: DeviceGroupsService, useValue: { getDeviceGroups: () => of({ result: [], total: 0 }) } },
                { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(ReportComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    const openNew = (): ReportComponent => {
        const component = open({ templateId: 't1' });
        httpMock.expectOne(base + '/templates/t1').flush({ data: template() });
        return component;
    };

    const openExisting = (): ReportComponent => {
        const component = open({ reportId: 'r1' });
        httpMock.expectOne(base + '/report/r1').flush({ data: stored() });
        httpMock.expectOne(base + '/templates/t1').flush({ data: template() });
        httpMock.match((req) => req.url.startsWith(base + '/report/job')).forEach((req) => req.flush({ data: [] }));
        return component;
    };

    /** The body as it goes over the wire: undefined fields are dropped by JSON. */
    const wire = (body: unknown) => JSON.parse(JSON.stringify(body));

    const edit = (component: ReportComponent, receiverIndex: number) => {
        component.form.controls.name.setValue('Renamed');
        component.form.controls.cron.setValue('0 0 2 * *');
        component.form.controls.emailSubject.setValue(null);
        component.addEmailAddress();
        component.emailReceivers.at(receiverIndex).setValue('c@d.e');
        findNode(component.nodes, 'consumption')!.form.get('query.path')?.setValue('root.other');
        findNode(component.nodes, 'label')!.form.get('value')?.setValue('new');
    };

    afterEach(() => httpMock.verify());

    it('should post a new report with the template, the values and no id', () => {
        const component = openNew();
        edit(component, 0);

        component.save();

        const req = httpMock.expectOne(base + '/report');
        expect(req.request.method).toBe('POST');
        expect(wire(req.request.body)).toEqual({
            templateId: 't1', name: 'Renamed', templateName: 'Template t1',
            data: jasmine.objectContaining({ label: jasmine.objectContaining({ value: 'new' }) }),
            cron: '0 0 2 * *', emailReceivers: ['c@d.e'],
        });
        expect(req.request.body.data.consumption.query.columns[0].name).toBe('root.other');
        expect('id' in req.request.body).toBe(false);
        req.flush('ok');
    });

    it('should put an existing report with its id, template and edited values', () => {
        const component = openExisting();
        edit(component, 1);

        component.update();

        const req = httpMock.expectOne(base + '/report');
        expect(req.request.method).toBe('PUT');
        expect(wire(req.request.body)).toEqual({
            id: 'r1', templateId: 't1', name: 'Renamed', templateName: 'Template t1',
            data: jasmine.objectContaining({ label: jasmine.objectContaining({ value: 'new' }) }),
            cron: '0 0 2 * *', emailReceivers: ['a@b.c', 'c@d.e'],
        });
        expect(req.request.body.data.consumption.query.columns[0].name).toBe('root.other');
        req.flush('ok');
    });

    it('should send an unsaved new report to the create job without an id', () => {
        const component = openNew();
        edit(component, 0);

        component.create();

        const req = httpMock.expectOne(base + '/report/create');
        expect(req.request.method).toBe('POST');
        expect('id' in req.request.body).toBe(false);
        expect(req.request.body.name).toBe('Renamed');
        expect(req.request.body.templateId).toBe('t1');
        expect(req.request.body.data.consumption.query.columns[0].name).toBe('root.other');
        req.flush({ id: 'r-new', jobId: 'j1' });
    });

    it('should send the edited form, not the stored report, to the create job of an existing report', () => {
        const component = openExisting();
        edit(component, 1);

        component.create();

        const req = httpMock.expectOne(base + '/report/create');
        expect(req.request.method).toBe('POST');
        expect(wire(req.request.body)).toEqual({
            id: 'r1', templateId: 't1', name: 'Renamed', templateName: 'Template t1',
            data: jasmine.objectContaining({ label: jasmine.objectContaining({ value: 'new' }) }),
            cron: '0 0 2 * *', emailReceivers: ['a@b.c', 'c@d.e'],
        });
        req.flush({ id: 'r1', jobId: 'j1' });
        httpMock.match((r) => r.url.startsWith(base + '/report/job')).forEach((r) => r.flush({ data: { id: 'j1', reportId: 'r1', status: 'done', createdAt: '' } }));
    });
});
