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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MtxSelectModule } from '@ng-matero/extensions/select';

import { ReportObjectComponent } from './report-object.component';
import { ReportObjectModel } from '../../shared/reporting.model';
import { buildReportObjectsForm, groupOf } from '../../shared/report-object-form';
import { ReportObjectNode, buildReportObjectNodes, findNode } from '../../shared/report-object-node';
import { ReportObjectViewService } from '../../shared/report-object-view.service';
import { DeviceInstanceModel } from '../../../devices/device-instances/shared/device-instances.model';

const device = { id: 'd1', name: 'Device 1', display_name: 'Device 1', device_type_id: 'dt1' } as DeviceInstanceModel;

const query = (path = 'root.value', deviceId = 'd1', serviceId = 's1') =>
    ({ columns: [{ name: path }], deviceId, serviceId });

const objects = (): { [key: string]: ReportObjectModel } => ({
    title: { name: 'title', valueType: 'string', value: 'a' } as ReportObjectModel,
    group: {
        name: 'group', valueType: 'object',
        fields: { inner: { name: 'inner', valueType: 'string', value: 'b' } as ReportObjectModel },
    } as unknown as ReportObjectModel,
    last: { name: 'last', valueType: 'string', deviceQuery: { last: '90d' } } as ReportObjectModel,
    table: {
        name: 'table', valueType: 'array', length: 2,
        children: {
            '0': { name: 'consumption', valueType: 'float64', query: query() } as ReportObjectModel,
            '1': { name: 'consumption', valueType: 'float64', query: query('root.time') } as ReportObjectModel,
        },
    } as unknown as ReportObjectModel,
});

describe('ReportObjectComponent', () => {
    let component: ReportObjectComponent;
    let fixture: ComponentFixture<ReportObjectComponent>;
    let viewService: ReportObjectViewService;
    let nodes: ReportObjectNode[];

    const select = (path: string) => {
        component.node = findNode(nodes, path)!;
        component.allDevices = [device];
        component.ngOnChanges();
        fixture.detectChanges();
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportObjectComponent],
            imports: [
                CommonModule,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatButtonToggleModule,
                MatIconModule,
                MatTooltipModule,
                MatDialogModule,
                MatSnackBarModule,
                MtxSelectModule,
            ],
            providers: [ReportObjectViewService],
        }).compileComponents();
        fixture = TestBed.createComponent(ReportObjectComponent);
        component = fixture.componentInstance;
        viewService = TestBed.inject(ReportObjectViewService);
        const data = objects();
        nodes = buildReportObjectNodes(data, buildReportObjectsForm(data));
    }));

    it('should create', () => {
        select('title');
        expect(component).toBeTruthy();
    });

    it('should edit a value object', () => {
        select('title');

        expect(component.inputType).toBe('value');
        expect(component.hasValueInput).toBe(true);
        expect(component.isContainer).toBe(false);
        expect(component.supportsQuery).toBe(true);
    });

    it('should edit a query object', () => {
        select('table.0');

        expect(component.inputType).toBe('query');
        expect(component.queryForm).toBeDefined();
    });

    it('should edit a device query', () => {
        select('last');

        expect(component.inputType).toBe('devices');
        expect(component.deviceQueryLastValues).toContain('90d');
    });

    it('should switch the input type without losing the other inputs', () => {
        select('table.0');

        component.form.controls['inputType'].setValue('devices');

        expect(component.inputType).toBe('devices');
        expect(component.queryForm?.disabled).toBe(true);

        component.form.controls['inputType'].setValue('query');

        expect(component.queryForm?.controls['path'].value).toBe('root.value');
    });

    it('should not offer input types for objects', () => {
        select('group');

        expect(component.supportsQuery).toBe(false);
        expect(component.isContainer).toBe(true);
        expect(component.hasValueInput).toBe(false);
    });

    it('should offer input types for arrays, which can be filled by a query', () => {
        select('table');

        expect(component.supportsQuery).toBe(true);
        expect(component.isContainer).toBe(true);
    });

    it('should select a nested object of a container', () => {
        select('table');
        expect(component.node.children.length).toBe(2);

        component.select(component.node.children[1]);

        expect(viewService.selectedPath).toBe('table.1');
    });

    it('should apply the input type of the object that is selected next', () => {
        select('table.0');

        select('title');
        component.form.controls['inputType'].setValue('query');

        expect(groupOf(component.form, 'query')?.enabled).toBe(true);
        expect(groupOf(findNode(nodes, 'table.0')!.form, 'query')?.enabled).toBe(true);
    });
});
