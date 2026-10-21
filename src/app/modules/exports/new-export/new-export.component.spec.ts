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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NewExportComponent } from './new-export.component';
import { ExportModel } from '../shared/export.model';
import { DeviceTypeModel, DeviceTypeServiceModel } from '../../metadata/device-types-overview/shared/device-type.model';
import { DeviceInstanceModel } from '../../devices/device-instances/shared/device-instances.model';
import { PipelineModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { OperatorModel } from '../../data/operator-repo/shared/operator.model';
import { OperatorRepoService } from '../../data/operator-repo/shared/operator-repo.service';
import { PipelineRegistryService } from '../../data/pipeline-registry/shared/pipeline-registry.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { ImportInstancesService } from '../../imports/import-instances/shared/import-instances.service';
import { ImportTypesService } from '../../imports/import-types/shared/import-types.service';
import { ImportInstancesModel } from '../../imports/import-instances/shared/import-instances.model';
import { BrokerExportService } from '../shared/broker-export.service';
import { ExportService } from '../shared/export.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { environment } from '../../../../environments/environment';
import { liveMarkup, withHostileMarkup } from '../../../core/svg-image.mock';

// The component is built in an injection context instead of rendered: what is covered here is
// the load and save path of an export that already exists, and the template would pull
// in a dozen Material and mtx modules that say nothing about it. Only the specs of the
// pipeline image render it, with the template cut down to the image.
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
    failNextSave: () => void;
}

// The image binding of the real template, for the specs that render the component.
const IMAGE_TEMPLATE = '<span class="widget-image" [innerHtml]="image" (click)="selectOperator($event)"></span>';

const openForEditing = (
    exp: ExportModel = existingExport(),
    id: string | null = 'export-1',
    rendered?: {image: string; fixture: (fixture: ComponentFixture<NewExportComponent>) => void; realTemplate?: boolean; loadDelay?: number},
): Harness => {
    let saved: ExportModel | undefined;
    let fail = false;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            // the router providers come first: they bring an ActivatedRoute of their own
            ...(rendered?.realTemplate ? [provideRouter([{path: 'exports/db', children: []}])] : []),
            { provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => id}}} },
            { provide: PipelineRegistryService, useValue: {getPipelines: () => of([rendered === undefined ? pipeline : {...pipeline, image: rendered.image}])} },
            { provide: DeviceInstancesService, useValue: {getDeviceInstances: () => of({result: [], total: 0})} },
            { provide: DeviceTypeService, useValue: {} },
            {
                provide: ExportService,
                useValue: {
                    getTimestampFormats: () => ['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ'],
                    getExportDatabases: () => of([]),
                    getExport: () => (rendered?.loadDelay ? of(exp).pipe(delay(rendered.loadDelay)) : of(exp)),
                    editExport: (_id: string, edited: ExportModel) => {
                        saved = {...edited};
                        const status = fail ? 400 : 200;
                        fail = false;
                        return of({status});
                    },
                    startPipeline: (created: ExportModel) => {
                        saved = created;
                        return of(created);
                    },
                },
            },
            { provide: BrokerExportService, useValue: {getExport: () => of(exp)} },
            {
                provide: OperatorRepoService,
                useValue: {
                    getOperator: () => of({outputs: [{name: 'value', type: 'float'}]} as OperatorModel),
                    setPaths: () => new Map<string, string | undefined>([['analytics.overall_confidence', 'float']]),
                },
            },
            ...(rendered?.realTemplate ? [] : [{ provide: Router, useValue: {navigate: () => undefined} }]),
            // a rendered spec keeps the real DomSanitizer, so what reaches the page is what Angular lets through
            ...(rendered === undefined ? [{ provide: DomSanitizer, useValue: {bypassSecurityTrustHtml: (html: string) => html} }] : []),
            { provide: MatSnackBar, useValue: {open: () => undefined} },
            { provide: ImportInstancesService, useValue: {listImportInstances: () => of([importInstance])} },
            {
                provide: ImportTypesService,
                useValue: {
                    // asynchronous like the HTTP call, so the form has recomputed its value when the answer arrives
                    getImportType: () => of(importType).pipe(delay(1)),
                    parseImportTypeExportValues: () => [{Name: 'value', Path: 'value', Type: 'float'}],
                },
            },
            { provide: FormBuilder, useValue: new FormBuilder() },
            { provide: PreferencesService, useValue: {pageSize: 20} },
        ],
    });
    let component: NewExportComponent;
    if (rendered === undefined) {
        component = TestBed.runInInjectionContext(() => new NewExportComponent());
        component.ngOnInit();
    } else {
        if (!rendered.realTemplate) {
            TestBed.overrideTemplate(NewExportComponent, IMAGE_TEMPLATE);
        }
        const fixture = TestBed.createComponent(NewExportComponent);
        component = fixture.componentInstance;
        rendered.fixture(fixture);
        fixture.detectChanges(); // runs ngOnInit
    }
    tick(200); // the load defers twice: once for the form, once for onChanges

    return {component, saved: () => saved, failNextSave: () => (fail = true)};
};

