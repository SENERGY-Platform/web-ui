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

import { fakeAsync, tick } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { NewExportComponent } from './new-export.component';
import { ExportModel } from '../shared/export.model';
import { PipelineModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { OperatorModel } from '../../data/operator-repo/shared/operator.model';

// The component is built by hand instead of through TestBed: what is covered here is
// the load and save path of an export that already exists, and the template would pull
// in a dozen Material and mtx modules that say nothing about it.
const PIPELINE_ID = 'pipe-1';
const OPERATOR_ID = 'operator-a';
const OTHER_OPERATOR_ID = 'operator-b';

// A pipeline image as the flow designer stores it: lowercase viewbox, one joint-cell per
// operator, and no text nodes inside a cell. updateImage() relies on all three.
const cell = (id: string, x: number) =>
    '<g class="joint-cell" data-type="senergy.NodeElement" model-id="' +
    id +
    '" transform="translate(' +
    x +
    ',10)"><rect x="0" y="0" width="50" height="30" stroke="black"/></g>';

const PIPELINE_IMAGE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 200 100" width="200" height="100">' +
    '<g class="joint-cells-layer">' +
    cell(OPERATOR_ID, 10) +
    cell(OTHER_OPERATOR_ID, 100) +
    '</g></svg>';

const pipeline = {
    id: PIPELINE_ID,
    name: 'a pipeline',
    image: PIPELINE_IMAGE,
    operators: [
        {id: OPERATOR_ID, name: 'first', operatorId: 'op-repo-1'},
        {id: OTHER_OPERATOR_ID, name: 'second', operatorId: 'op-repo-2'},
    ],
} as PipelineModel;

const existingExport = () =>
    ({
        ID: 'export-1',
        Name: 'an export of a pipeline',
        Filter: PIPELINE_ID + ':' + OPERATOR_ID,
        FilterType: 'operatorId',
        EntityName: OPERATOR_ID,
        ServiceName: 'first',
        Topic: 'analytics-first',
        TimePath: 'analytics.stopping_time',
        ExportDatabaseID: 'timescale-db',
        TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
        Offset: 'smallest',
        Values: [{Name: 'overall_confidence', Path: 'analytics.overall_confidence', Type: 'float'}],
    }) as ExportModel;

const IMPORT_ID = 'import-1';
const IMPORT_TYPE_ID = 'import-type-1';

const importInstance = {
    id: IMPORT_ID,
    name: 'an import',
    import_type_id: IMPORT_TYPE_ID,
    kafka_topic: 'import-topic',
};

const importType = {
    id: IMPORT_TYPE_ID,
    name: 'an import type',
    output: {
        name: 'root',
        type: 'https://schema.org/StructuredValue',
        use_as_tag: false,
        sub_content_variables: [
            {name: 'value', type: 'https://schema.org/Float', use_as_tag: false, sub_content_variables: null},
        ],
    },
};

const existingImportExport = () =>
    ({
        ID: 'export-2',
        Name: 'an export of an import',
        Filter: IMPORT_ID,
        FilterType: 'import_id',
        EntityName: 'an import',
        ServiceName: IMPORT_TYPE_ID,
        Topic: 'import-topic',
        TimePath: 'time',
        ExportDatabaseID: 'timescale-db',
        Offset: 'largest',
        Values: [{Name: 'value', Path: 'value', Type: 'float'}],
    }) as ExportModel;

interface Harness {
    component: NewExportComponent;
    saved: () => ExportModel | undefined;
}

const openForEditing = (exp: ExportModel = existingExport()): Harness => {
    let saved: ExportModel | undefined;
    const component = new NewExportComponent(
        {snapshot: {paramMap: {get: () => 'export-1'}}} as any,
        {} as any,
        {getPipelines: () => of([pipeline])} as any,
        {getDeviceInstances: () => of({result: [], total: 0})} as any,
        {} as any,
        {
            getTimestampFormats: () => ['%Y-%m-%dT%H:%M:%S.%fZ'],
            getExportDatabases: () => of([]),
            getExport: () => of(exp),
            editExport: (_id: string, edited: ExportModel) => {
                saved = edited;
                return of({status: 200});
            },
        } as any,
        {} as any,
        {
            getOperator: () => of({outputs: [{name: 'value', type: 'float'}]} as OperatorModel),
            setPaths: () => new Map<string, string | undefined>([['analytics.overall_confidence', 'float']]),
        } as any,
        {navigate: () => undefined} as any,
        {bypassSecurityTrustHtml: (html: string) => html} as any,
        {open: () => undefined} as any,
        {listImportInstances: () => of([importInstance])} as any,
        {getImportType: () => of(importType)} as any,
        new UntypedFormBuilder(),
        {pageSize: 20} as any,
    );

    component.ngOnInit();
    tick(200); // the load defers twice: once for the form, once for onChanges

    return {component, saved: () => saved};
};

describe('NewExportComponent', () => {
    it('selects the exported operator in the pipeline image when an existing export is opened', fakeAsync(() => {
        const {component} = openForEditing();

        expect(component.operator.id).toBe(OPERATOR_ID);
        expect(component.exportForm.getRawValue().pipeline.id).toBe(PIPELINE_ID);
        // the selected operator is marked in the image, so there is an image to click at all
        expect(component.image as string).toContain('stroke="red"');
        expect(component.export.ID).toBe('export-1');
    }));

    it('keeps the operator and the time path of an export that is saved unchanged', fakeAsync(() => {
        const {component, saved} = openForEditing();

        // the edit button is bound to the form's validity, and only the fields of the
        // export's own source may take part in it
        expect(component.exportForm.valid).toBeTrue();
        component.onSubmit();

        expect(saved()?.Filter).toBe(PIPELINE_ID + ':' + OPERATOR_ID);
        expect(saved()?.TimePath).toBe('analytics.stopping_time');
    }));

    it('can save an export of an import, whose device field is out of reach of the edit', fakeAsync(() => {
        const {component, saved} = openForEditing(existingImportExport());

        expect(component.exportForm.valid).toBeTrue();
        component.onSubmit();

        expect(saved()?.Filter).toBe(IMPORT_ID);
        expect(saved()?.TimePath).toBe('time');
    }));

    it('saves the operator that was clicked in the pipeline image', fakeAsync(() => {
        const {component, saved} = openForEditing();

        // stands in for the [innerHtml] binding: selectOperator() hit-tests the rendered
        // image, so the image the component produced has to be in the document
        const rendered = new DOMParser().parseFromString(component.image as string, 'image/svg+xml').documentElement;
        document.body.appendChild(rendered);
        const clicked = rendered.querySelector('[model-id="' + OTHER_OPERATOR_ID + '"]') as SVGGraphicsElement;
        const box = clicked.getBoundingClientRect();
        component.selectOperator({target: clicked, x: box.left + 1, y: box.top + 1} as unknown as MouseEvent);
        tick();
        document.body.removeChild(rendered);

        component.onSubmit();

        expect(saved()?.Filter).toBe(PIPELINE_ID + ':' + OTHER_OPERATOR_ID);
        expect(saved()?.EntityName).toBe(OTHER_OPERATOR_ID);
        expect(saved()?.Topic).toBe('analytics-second');
    }));
});
