/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../devices/device-instances/shared/device-instances.model';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../metadata/device-types-overview/shared/device-type.model';
import {
    columnNameError,
    DatabaseType,
    duplicateValueNames,
    ExportDatabaseModel,
    ExportModel,
    ExportValueModel,
    invalidColumnNames,
} from '../shared/export.model';
import { ExportService } from '../shared/export.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PipelineModel, PipelineOperatorModel } from '../../data/pipeline-registry/shared/pipeline.model';
import { PipelineRegistryService } from '../../data/pipeline-registry/shared/pipeline-registry.service';
import { ActivatedRoute, Router } from '@angular/router';
import {IOModel, OperatorModel, typeBoolean, typeFloat, typeList, typeInteger, typeString, typeStructure} from '../../data/operator-repo/shared/operator.model';
import { OperatorRepoService } from '../../data/operator-repo/shared/operator-repo.service';
import { environment } from '../../../../environments/environment';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ImportInstancesService } from '../../imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../imports/import-instances/shared/import-instances.model';
import { ImportTypeContentVariableModel, ImportTypeModel } from '../../imports/import-types/shared/import-types.model';
import { ImportTypesService } from '../../imports/import-types/shared/import-types.service';
import { map, takeUntil } from 'rxjs/operators';
import { AbstractControl, FormArray, FormControl, FormGroup, FormBuilder, ValidationErrors, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as _ from 'lodash';
import { BrokerExportService } from '../shared/broker-export.service';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { AddTagFn } from '../../../core/model/mtx-select.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { ErrorStateMatcher } from '@angular/material/core';
import { stateMatcher } from '../../data/operator-repo/shared/operator-validation';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { SaveBarComponent } from '../../../core/components/save-bar/save-bar.component';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { parseSvgImage, svgImageMarkup } from '../../../core/svg-image';

type ExportValueGroup = FormGroup<{
    Name: FormControl<string | null>;
    Path: FormControl<string | null>;
    Type: FormControl<string | null>;
    Tag: FormControl<boolean | null>;
}>;

@Component({
    selector: 'senergy-new-export',
    templateUrl: './new-export.component.html',
    styleUrls: ['./new-export.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatIconButton, MatTooltip, MatIcon, FormsModule, ReactiveFormsModule, MatRadioGroup, MatRadioButton, MatFormField, MatLabel, MtxSelect, MtxOption, MatError, MatErrorMessagesDirective, MatSlideToggle, MatInput, MatCheckbox, MatPaginator, MatButton, SpinnerComponent, KeyValuePipe, PageHeaderComponent, FormSectionComponent, SaveBarComponent]
})
export class NewExportComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private destroyRef = inject(DestroyRef);
    /** Ends the form's change handlers: when the page goes, and when Discard reloads the export. */
    private readonly detach$ = new Subject<void>();
    private changesTimer: ReturnType<typeof setTimeout> | undefined;
    private pipelineRegistryService = inject(PipelineRegistryService);
    private deviceInstanceService = inject(DeviceInstancesService);
    private deviceTypeService = inject(DeviceTypeService);
    private exportService = inject(ExportService);
    private brokerExportService = inject(BrokerExportService);
    private operatorRepoService = inject(OperatorRepoService);
    private router = inject(Router);
    private sanitizer = inject(DomSanitizer);
    snackBar = inject(MatSnackBar);
    private importInstancesService = inject(ImportInstancesService);
    private importTypesService = inject(ImportTypesService);
    private fb = inject(FormBuilder);
    private preferencesService = inject(PreferencesService);

    targetDb = 'db';
    targetBroker = 'broker';
    defaultPageSize = this.preferencesService.pageSize;
    offset = 0;
    lastPageEvent: PageEvent | undefined;

    formatControl = new FormControl('');
    timestamp_formats: string[] = [];

    exportForm = this.fb.group({
        selector: ['', Validators.required],
        targetSelector: [this.targetDb, Validators.required],
        customBrokerEnabled: this.fb.control<string | boolean | null>(''),
        customMqttBroker: this.fb.control<string | null | undefined>(undefined),
        customMqttUser: this.fb.control<string | null | undefined>(undefined),
        customMqttPassword: this.fb.control<string | null | undefined>(undefined),
        customMqttBaseTopic: this.fb.control<string | null | undefined>(undefined),
        name: ['', Validators.required],
        description: '',
        device: this.fb.control<DeviceInstanceModel | null>(null, Validators.required),
        service: this.fb.control<DeviceTypeServiceModel | null>(
            {
                value: null,
                disabled: true,
            },
            Validators.required,
        ),
        timePath: this.fb.control<string | null>({value: '', disabled: true}),
        allMessages: false,
        import: this.fb.control<ImportInstancesModel | null>({value: null, disabled: true}, Validators.required),
        operator: this.fb.control<PipelineOperatorModel | null>({value: null, disabled: true}, Validators.required),
        pipeline: this.fb.control<PipelineModel | null>({value: null, disabled: true}, Validators.required),
        // Without a disabled key this is no boxed value: the control starts as this object until ngOnInit patches the id.
        exportDatabaseId: this.fb.control<string | { value: string } | null>({value: environment.exportDatabaseIdInternalTimescaleDb}, Validators.required),
        timestampFormat: [''],
        exportValues: this.fb.array<ExportValueGroup>([], (array: AbstractControl) => this.columnNamesError(array)),
    });

    private readonly nameMatchers = new WeakMap<AbstractControl, ErrorStateMatcher>();
    /** The offset the export was loaded with; this.export.Offset is overwritten by a save that may still fail. */
    private storedOffset: string | undefined;

    ready = true;
    /** The name the export was loaded with, for the page title. */
    savedName = '';
    export = {} as ExportModel;
    deviceType = {} as DeviceTypeModel;
    operator = {} as PipelineOperatorModel;
    devices: DeviceInstanceModel[] = [];
    pipelines: PipelineModel[] = [];
    paths = new Map<string, string | undefined>();
    image: SafeHtml = '';
    showImage = false;
    imports: ImportInstancesModel[] = [];
    importTypes: Map<string, ImportTypeModel> = new Map();

    timeSuggest = '';

    dropdown = ['float', 'string', 'int', 'bool', 'string_json'];

    typeString = typeString;
    typeInteger = typeInteger;
    typeFloat = typeFloat;
    typeBoolean = typeBoolean;
    typeList = typeList;
    typeStructure = typeStructure;

    id: string | null = null;

    exportDatabases: ExportDatabaseModel[] = [];

    constructor() {
        this.id = this.route.snapshot.paramMap.get('id');

        if (this.id) {
            this.ready = false;
        }
        this.timestamp_formats = this.exportService.getTimestampFormats();
        this.exportForm.patchValue({selector: 'device'});
        this.destroyRef.onDestroy(() => this.detach$.next());
    }

    ngOnInit() {
        if (this.id) {
            this.exportForm.controls['selector'].disable({onlySelf: true, emitEvent: false});
            this.exportForm.controls['targetSelector'].setValue(
                this.id.startsWith(BrokerExportService.ID_PREFIX) ? this.targetBroker : this.targetDb,
            );
            this.exportForm.controls['targetSelector'].disable({onlySelf: true, emitEvent: false});
        }
        const array: Observable<DeviceInstanceModel[] | PipelineModel[] | ImportInstancesModel[] | ExportDatabaseModel[]>[] = [];

        array.push(this.deviceInstanceService.getDeviceInstances({limit: 9999, offset: 0}).pipe(map(res => res.result)));
        array.push(this.pipelineRegistryService.getPipelines());
        array.push(this.importInstancesService.listImportInstances('', 9999, 0, 'name.asc'));
        array.push(this.exportService.getExportDatabases());

        forkJoin(array).subscribe((response) => {
            this.devices = response[0] as DeviceInstanceModel[];
            this.pipelines = response[1] as PipelineModel[];
            this.imports = response[2] as ImportInstancesModel[];
            this.exportDatabases = response[3] as ExportDatabaseModel[];
            this.exportForm.patchValue({exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb});
            setTimeout(() => {
                if (this.id !== null) {
                    this.loadExport(this.id);
                } else {
                    this.onChanges();
                }
            }, 0);
            this.ready = true;
        });
    }

    /**
     * Loads the stored export into the form; the form's change handlers attach only afterwards, so the patches do not trigger them.
     * A Discard ends a load still in flight through `detach$`, so its answer cannot add the values a second time, and
     * clears the edits only once the export arrived, so a failed reload keeps them.
     */
    private loadExport(id: string, reload = false) {
        const obs = (
            id.startsWith(BrokerExportService.ID_PREFIX) ? this.brokerExportService : this.exportService
        ).getExport(id);
        obs.pipe(takeUntil(this.detach$)).subscribe((exp: ExportModel | null) => {
            if (exp !== null) {
                if (reload) {
                    this.resetLoadedState();
                }
                this.exportForm.patchValue({
                    name: exp.Name,
                    description: exp.Description,
                    timePath: exp.TimePath,
                    customBrokerEnabled: exp.CustomMqttBroker !== undefined && exp.CustomMqttBroker !== null,
                    customMqttBroker: exp.CustomMqttBroker,
                    customMqttUser: exp.CustomMqttUser,
                    customMqttPassword: exp.CustomMqttPassword,
                    customMqttBaseTopic: exp.CustomMqttBaseTopic,
                    exportDatabaseId: exp.ExportDatabaseID,
                    timestampFormat: exp.TimestampFormat,
                });
                exp.Values.forEach(v => this.addValue(v.Name, v.Path, v.Type, v.Tag));
                this.storedOffset = exp.Offset;
                // an export created from the import dialog says earliest, the form itself writes smallest
                if (exp.Offset === 'smallest' || exp.Offset === 'earliest') {
                    this.exportForm.patchValue({allMessages: true});
                }
                if (exp.FilterType === 'deviceId') {
                    this.exportForm.patchValue({selector: 'device'});
                    this.disableUnusedSources('device');
                    setTimeout(() => {
                        this.devices.forEach((device) => {
                            if (device.id === exp.Filter) {
                                this.exportForm.patchValue({device});
                                this.deviceTypeService
                                    .getDeviceType(device.device_type_id)
                                    .subscribe((resp: DeviceTypeModel | null) => {
                                        if (resp !== null) {
                                            this.deviceType = resp;
                                            this.deviceType.services.forEach((service) => {
                                                if (service.id === exp.Topic!.replace(/_/g, ':')) {
                                                    this.exportForm.patchValue({service});
                                                    service.outputs.forEach((out: DeviceTypeContentModel) => {
                                                        const pathString = 'value';
                                                        this.traverseDataStructure(pathString, out.content_variable);
                                                    });
                                                }
                                            });
                                        }
                                    });
                            }
                        });
                    });
                } else if (exp.FilterType === 'operatorId') {
                    this.exportForm.patchValue({selector: 'pipe'});
                    this.disableUnusedSources('pipe');
                    this.pipelines.forEach((pipeline) => {
                        if (pipeline.id === exp.Filter.split(':')[0]) {
                            this.exportForm.patchValue({pipeline});
                            pipeline.operators.forEach((operator: PipelineOperatorModel) => {
                                if (operator.id === exp.Filter.split(':')[1]) {
                                    this.operator = operator;
                                    this.updateImage(this.operator.id);
                                    this.operatorRepoService
                                        .getOperator(operator.operatorId)
                                        .subscribe((resp: OperatorModel | null) => {
                                            this.paths = this.operatorRepoService.setPaths(resp);
                                            this.paths.set('time', 'string');
                                            this.paths.set('analytics', this.typeStructure);
                                        });
                                }
                            });
                        }
                    });
                } else if (exp.FilterType === 'pipeId') {
                    if (!reload) {
                        this.snackBar.open('Outdated export version - Please reconfigure and redeploy the export', 'close', {
                            duration: 5000,
                            verticalPosition: 'top',
                            panelClass: 'snack-bar-error'
                        });
                    }
                    this.exportForm.patchValue({selector: 'pipe'});
                    this.disableUnusedSources('pipe');
                    this.pipelines.forEach((pipeline) => {
                        if (pipeline.id === exp.Filter) {
                            this.exportForm.patchValue({pipeline});
                            if (pipeline.operators.length === 1) {
                                this.operator = pipeline.operators[0];
                                this.operatorRepoService
                                    .getOperator(this.operator.operatorId)
                                    .subscribe((resp: OperatorModel | null) => {
                                        this.paths = this.operatorRepoService.setPaths(resp);
                                        this.paths.set('time', 'string');
                                        this.paths.set('analytics', this.typeStructure);
                                    });
                            }
                        }
                    });
                } else if (exp.FilterType === 'import_id') {
                    this.exportForm.patchValue({selector: 'import'});
                    this.disableUnusedSources('import');
                    const importInstance: ImportInstancesModel =
                        this.imports.find((i) => i.id === exp.Filter) || ({} as ImportInstancesModel);
                    this.exportForm.patchValue({import: importInstance});
                    this.getImportType(exp.ServiceName).subscribe((type) => {
                        type.output.sub_content_variables?.forEach((output) => this.traverseDataStructure('', output));
                    });
                }
                this.export = exp;
                this.savedName = exp.Name ?? '';
            }
            this.ready = true;
            this.changesTimer = setTimeout(() => this.onChanges(), 100); // delay for async init
        });
    }

    onSubmit() {
        if (this.exportForm.valid) {
            const self = this;

            // Editing an export disables the fields that pick its source, and a disabled
            // control is missing from exportForm.value - so the raw value is the one that
            // still holds what the form shows.
            const raw = this.exportForm.getRawValue();

            this.export.Name = raw.name as string;
            this.export.Description = raw.description as string | undefined;
            this.export.TimePath = raw.timePath as string | undefined;
            this.export.Values = raw.exportValues as ExportValueModel[];
            this.export.CustomMqttBroker = raw.customMqttBroker as string | undefined;
            this.export.CustomMqttUser = raw.customMqttUser as string | undefined;
            this.export.CustomMqttPassword = raw.customMqttPassword as string | undefined;
            this.export.CustomMqttBaseTopic = raw.customMqttBaseTopic as string | undefined;
            this.export.ExportDatabaseID = raw.exportDatabaseId as string | undefined;
            this.export.TimestampFormat = raw.timestampFormat as string | undefined;

            if (raw.selector === 'device' && raw.device && raw.service) {
                this.export.EntityName = raw.device.name;
                this.export.Filter = raw.device.id;
                this.export.FilterType = 'deviceId';
                this.export.ServiceName = raw.service.name;
                this.export.Topic = raw.service.id.replace(/#/g, '_').replace(/:/g, '_');
            } else if (raw.selector === 'pipe' && raw.pipeline && this.operator.id) {
                this.export.EntityName = this.operator.id;
                this.export.Filter = raw.pipeline.id + ':' + this.operator.id;
                this.export.FilterType = 'operatorId';
                this.export.ServiceName = this.operator.name;
                this.export.Topic = 'analytics-' + this.operator.name;
            }

            if (raw.allMessages) {
                // keep the import dialog's spelling: analytics-serving takes another offset string for a changed consumption strategy
                this.export.Offset = this.storedOffset === 'earliest' ? 'earliest' : 'smallest';
            } else {
                this.export.Offset = 'largest';
            }
            if (this.id !== null) {
                this.ready = false;
                const obs = (this.id.startsWith(BrokerExportService.ID_PREFIX) ? this.brokerExportService : this.exportService).editExport(
                    this.id,
                    this.export,
                );
                obs.subscribe((response) => {
                    if (response.status === 200) {
                        self.router.navigate(['/exports', self.id?.startsWith(BrokerExportService.ID_PREFIX) ? 'broker' : 'db']);
                        snackSuccess(self.snackBar, 'Export updated');
                    } else {
                        snackError(this.snackBar, 'Export could not be updated');
                    }
                    this.ready = true;
                });
            } else {
                const obs = (
                    this.exportForm.get('targetSelector')?.value === this.targetDb ? this.exportService : this.brokerExportService
                ).startPipeline(this.export);
                obs.subscribe((created) => {
                    if (created === null) {
                        snackError(self.snackBar, 'Error while creating the export!');
                        return;
                    }
                    self.router.navigate(['/exports', self.exportForm.get('targetSelector')?.value === self.targetDb ? 'db' : 'broker']);
                    snackSuccess(self.snackBar, 'Export created');
                });
            }
        }
        this.exportForm.markAllAsTouched();
    }

    // Which field names the source of an export, per selector value.
    private readonly sourceControls = new Map<string | null, string>([
        ['device', 'device'],
        ['pipe', 'pipeline'],
        ['import', 'import'],
    ]);

    // Picking a source hands the form to that source alone: its field takes part, the
    // fields of the other two and everything downstream of them do not.
    private applySelectorState(selection: string | null) {
        const source = this.sourceControls.get(selection);
        if (source === undefined) {
            return;
        }
        for (const control of ['device', 'service', 'pipeline', 'operator', 'import', 'timePath'] as const) {
            if (control === source) {
                this.exportForm.controls[control].enable({onlySelf: true, emitEvent: false});
            } else {
                this.exportForm.controls[control].disable({onlySelf: true, emitEvent: false});
            }
        }
    }

    // An export that already exists keeps the source it was created with, so its own field
    // stays as the form was built - read only, showing what it points at. The fields of the
    // other sources have to go: they are required too, and an empty required field that an
    // edit cannot even reach leaves the form invalid and its edit button disabled. Only
    // after the export has been patched in does onChanges() subscribe to the selector,
    // which is why this cannot wait for that handler.
    private disableUnusedSources(selection: string) {
        const source = this.sourceControls.get(selection);
        for (const control of ['device', 'pipeline', 'import'] as const) {
            if (control !== source) {
                this.exportForm.controls[control].disable({onlySelf: true, emitEvent: false});
            }
        }
    }

    onChanges(): void {
        if (this.exportForm) {
            if (this.exportForm.get('selector')) {
                this.exportForm.get('selector')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((selection) => {
                    this.applySelectorState(selection);

                    if (!this.id) {
                        this.resetVars();
                        this.exportForm.reset(
                            {
                                selector: selection,
                                targetSelector: this.targetDb,
                                exportDatabaseId: this.exportForm.get('exportDatabaseId')?.value
                            },
                            {onlySelf: false, emitEvent: false},
                        );
                        this.exportForm.markAsUntouched();

                        this.export = {} as ExportModel;
                        this.deviceType = {} as DeviceTypeModel;
                        this.operator = {} as PipelineOperatorModel;
                    }
                });
            }
            this.exportForm.get('targetSelector')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((target) => {
                if (target === this.targetDb) {
                    this.exportForm.patchValue({
                        customBrokerEnabled: false,
                        customMqttBroker: undefined,
                        customMqttUser: undefined,
                        customMqttPassword: undefined,
                        customMqttBaseTopic: undefined,
                    });
                }
                this.autofillValues();
                // autofill may leave the values as they are, and only the names of a database export become columns
                this.exportValues.updateValueAndValidity();
            });
            this.exportForm.get('customBrokerEnabled')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((customBrokerEnabled) => {
                if (!customBrokerEnabled) {
                    this.exportForm.patchValue({
                        customMqttBroker: undefined,
                        customMqttUser: undefined,
                        customMqttPassword: undefined,
                        customMqttBaseTopic: undefined,
                    });
                } else {
                    this.exportForm.patchValue({
                        customMqttBroker: '',
                        customMqttUser: '',
                        customMqttPassword: '',
                        customMqttBaseTopic: '',
                    });
                }
            });
            if (this.exportForm.get('device')) {
                this.exportForm.get('device')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((deviceValue) => {
                    const device = deviceValue as DeviceInstanceModel;
                    if (!_.isEmpty(device)) {
                        if (this.exportForm.value.device !== device) {
                            this.deviceTypeService.getDeviceType(device.device_type_id).subscribe((resp: DeviceTypeModel | null) => {
                                if (resp !== null) {
                                    this.deviceType = resp;
                                    this.exportForm.controls.service.enable();
                                }
                            });
                            if (!this.id || (this.id && this.export.FilterType !== 'device')) {
                                this.resetVars();
                            }
                        }
                    }
                });
            }
            if (this.exportForm.get('service')) {
                this.exportForm.get('service')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((serviceValue) => {
                    const service = serviceValue as DeviceTypeServiceModel;
                    if (!_.isEmpty(service)) {
                        this.resetVars();
                        const pathString = 'value';
                        service.outputs.forEach((out: DeviceTypeContentModel) => {
                            this.traverseDataStructure(pathString, out.content_variable);
                        });
                        this.exportForm.controls.timePath.enable();
                        this.autofillValues();
                    }
                });
            }
            if (this.exportForm.get('pipeline')) {
                this.exportForm.get('pipeline')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((pipeValue) => {
                    const pipe = pipeValue as PipelineModel;
                    this.exportForm.patchValue({operator: null, timePath: null});
                    this.operator = {} as PipelineOperatorModel;

                    if (!_.isEmpty(pipe)) {
                        this.exportForm.controls['operator'].enable({onlySelf: true, emitEvent: false});
                    } else {
                        this.exportForm.controls['operator'].disable({onlySelf: true, emitEvent: false});
                    }
                    this.resetVars();
                    const svg = parseSvgImage(pipe.image);
                    if (svg !== null) {
                        const viewbox = svg.getAttribute('viewbox')!.split(' ');
                        svg.setAttribute('height', viewbox[3]);
                        this.image = this.sanitizer.bypassSecurityTrustHtml(svgImageMarkup(svg));
                        if (pipe.operators.length === 1) {
                            this.operator = pipe.operators[0];
                            this.operatorChanged(this.operator);
                        }
                    }
                });
            }

            if (this.exportForm.get('import')) {
                this.exportForm.get('import')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((importValue) => {
                    const i = importValue as ImportInstancesModel;
                    this.resetVars();
                    if (!_.isEmpty(i)) {
                        this.exportForm.controls['timePath'].enable({onlySelf: true, emitEvent: false});
                    } else {
                        this.exportForm.controls['timePath'].disable({onlySelf: true, emitEvent: false});
                    }
                    this.getImportType(i.import_type_id).subscribe((type) => {
                        type.output.sub_content_variables?.forEach((output) => this.traverseDataStructure('', output));
                        this.autofillValues();
                    });
                    this.export.Filter = i.id;
                    this.export.Topic = i.kafka_topic;
                    this.export.FilterType = 'import_id';
                    this.export.EntityName = i.name;
                    this.export.ServiceName = i.import_type_id;
                });
            }

            if (this.exportForm.get('timePath')) {
                this.exportForm.get('timePath')?.valueChanges.pipe(takeUntil(this.detach$)).subscribe((path) => {
                    if (path !== '' && path !== null) {
                        // ensure value not also exported
                        const i = this.exportValues.controls.findIndex((v) => v.value.Path === path);
                        if (i !== -1) {
                            this.exportValues.removeAt(i);
                        }

                        if (!_.isEmpty(this.exportForm.value.service)) {
                            if (
                                this.exportForm.value.selector === 'device' &&
                                this.paths.has(path) &&
                                this.exportForm.value.service.outputs.length === 1
                            ) {
                                const values = this.exportService.addCharacteristicToDeviceTypeContentVariable(
                                    this.exportForm.value.service.outputs[0].content_variable,
                                );
                                const selectedValue = values.find((v) => v.Path === path);
                                if (
                                    selectedValue !== undefined &&
                                    selectedValue.characteristicId === environment.timeStampCharacteristicUnixSecondsId
                                ) {
                                    this.export.TimePrecision = 's';
                                } else {
                                    this.export.TimePrecision = undefined; //  No precision for iso string, nanos or unknown
                                }
                            } else {
                                this.export.TimePrecision = undefined; //  No precision for or unknown or pipeline
                            }
                        }

                        this.autofillValues();
                    }
                });
            }

            this.formatControl.valueChanges.pipe(takeUntil(this.detach$)).subscribe((selection) => {
                this.exportForm.get('timestampFormat')?.setValue(selection);
            });
        }
    }

    traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) {
        if (field.type === this.typeStructure && field.type !== undefined && field.type !== null) {
            if (pathString.length > 0) {
                pathString += '.';
            }
            pathString += field.name;
            this.paths.set(pathString, this.typeStructure);
            if (field.sub_content_variables !== undefined && field.sub_content_variables !== null) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField);
                });
            }
        } else {
            let path = pathString;
            if (pathString.length > 0) {
                path += '.';
            }
            path += field.name;
            this.paths.set(path, field.type);
            if (field.characteristic_id === environment.timeStampCharacteristicId) {
                this.timeSuggest = path;
            }
        }
    }

    operatorSelectChanged(opened: boolean) {
        this.showImage = opened;
    }

    updateImage(id: string) {
        const pipeline: PipelineModel | null = this.exportForm.getRawValue().pipeline;
        const svg = parseSvgImage(pipeline?.image);
        if (svg !== null) {
            const viewbox = svg.getAttribute('viewbox')!.split(' ');
            svg.setAttribute('height', viewbox[3]);
            const elements = svg.getElementsByClassName('joint-cell') as any;
            for (const element of elements) {
                if (element.attributes['model-id'].value === id) {
                    for (const node of element.childNodes) {
                        if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                            node.attributes['stroke'].value = 'red';
                        }
                    }
                }
            }
            // selectOperator() hit-tests the operators, so this image has to be live DOM
            this.image = this.sanitizer.bypassSecurityTrustHtml(svgImageMarkup(svg));
        }
    }

    operatorChanged(operator: PipelineOperatorModel) {
        this.resetVars();
        this.exportForm.patchValue({operator, timePath: null});
        this.exportForm.controls['timePath'].enable({onlySelf: true, emitEvent: false});
        this.updateImage(operator.id);
        this.operatorRepoService.getOperator(operator.operatorId).subscribe((resp: OperatorModel | null) => {
            if (resp !== null && resp.outputs !== undefined) {
                resp.outputs.forEach((out: IOModel) => {
                    this.paths.set('analytics.' + out.name, out.type);
                });
            }
            this.paths.set('time', 'string');
            this.paths.set('analytics', this.typeStructure);
            this.exportForm.patchValue({timePath: 'time', timestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ'});
            this.formatControl.setValue('%Y-%m-%dT%H:%M:%S.%fZ');
            this.autofillValues();
        });
    }

    get exportValues(): FormArray<ExportValueGroup> {
        return this.exportForm.controls.exportValues;
    }

    addValue(name?: string, path?: string, type?: string, tag?: boolean) {
        this.exportValues.push(
            this.fb.group({
                Name: name || '',
                Path: path || '',
                Type: type || '',
                Tag: tag || false,
            }),
        );
    }

    /** The names of a database export become its columns; a broker export uses them as topics. */
    private columnNamesError(array: AbstractControl): ValidationErrors | null {
        if (array.parent?.getRawValue().targetSelector !== this.targetDb) {
            return null;
        }
        return invalidColumnNames(array.value).length > 0 ? {columnNames: true} : null;
    }

    nameError(group: AbstractControl): string {
        if (!this.exportValues.hasError('columnNames')) {
            return '';
        }
        return columnNameError(group.value.Name, duplicateValueNames(this.exportValues.value));
    }

    /** The paginator hides most rows, so the names to change are listed below it as well. */
    invalidNames(): string[] {
        return this.exportValues.hasError('columnNames') ? invalidColumnNames(this.exportValues.value) : [];
    }

    nameMatcher(group: AbstractControl): ErrorStateMatcher {
        let matcher = this.nameMatchers.get(group);
        if (matcher === undefined) {
            matcher = stateMatcher(() => this.nameError(group) !== '');
            this.nameMatchers.set(group, matcher);
        }
        return matcher;
    }

    deleteValue(index: number) {
        this.exportValues.removeAt(index);
    }

    pathChanged(id: number) {
        if (id !== undefined) {
            if (this.exportValues.at(id).value.Tag) {
                this.exportValues.at(id).patchValue({Type: 'string'});
            } else {
                let type = this.paths.get(this.exportValues.at(id).value.Path as string);
                switch (this.paths.get(this.exportValues.at(id).value.Path as string)) {
                case this.typeString:
                    type = 'string';
                    break;
                case this.typeFloat:
                    type = 'float';
                    break;
                case this.typeInteger:
                    type = 'int';
                    break;
                case this.typeBoolean:
                    type = 'bool';
                    break;
                case this.typeList:
                case this.typeStructure:
                    type = 'string_json';
                    break;
                }

                this.exportValues.at(id).patchValue({Type: type});
            }
        }
    }

    resetVars() {
        this.paths.clear();
        this.exportValues.clear();
    }

    autofillValues() {
        if (this.exportForm.value.timePath === '' || this.exportForm.value.timePath === null) {
            if (this.exportForm.value.selector === 'pipe') {
                this.exportForm.patchValue({
                    timePath: 'time',
                    timestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ'
                }, {onlySelf: true, emitEvent: false});
                this.formatControl.setValue('%Y-%m-%dT%H:%M:%S.%fZ');
            } else if (this.exportForm.value.selector === 'import') {
                this.exportForm.patchValue({timePath: 'time', timestampFormat: '%Y-%m-%dT%H:%M:%SZ'}, {
                    onlySelf: true,
                    emitEvent: false
                });
                this.formatControl.setValue('%Y-%m-%dT%H:%M:%SZ');
            } else if (this.exportForm.value.selector === 'device') {
                this.exportForm.patchValue({timePath: this.timeSuggest, timestampFormat: null}, {
                    onlySelf: true,
                    emitEvent: false
                });
            }
        }
        if (this.exportForm.value.selector === 'import') {
            if (this.exportForm.value.import === null || this.exportForm.value.import === undefined) {
                return;
            }
            const importType = this.importTypes.get(this.exportForm.value.import.import_type_id);
            if (importType !== undefined) {
                this.exportValues.clear();
                const values = this.importTypesService.parseImportTypeExportValues(
                    importType,
                    this.exportForm.getRawValue().targetSelector === this.targetBroker,
                );
                if (this.exportForm.getRawValue().targetSelector === this.targetBroker) {
                    values.forEach((value) => this.addValue(value.Path.replace(/\./g, '/'), value.Path, value.Type, value.Tag));
                } else {
                    values.forEach((value) => this.addValue(value.Name, value.Path, value.Type, value.Tag));
                }
                this.exportValues.controls.forEach((_2, index) => this.pathChanged(index));
            } else {
                this.exportValues.clear();
            }
        } else {
            const hasAmbiguousNames = this.hasAmbiguousNames();
            this.exportValues.clear();
            this.paths.forEach((_type, path) => {
                if (this.exportForm.getRawValue().targetSelector === this.targetBroker) {
                    this.addValue(path.replace(/\./g, '/'), path);
                    const index = this.exportValues.controls.length - 1;
                    this.pathChanged(index);
                } else if (this.exportForm.value.timePath !== path && path !== 'time' && _type !== this.typeStructure) {
                    // don't add path if it's selected as time
                    this.addValue(hasAmbiguousNames ? path : path.slice(path.lastIndexOf('.') + 1), path);
                    const index = this.exportValues.controls.length - 1;
                    this.pathChanged(index);
                }
            });
        }
    }

    private hasAmbiguousNames(): boolean {
        const m = new Map<string, null>();
        for (const path of this.paths.keys()) {
            const name = path.slice(path.lastIndexOf('.') + 1);
            if (m.has(name)) {
                return true;
            }
            m.set(name, null);
        }

        return false;
    }

    getPathsKeyOptions(): string[] {
        return Array.from(this.paths.keys());
    }

    private getImportType(id: string): Observable<ImportTypeModel> {
        const importType = this.importTypes.get(id);
        if (importType !== undefined) {
            return of(importType);
        }
        return this.importTypesService.getImportType(id).pipe(
            map((type) => {
                this.importTypes.set(id, type);
                return type;
            }),
        );
    }

    selectOperator($event: MouseEvent) {
        for (const operatorNode of ($event.target as any)?.viewportElement?.getElementsByClassName('joint-cells-layer')[0].childNodes || []) {
            if (
                operatorNode.attributes['data-type'] !== undefined &&
                operatorNode.attributes['data-type'].value === 'senergy.NodeElement'
            ) {
                const rect: DOMRect = operatorNode.getBoundingClientRect();
                if ($event.x < rect.right && $event.x > rect.left && $event.y > rect.top && $event.y < rect.bottom) {
                    const clickedOperator = (this.exportForm.getRawValue().pipeline as PipelineModel).operators.find(
                        (o: PipelineOperatorModel) => o.id === operatorNode.attributes['model-id'].value,
                    );
                    if (clickedOperator !== undefined) {
                        if (clickedOperator.id !== this.operator.id) {
                            this.operator = clickedOperator;
                            this.operatorChanged(this.operator);
                        }
                        return;
                    }
                }
            }
        }
    }

    /** The list the export belongs to: an existing one by its id, a new one by the target chosen so far. */
    get listLink(): string {
        const broker = this.id !== null
            ? this.id.startsWith(BrokerExportService.ID_PREFIX)
            : this.exportForm.getRawValue().targetSelector === this.targetBroker;
        return broker ? '/exports/broker' : '/exports/db';
    }

    /** What the save bar says: what blocks saving, else whether anything changed. */
    saveStatus(): string {
        if (!this.exportForm.valid) {
            return 'Fill in the required fields to ' + (this.id === null ? 'start the export' : 'save');
        }
        return this.exportForm.dirty ? 'Unsaved changes' : (this.id === null ? 'Ready to start' : 'Editing');
    }

    /** Loads the stored export again, which drops all edits once it arrived; a new export has no stored state, so it returns to the list. */
    discard() {
        if (this.id === null) {
            this.router.navigate([this.listLink]);
            return;
        }
        if (this.changesTimer !== undefined) {
            clearTimeout(this.changesTimer);
        }
        this.detach$.next();
        this.ready = false;
        this.loadExport(this.id, true);
    }

    /** Puts the form and everything derived from the loaded export back to what the constructor left. */
    private resetLoadedState() {
        this.exportValues.clear();
        this.paths.clear();
        this.export = {} as ExportModel;
        this.deviceType = {} as DeviceTypeModel;
        this.operator = {} as PipelineOperatorModel;
        this.image = '';
        this.timeSuggest = '';
        this.storedOffset = undefined;
        this.lastPageEvent = undefined;
        this.offset = 0;
        const raw = this.exportForm.getRawValue();
        this.exportForm.reset({
            selector: raw.selector,
            targetSelector: raw.targetSelector,
            customBrokerEnabled: '',
            name: '',
            description: '',
            timePath: '',
            allMessages: false,
            exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb,
            timestampFormat: '',
        }, {emitEvent: false});
        this.formatControl.setValue('', {emitEvent: false});
        this.exportForm.controls.device.enable({onlySelf: true, emitEvent: false});
        for (const control of ['service', 'timePath', 'import', 'operator', 'pipeline'] as const) {
            this.exportForm.controls[control].disable({onlySelf: true, emitEvent: false});
        }
    }

    movePage($event: PageEvent) {
        this.preferencesService.pageSize = $event.pageSize;
        this.lastPageEvent = $event;
        this.offset = this.lastPageEvent.pageIndex * this.lastPageEvent.pageSize;
    }

    getExportValuesControls(): AbstractControl[] {
        if (this.lastPageEvent === undefined) {
            return this.exportValues.controls.slice(0, this.defaultPageSize);
        }
        return this.exportValues.controls.slice(this.offset,
            (this.lastPageEvent.pageIndex + 1) * this.lastPageEvent.pageSize);
    }

    isTimescaleSelected() {
        return this.exportDatabases.find((e: ExportDatabaseModel) => e.ID === this.exportForm.getRawValue().exportDatabaseId)?.Type === DatabaseType.timescaledb;
    }

    addTimestampFormat(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.timestamp_formats.push(text);
            const tmp = that.timestamp_formats;
            that.timestamp_formats = [];
            that.timestamp_formats = tmp;
            that.formatControl.updateValueAndValidity(); // triggers valueChanges pipe
        };
    }
}