interface CreateHarness {
    component: NewExportComponent;
    navigate: jasmine.Spy;
    snackOpen: jasmine.Spy;
}

// Opens the form for a new export of a device, with the given answer of the export service.
const openForCreating = (
    startPipeline: (created: ExportModel) => Observable<ExportModel | null>,
    deviceType: DeviceTypeModel | null = null,
): CreateHarness => {
    const navigate = jasmine.createSpy('navigate');
    const snackOpen = jasmine.createSpy('open');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}} },
            { provide: PipelineRegistryService, useValue: {getPipelines: () => of([])} },
            { provide: DeviceInstancesService, useValue: {getDeviceInstances: () => of({result: [], total: 0})} },
            { provide: DeviceTypeService, useValue: {getDeviceType: () => of(deviceType)} },
            {
                provide: ExportService,
                useValue: {
                    getTimestampFormats: () => [],
                    getExportDatabases: () => of([]),
                    startPipeline,
                },
            },
            { provide: BrokerExportService, useValue: {startPipeline} },
            { provide: OperatorRepoService, useValue: {} },
            { provide: Router, useValue: {navigate} },
            { provide: DomSanitizer, useValue: {bypassSecurityTrustHtml: (html: string) => html} },
            { provide: MatSnackBar, useValue: {open: snackOpen} },
            { provide: ImportInstancesService, useValue: {listImportInstances: () => of([])} },
            { provide: ImportTypesService, useValue: {} },
            { provide: FormBuilder, useValue: new FormBuilder() },
            { provide: PreferencesService, useValue: {pageSize: 20} },
        ],
    });
    const component = TestBed.runInInjectionContext(() => new NewExportComponent());
    component.ngOnInit();
    tick(200);
    component.exportForm.patchValue({name: 'an export', selector: 'device', targetSelector: component.targetDb});
    component.exportForm.patchValue({device: {id: 'device-1', name: 'a device'} as any});
    component.exportForm.patchValue({service: {id: 'urn:service:1', name: 'a service', outputs: []} as any});
    // Whether the form is valid is not what is under test; only the answer of the service is.
    Object.defineProperty(component.exportForm, 'valid', {get: () => true});
    return {component, navigate, snackOpen};
};

describe('NewExportComponent', () => {
    it('creates an export, navigates to the list and reports success', fakeAsync(() => {
        const {component, navigate, snackOpen} = openForCreating(() => of({ID: 'new-1'} as ExportModel));

        component.onSubmit();

        expect(navigate).toHaveBeenCalledWith(['/exports', 'db']);
        expect(snackOpen).toHaveBeenCalledWith('Export created', undefined, {duration: 2000});
    }));

    it('stays on the form and reports an error when the export could not be created', fakeAsync(() => {
        const {component, navigate, snackOpen} = openForCreating(() => of(null));

        component.onSubmit();

        expect(navigate).not.toHaveBeenCalled();
        expect(snackOpen).not.toHaveBeenCalledWith('Export created', undefined, jasmine.anything());
        expect(snackOpen).toHaveBeenCalledWith('Error while creating the export!', 'close', {panelClass: 'snack-bar-error'});
    }));

    it('selects the exported operator in the pipeline image when an existing export is opened', fakeAsync(() => {
        const {component} = openForEditing();

        expect(component.operator.id).toBe(OPERATOR_ID);
        expect(component.exportForm.getRawValue().pipeline?.id).toBe(PIPELINE_ID);
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

    describe('pipeline image', () => {
        let fixture: ComponentFixture<NewExportComponent>;
        const open = () => openForEditing(existingExport(), 'export-1', {image: withHostileMarkup(PIPELINE_IMAGE), fixture: (f) => (fixture = f)});
        const operatorRect = (id: string) => fixture.nativeElement.querySelector('.widget-image [model-id="' + id + '"] > rect') as SVGRectElement;

        it('puts the image into the page without anything that runs script, with the exported operator marked', fakeAsync(() => {
            open();
            fixture.detectChanges();

            const image = fixture.nativeElement.querySelector('.widget-image') as HTMLElement;
            expect(image.querySelectorAll('svg').length).toBe(1);
            expect(liveMarkup(image)).toEqual([]);
            expect(operatorRect(OPERATOR_ID).getAttribute('stroke')).toBe('red');
            expect(operatorRect(OTHER_OPERATOR_ID).getAttribute('stroke')).toBe('black');
        }));

        it('saves the operator that was clicked in the rendered image', fakeAsync(() => {
            const {component, saved} = open();
            fixture.detectChanges();

            const box = operatorRect(OTHER_OPERATOR_ID).getBoundingClientRect();
            operatorRect(OTHER_OPERATOR_ID).dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: box.left + 1, clientY: box.top + 1}));
            tick();
            fixture.detectChanges();
            component.onSubmit();

            expect(operatorRect(OTHER_OPERATOR_ID).getAttribute('stroke')).toBe('red');
            expect(saved()?.Filter).toBe(PIPELINE_ID + ':' + OTHER_OPERATOR_ID);
        }));
    });

    it('sets the time path and its format when an operator is chosen', fakeAsync(() => {
        const {component} = openForEditing();
        component.exportForm.patchValue({timestampFormat: null});
        component.formatControl.setValue('');

        component.operatorChanged(pipeline.operators[1]);
        tick();

        expect(component.exportForm.getRawValue().timePath).toBe('time');
        expect(component.exportForm.getRawValue().timestampFormat).toBe('%Y-%m-%dT%H:%M:%S.%fZ');
        expect(component.formatControl.value).toBe('%Y-%m-%dT%H:%M:%S.%fZ');
    }));

    it('sets the time path and the seconds format when an import is chosen', fakeAsync(() => {
        const {component, saved} = openForEditing(existingImportExport(), null);
        component.exportForm.patchValue({selector: 'import', name: 'a new export'});

        component.exportForm.get('import')?.setValue(importInstance as unknown as ImportInstancesModel);
        tick(10);

        expect(component.exportForm.getRawValue().timePath).toBe('time');
        expect(component.exportForm.getRawValue().timestampFormat).toBe('%Y-%m-%dT%H:%M:%SZ');
        expect(component.formatControl.value).toBe('%Y-%m-%dT%H:%M:%SZ');
        component.onSubmit();
        expect(saved()?.TimestampFormat).toBe('%Y-%m-%dT%H:%M:%SZ');
    }));

    it('shows an export created from the import dialog as consuming all messages and keeps its offset', fakeAsync(() => {
        const {component, saved} = openForEditing({...existingImportExport(), Offset: 'earliest'});

        expect(component.exportForm.getRawValue().allMessages).toBeTrue();
        component.onSubmit();
        expect(saved()?.Offset).toBe('earliest');
    }));

    it('keeps the earliest offset when a save that changed it failed and the change is undone', fakeAsync(() => {
        const {component, saved, failNextSave} = openForEditing({...existingImportExport(), Offset: 'earliest'});

        failNextSave();
        component.exportForm.patchValue({allMessages: false});
        component.onSubmit();
        expect(saved()?.Offset).toBe('largest');

        component.exportForm.patchValue({allMessages: true});
        component.onSubmit();
        expect(saved()?.Offset).toBe('earliest');
    }));

    it('stops the save of a database export while two values share a name or one takes the time column', fakeAsync(() => {
        const {component} = openForEditing(existingImportExport());

        component.addValue('value', 'value.other', 'float');
        expect(component.exportForm.valid).toBeFalse();
        expect(component.nameError(component.exportValues.at(1))).toBe('Name is used more than once');
        expect(component.invalidNames()).toEqual(['value']);

        component.exportValues.at(1).patchValue({Name: 'time'});
        expect(component.nameError(component.exportValues.at(1))).toBe('Name is taken by the time column');
        expect(component.exportForm.valid).toBeFalse();

        component.exportValues.at(1).patchValue({Name: 'other'});
        expect(component.exportForm.valid).toBeTrue();
        expect(component.invalidNames()).toEqual([]);
    }));

    it('lets a broker export send two values under one name', fakeAsync(() => {
        const {component} = openForEditing(existingImportExport());
        component.exportForm.get('targetSelector')?.setValue(component.targetBroker, {emitEvent: false});

        component.addValue('value', 'value.other', 'float');
        expect(component.exportForm.valid).toBeTrue();
        expect(component.nameError(component.exportValues.at(1))).toBe('');
    }));

    describe('saved payload', () => {
        const wire = (created: ExportModel | undefined) => JSON.parse(JSON.stringify(created));
        const FLOAT = 'https://schema.org/Float';
        const STRUCTURE = 'https://schema.org/StructuredValue';
        const service = {
            id: 'urn:infai:ses:service:abc#1',
            name: 'get_temperature',
            outputs: [{
                content_variable: {
                    name: 'metrics',
                    type: STRUCTURE,
                    sub_content_variables: [
                        {name: 'level', type: FLOAT},
                        {name: 'time', type: 'https://schema.org/Text', characteristic_id: environment.timeStampCharacteristicId},
                    ],
                },
            }],
        };
        const device = {id: 'urn:infai:ses:device:1', name: 'a device', device_type_id: 'dt-1'};

        it('sends a new database export of a device as before', fakeAsync(() => {
            let sent: ExportModel | undefined;
            const {component} = openForCreating((created) => (sent = created, of(created)), {services: [service]} as unknown as DeviceTypeModel);
            component.exportForm.patchValue({device: device as unknown as DeviceInstanceModel});
            component.exportForm.patchValue({name: 'a name', description: 'a description', exportDatabaseId: 'timescale-db', service: service as unknown as DeviceTypeServiceModel});
            tick();
            component.exportForm.patchValue({allMessages: true});

            component.onSubmit();

            expect(wire(sent)).toEqual({
                Name: 'a name',
                Description: 'a description',
                TimePath: 'value.metrics.time',
                Values: [{Name: 'level', Path: 'value.metrics.level', Type: 'float', Tag: false}],
                ExportDatabaseID: 'timescale-db',
                TimestampFormat: null,
                EntityName: 'a device',
                Filter: 'urn:infai:ses:device:1',
                FilterType: 'deviceId',
                ServiceName: 'get_temperature',
                Topic: 'urn_infai_ses_service_abc_1',
                Offset: 'smallest',
            });
        }));

        it('sends a new broker export with its own broker as before', fakeAsync(() => {
            let sent: ExportModel | undefined;
            const {component} = openForCreating((created) => (sent = created, of(created)), {services: [service]} as unknown as DeviceTypeModel);
            component.exportForm.patchValue({device: device as unknown as DeviceInstanceModel});
            component.exportForm.patchValue({name: 'a name', service: service as unknown as DeviceTypeServiceModel});
            tick();
            component.exportForm.controls.targetSelector.setValue(component.targetBroker);
            component.exportForm.controls.customBrokerEnabled.setValue(true);
            component.exportForm.patchValue({
                customMqttBroker: 'tcp://broker:1883',
                customMqttUser: 'a user',
                customMqttPassword: 'a password',
                customMqttBaseTopic: 'base/',
            });

            component.onSubmit();

            expect(wire(sent)).toEqual({
                Name: 'a name',
                Description: null,
                TimePath: 'value.metrics.time',
                Values: [
                    {Name: 'value/metrics', Path: 'value.metrics', Type: 'string_json', Tag: false},
                    {Name: 'value/metrics/level', Path: 'value.metrics.level', Type: 'float', Tag: false},
                    {Name: 'value/metrics/time', Path: 'value.metrics.time', Type: 'string', Tag: false},
                ],
                CustomMqttBroker: 'tcp://broker:1883',
                CustomMqttUser: 'a user',
                CustomMqttPassword: 'a password',
                CustomMqttBaseTopic: 'base/',
                ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                TimestampFormat: null,
                EntityName: 'a device',
                Filter: 'urn:infai:ses:device:1',
                FilterType: 'deviceId',
                ServiceName: 'get_temperature',
                Topic: 'urn_infai_ses_service_abc_1',
                Offset: 'largest',
            });
        }));

        it('sends an edited export of a pipeline as before', fakeAsync(() => {
            const {component, saved} = openForEditing();
            component.exportForm.patchValue({name: 'renamed', description: 'described', allMessages: true});
            component.addValue('extra', 'analytics.extra', 'string', true);

            component.onSubmit();

            expect(wire(saved())).toEqual({
                ID: 'export-1',
                Name: 'renamed',
                Description: 'described',
                Filter: PIPELINE_ID + ':' + OPERATOR_ID,
                FilterType: 'operatorId',
                EntityName: OPERATOR_ID,
                ServiceName: 'first',
                Topic: 'analytics-first',
                TimePath: 'analytics.stopping_time',
                ExportDatabaseID: 'timescale-db',
                TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
                Offset: 'smallest',
                Values: [
                    {Name: 'overall_confidence', Path: 'analytics.overall_confidence', Type: 'float', Tag: false},
                    {Name: 'extra', Path: 'analytics.extra', Type: 'string', Tag: true},
                ],
            });
        }));

        it('sends an edited export of an import as before', fakeAsync(() => {
            const {component, saved} = openForEditing(existingImportExport());
            component.exportForm.patchValue({name: 'renamed'});
            component.exportValues.at(0).patchValue({Name: 'renamed_value'});

            component.onSubmit();

            expect(wire(saved())).toEqual({
                ID: 'export-2',
                Name: 'renamed',
                Filter: IMPORT_ID,
                FilterType: 'import_id',
                EntityName: 'an import',
                ServiceName: IMPORT_TYPE_ID,
                Topic: 'import-topic',
                TimePath: 'time',
                ExportDatabaseID: 'timescale-db',
                Offset: 'largest',
                Values: [{Name: 'renamed_value', Path: 'value', Type: 'float', Tag: false}],
            });
        }));
    });

    describe('page', () => {
        let fixture: ComponentFixture<NewExportComponent>;
        const render = (exp: ExportModel = existingExport(), id: string | null = 'export-1') =>
            openForEditing(exp, id, {image: PIPELINE_IMAGE, fixture: (f) => (fixture = f), realTemplate: true});
        const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
        const status = () => el('senergy-save-bar .status').textContent;
        const barButton = (name: string) => el('senergy-save-bar button.' + name) as HTMLButtonElement;

        it('titles an export that is edited by its stored name and links back to its list', fakeAsync(() => {
            const {component} = render();
            fixture.detectChanges();

            expect(el('.page-title').textContent).toBe('an export of a pipeline');
            expect(el('a.page-back').getAttribute('href')).toBe('/exports/db');
            expect(barButton('save').textContent?.trim()).toBe('Save');
            expect(barButton('save').disabled).toBeFalse();
            expect(status()).toBe('Editing');
            expect(component.listLink).toBe('/exports/db');
        }));

        it('titles a new export and starts it only once the form is valid', fakeAsync(() => {
            render(existingExport(), null);
            fixture.detectChanges();

            expect(el('.page-title').textContent).toBe('New export');
            expect(barButton('save').textContent?.trim()).toBe('Start export');
            expect(barButton('save').disabled).toBeTrue();
            expect(status()).toBe('Fill in the required fields to start the export');
        }));

        it('links an export of the broker list back to it', fakeAsync(() => {
            const {component} = openForEditing(existingExport(), BrokerExportService.ID_PREFIX + 'one');
            expect(component.listLink).toBe('/exports/broker');
        }));

        it('has no submit button in the form, so Enter in a field neither submits nor removes a value', fakeAsync(() => {
            render();
            fixture.detectChanges();

            const submits = Array.from(fixture.nativeElement.querySelectorAll('form button') as NodeListOf<HTMLButtonElement>).filter((b) => b.type === 'submit');
            expect(submits).toEqual([]);
        }));

        it('saves from the save bar', fakeAsync(() => {
            const {saved} = render();
            fixture.detectChanges();

            barButton('save').click();

            expect(saved()?.Name).toBe('an export of a pipeline');
        }));

        it('reloads the stored export when Discard is clicked, dropping every edit', fakeAsync(() => {
            const {component, saved} = render();
            fixture.detectChanges();
            component.operatorChanged(pipeline.operators[1]);
            tick();
            component.exportForm.patchValue({name: 'changed', allMessages: false});
            component.exportForm.markAsDirty();
            component.deleteValue(0);
            component.addValue('extra', 'analytics.extra', 'string');
            fixture.detectChanges();
            expect(status()).toBe('Unsaved changes');

            barButton('discard').click();
            tick(200);
            fixture.detectChanges();

            expect(component.exportForm.getRawValue().name).toBe('an export of a pipeline');
            expect(component.exportForm.getRawValue().allMessages).toBeTrue();
            expect(component.exportForm.getRawValue().timePath).toBe('analytics.stopping_time');
            expect(component.exportValues.getRawValue().map((v) => v.Name)).toEqual(['overall_confidence']);
            expect(component.operator.id).toBe(OPERATOR_ID);
            expect(component.exportForm.dirty).toBeFalse();
            expect(status()).toBe('Editing');
            expect(el('.operator-selected').textContent).toContain(OPERATOR_ID);
            component.onSubmit();
            expect(saved()?.Filter).toBe(PIPELINE_ID + ':' + OPERATOR_ID);
            expect(saved()?.Name).toBe('an export of a pipeline');
            expect(saved()?.Offset).toBe('smallest');
        }));

        it('loads the stored values once when Discard is clicked while the export is still loading', fakeAsync(() => {
            const {component} = openForEditing(existingExport(), 'export-1', {image: PIPELINE_IMAGE, fixture: (f) => (fixture = f), realTemplate: true, loadDelay: 1000});
            fixture.detectChanges();

            barButton('discard').click();
            tick(2000);
            fixture.detectChanges();

            expect(component.exportValues.getRawValue().map((v) => v.Name)).toEqual(['overall_confidence']);
            expect(status()).toBe('Editing');
        }));

        it('keeps the edits when Discard cannot load the stored export again', fakeAsync(() => {
            const {component, saved} = render();
            fixture.detectChanges();
            component.exportForm.patchValue({name: 'changed'});
            component.exportForm.markAsDirty();
            component.addValue('extra', 'analytics.extra', 'string');
            fixture.detectChanges();
            TestBed.inject(ExportService).getExport = () => of(null);

            barButton('discard').click();
            tick(200);
            fixture.detectChanges();

            expect(component.exportForm.getRawValue().name).toBe('changed');
            expect(component.exportValues.getRawValue().map((v) => v.Name)).toEqual(['overall_confidence', 'extra']);
            expect(status()).toBe('Unsaved changes');
            component.onSubmit();
            expect(saved()?.Filter).toBe(PIPELINE_ID + ':' + OPERATOR_ID);
        }));

        it('leaves for the list of the chosen target when Discard is clicked on a new export', fakeAsync(() => {
            const {component, navigate} = openForCreating(() => of(null));

            component.discard();
            expect(navigate).toHaveBeenCalledWith(['/exports/db']);

            component.exportForm.controls.targetSelector.setValue(component.targetBroker);
            component.discard();
            expect(navigate).toHaveBeenCalledWith(['/exports/broker']);
        }));
    });
});
