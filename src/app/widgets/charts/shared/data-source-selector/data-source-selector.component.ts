/*
 * Copyright 2025 InfAI (CC SES)
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

import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ControlEvent, FormArray, FormBuilder, FormControl, FormGroup, TouchedChangeEvent, ValidatorFn, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { concatMap, map, Observable, Subject, throwError } from 'rxjs';
import { DeviceGroupCriteriaModel, DeviceGroupDisplayModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportMeasurementDisplayModel, ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';
import { LocationDisplayModel } from 'src/app/modules/devices/locations/shared/locations.model';
import _ from 'lodash';
import { debounceTime } from 'rxjs/operators';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatInput } from '@angular/material/input';
import { ChartsExportVAxesModelWithGroup, DataSourceOptionsService } from './data-source-options.service';
import { groupTimeLevels, groupTypeOptions } from './group-options';

export interface DataSourceConfig {
    exports?: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel)[];
    timeRange?: {
        time?: number;
        start?: string;
        end?: string;
        level?: string;
        type?: string;
    };
    group?: {
        time?: number;
        type?: string;
        level?: string;
    };
    fields?: ChartsExportVAxesModel[];
    fieldOptions?: ChartsExportVAxesModel[];
}


type SourceGroup = FormGroup<{
    sourceClass: FormControl<string | null>;
    sourceExports: FormControl<string[] | null | undefined>;
    lastScrollStart: FormControl<number | null>;
    lastScrollEnd: FormControl<number | null>;
    lastSearch: FormControl<string | null>;
    lastOffset: FormControl<number | null>;
}>;

type DataSourceForm = FormGroup<{
    dataSourceClasses: FormControl<string[] | null>;
    exportsBySource: FormArray<SourceGroup>;
    exports: FormControl<NonNullable<DataSourceConfig['exports']> | null>;
    timeRange: FormGroup<{
        type: FormControl<string | null>;
        start: FormControl<string | null>;
        end: FormControl<string | null>;
        time: FormControl<number | string | null>;
        level: FormControl<string | null>;
    }>;
    group: FormGroup<{
        time: FormControl<number | string | null>;
        type: FormControl<string | null>;
        level: FormControl<string | null>;
    }>;
    fields: FormControl<ChartsExportVAxesModel[] | null>;
    // starts as [] and is set to the loaded options, a map by option group
    fieldOptions: FormControl<Map<string, ChartsExportVAxesModel[]> | never[] | null>;
}>;

@Component({
    selector: 'data-source-selector',
    templateUrl: './data-source-selector.component.html',
    styleUrls: ['./data-source-selector.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DataSourceOptionsService],
    imports: [MatProgressSpinner, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MtxSelect, MatError, MatErrorMessagesDirective, MtxOption, MatInput]
})
export class DataSourceSelectorComponent implements OnInit {
    private fb = inject(FormBuilder);
    private destroyRef = inject(DestroyRef);
    private options = inject(DataSourceOptionsService);

    // Replaced by initForm() in ngOnInit before the template reads it.
    form = new FormGroup({}) as unknown as DataSourceForm;
    dataSourceClasses = ['Devices', 'Device Groups', 'Exports', 'Locations'];

    searchSubject = new Subject<{ term: string, sourceForm: AbstractControl }>();

    deviceGroups: DeviceGroupDisplayModel[] = [];

    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.RelativeAhead, this.timeRangeEnum.Absolute];

    // Signals back the template-visible state, so the OnPush view repaints when it changes asynchronously.
    private readonly showDataSourceErrorState = signal(false);
    private readonly readyState = signal(false);
    private readonly waitingState = signal(false);
    private readonly fieldOptionsState = signal<ChartsExportVAxesModelWithGroup[]>([]);
    private readonly timeRangeTypeState = signal<string | null | undefined>(undefined);
    private readonly hasExportsState = signal(false);
    private readonly chosenClassesState = signal<string[]>([]);
    loadingDataSource = false;

    get showDataSourceError() {
        return this.showDataSourceErrorState();
    }
    set showDataSourceError(value: boolean) {
        this.showDataSourceErrorState.set(value);
    }
    get ready() {
        return this.readyState();
    }
    set ready(value: boolean) {
        this.readyState.set(value);
    }
    get waitingForDataSourceChange() {
        return this.waitingState();
    }
    set waitingForDataSourceChange(value: boolean) {
        this.waitingState.set(value);
    }
    get fieldOptionsTMP() {
        return this.fieldOptionsState();
    }
    readonly timeRangeType = this.timeRangeTypeState.asReadonly();
    readonly hasExports = this.hasExportsState.asReadonly();

    get selectedExportsBySource() {
        return this.options.selectedExportsBySource;
    }
    get scrollDynInitLimit() {
        return this.options.scrollDynInitLimit;
    }
    get scrollDynReloadLimit() {
        return this.options.scrollDynReloadLimit;
    }

    levels = groupTimeLevels;
    groupTypes: any = [];

    @Input() dataSourceConfig?: DataSourceConfig;
    @Input() enableAggretationConfig = true;
    @Input() enableFieldSelection = true;
    @Input() showExportsAsSource = true;
    @Input() showDeviceGroupsAsSource = true;
    @Input() showDevicesAsSource = true;
    @Input() showLocationsAsSource = false;
    @Input() showTimeRange = true;
    @Input() showSource = true;
    @Output() updatedDataSourceConfig = new EventEmitter<DataSourceConfig>();

    get exportsControlBySource() {
        return this.form.controls.exportsBySource;
    }

    ngOnInit(): void {
        this.waitingForDataSourceChange = true;
        this.options.dataSourceConfig = () => this.dataSourceConfig;
        this.initForm();
        this.initOnSelectSearch();
        this.setupDataSources().pipe(
            concatMap(() => this.loadFieldOptions(this.dataSourceConfig?.exports || [])),
            map((fieldOptions) => {
                const tmp: ChartsExportVAxesModelWithGroup[] = [];
                fieldOptions.forEach((v, k) => {
                    v.forEach(v2 => {
                        const v3 = v2 as ChartsExportVAxesModelWithGroup;
                        v3.group = k;
                        tmp.push(v3);
                    });
                });
                this.fieldOptionsState.set(tmp);
                const f = this.form.get('fieldOptions');
                if (f !== null) {
                    f.patchValue(fieldOptions);
                }
                this.setupGroupTypes();
            })
        ).subscribe({
            next: () => {
                this.ready = true;
                this.waitingForDataSourceChange = false;
            },
            error: (err) => {
                console.log('Could not init: ' + err);
                this.ready = true;
                this.waitingForDataSourceChange = false;
            }
        });
    }


    private initForm() {
        this.form = new FormGroup({
            dataSourceClasses: new FormControl<string[] | null>([], Validators.required),
            exportsBySource: new FormArray<SourceGroup>([]),
            exports: new FormControl<NonNullable<DataSourceConfig['exports']> | null>(this.dataSourceConfig?.exports || [], Validators.required),
            timeRange: new FormGroup({
                type: new FormControl(this.dataSourceConfig?.timeRange?.type || '', Validators.required),
                start: new FormControl(this.dataSourceConfig?.timeRange?.start || ''),
                end: new FormControl(this.dataSourceConfig?.timeRange?.end || ''),
                time: new FormControl<number | string | null>(this.dataSourceConfig?.timeRange?.time || '',),
                level: new FormControl(this.dataSourceConfig?.timeRange?.level || '')
            }),
            group: new FormGroup({
                time: new FormControl<number | string | null>(this.dataSourceConfig?.group?.time || '', this.validateInterval),
                type: new FormControl(this.dataSourceConfig?.group?.type || ''),
                level: new FormControl(this.dataSourceConfig?.group?.level || '')
            }),
            fields: new FormControl(this.dataSourceConfig?.fields || []),
            fieldOptions: new FormControl<Map<string, ChartsExportVAxesModel[]> | never[] | null>([])
        });
        this.initExportsBySource();
        this.initDataSourceClasses();
        this.subscribeToFormUpdates();
        this.trackTemplateState();
    }

    private initExportsBySource() {
        const preSelections = this.getPreSelectionsByClass();
        this.dataSourceClasses.forEach((sourceClass) => {
            const sourceExportsControl: SourceGroup = this.fb.group({
                sourceClass: sourceClass,
                sourceExports: this.fb.control<string[] | null | undefined>(preSelections.get(sourceClass)?.ids),
                lastScrollStart: 0,
                lastScrollEnd: this.scrollDynInitLimit,
                lastSearch: '',
                lastOffset: 0,
            });
            this.exportsControlBySource.push(sourceExportsControl);
            this.selectedExportsBySource.set(sourceClass, preSelections.get(sourceClass)?.exports || []);
        });
    }

    private initDataSourceClasses() {
        const control = this.form.controls['dataSourceClasses'];
        const newValue: string[] = [];
        this.selectedExportsBySource.forEach((value: any[], key: string) => {
            if (value.length > 0) {
                newValue.push(key);
            }
        });
        control.patchValue(newValue);
    }

    // The template reads these form values; signals make an OnPush view repaint when they change.
    private trackTemplateState() {
        const exports = this.form.controls.exports;
        const classes = this.form.controls.dataSourceClasses;
        const type = this.form.controls.timeRange.controls.type;
        this.hasExportsState.set((exports.value || '').length > 0);
        this.chosenClassesState.set(classes.value || []);
        this.timeRangeTypeState.set(type.value);
        exports.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.hasExportsState.set((value || '').length > 0));
        classes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.chosenClassesState.set(value || []));
        type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.timeRangeTypeState.set(value));
    }

    private subscribeToFormUpdates() {
        this.exportsControlBySource.controls.forEach(fieldControl => {
            const selectionControl = fieldControl.controls.sourceExports;
            selectionControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
                (val: any) => {
                    this.updateExportSelections(fieldControl, val);
                    this.updateErrorMessage();
                    this.updateCriteriaAndAspects(fieldControl);
                    this.updateFieldOptions();
                });
            selectionControl.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
                (event: ControlEvent) => {
                    if (event instanceof TouchedChangeEvent) {
                        this.updateErrorMessage();
                    }
                });
        });

        this.form.controls['dataSourceClasses'].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(chosenClasses => { // delete exports of class when class gets unselected
            const notChosen = this.dataSourceClasses.filter(x => !(chosenClasses as string[]).includes(x));
            this.exportsControlBySource.controls.forEach(control => {
                const sourceClass = this.getSourceClass(control);
                if (notChosen.includes(sourceClass)) {
                    control.patchValue({
                        'sourceExports': []
                    });
                }
            });
        });

        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                if (!this.ready) {
                    return;
                }
                const newDataSourceConfig = this.form.getRawValue() as DataSourceConfig;
                this.updatedDataSourceConfig.emit(newDataSourceConfig);
            }
        });
        const timeRangTypeChanges = (value: any) => {
            if (value === this.timeRangeEnum.Absolute) {
                this.form.get('group.level')?.enable();
            } else {
                this.form.get('group.level')?.disable();
            }
        };
        timeRangTypeChanges(this.form.get('timeRange.type')?.value);
        this.form.get('timeRange.type')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
            timeRangTypeChanges(value);
        });

        const timeRangeLevelChanges = (value: any) => {
            if (this.form.get('group.level')?.disabled) {
                this.form.get('group.level')?.patchValue(value);
            }
        };
        timeRangeLevelChanges(this.form.get('timeRange.level')?.value);
        this.form.get('timeRange.level')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
            timeRangeLevelChanges(value);
        });
    }

    private updateCriteriaAndAspects(fieldControl: AbstractControl) {
        this.options.updateCriteriaAndAspects(this.getSourceClass(fieldControl));
    }

    private updateErrorMessage() {
        if ((this.form.controls.exports.value?.length ?? 0) > 0) {
            this.showDataSourceError = false;
            return;
        } else {
            let untouched = false;
            this.exportsControlBySource.controls.forEach(fieldControl => {
                const sourceClass = this.getSourceClass(fieldControl);
                const activeSources = this.form.controls['dataSourceClasses'].value || [];
                if (activeSources.includes(sourceClass) && !fieldControl.get('sourceExports')?.touched) {
                    untouched = true;
                }
            });
            this.showDataSourceError = !untouched;
        }
    }

    setupDataSources(): Observable<any> {
        return this.options.setupDataSources(this);
    }

    describeCriteria(): (criteria: DeviceGroupCriteriaModel) => string {
        return this.options.describeCriteria();
    }

    getExports(request: { search?: string, limit?: number, offset?: number }) {
        return this.options.getExports(request);
    }

    getDevices(request: { limit: number, offset: number, searchText?: string }) {
        return this.options.getDevices(request);
    }

    getDeviceGroups(request: { search?: string, limit: number, offset: number }) {
        return this.options.getDeviceGroups(request);
    }

    getLocations(request: { search?: string, limit: number, offset: number }): Observable<unknown> {
        return this.options.getLocations(request);
    }

    loadFieldOptions(selectedExports: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel)[]) {
        return this.options.loadFieldOptions(selectedExports);
    }

    loadDataSourceOptions(sourceClass: string, limit: number, offset: number, search?: string) {
        return this.options.loadDataSourceOptions(sourceClass, limit, offset, search);
    }

    getExportOptions(sourceClass: string): any[] {
        return this.options.getExportOptions(sourceClass);
    }

    updateFieldOptions() {
        this.waitingForDataSourceChange = true;
        const selectedExports = this.form.get('exports')?.value as NonNullable<DataSourceConfig['exports']>;
        this.loadFieldOptions(selectedExports).pipe(
            map((fieldOptions) => {
                const tmp: ChartsExportVAxesModelWithGroup[] = [];
                fieldOptions.forEach((v, k) => {
                    v.forEach(v2 => {
                        const v3 = v2 as ChartsExportVAxesModelWithGroup;
                        v3.group = k;
                        tmp.push(v3);
                    });
                });
                this.fieldOptionsState.set(tmp);
                setTimeout(() => {
                    const fieldOptionsControl = this.form.get('fieldOptions');
                    if (fieldOptionsControl !== null) {
                        fieldOptionsControl.setValue(fieldOptions);
                    }
                    const filteredFields = this.filterSelectedFields(selectedExports);
                    const fieldsControl = this.form.get('fields');
                    if (fieldsControl !== null) {
                        fieldsControl.setValue(filteredFields);
                    }
                });
                return null;
            })
        ).subscribe({
            next: () => {
                this.waitingForDataSourceChange = false;
            },
            error: (err: any) => {
                console.log(err);
                this.waitingForDataSourceChange = false;
            }
        });
    }

    filterSelectedFields(selectedDataSources: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel)[]) {
        /* Filter the selected fields depending on the current selection of the data source
        */
        const selectedFields = JSON.parse(JSON.stringify(this.form.value['fields']));
        const filteredFields: ChartsExportVAxesModel[] = [];
        selectedFields.forEach((field: ChartsExportVAxesModel) => {
            let dataSourceIsSelected = false;

            selectedDataSources.forEach(dataSource => {
                const exportDataSourceExists = (field.instanceId != null &&
                    field.instanceId === dataSource.id &&
                    field.exportName === dataSource.name);
                const deviceDataSourceExists = (field.deviceId != null &&
                    field.deviceId === dataSource.id);
                const deviceGroupDataSourceExists = (field.deviceGroupId != null &&
                    field.deviceGroupId === dataSource.id);
                dataSourceIsSelected = exportDataSourceExists || deviceDataSourceExists || deviceGroupDataSourceExists;
                if (dataSourceIsSelected) {
                    filteredFields.push(field);
                    return;
                }
            });
        });
        return filteredFields;
    }


    setupGroupTypes() {
        const influxExp = (this.form.get('exports')?.value as (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel)[])
            ?.find(exp => (exp as DeviceInstanceModel).device_type_id === undefined &&
                (((exp as ChartsExportMeasurementDisplayModel).exportDatabaseId === undefined && (exp as DeviceGroupDisplayModel).criteria === undefined) || (exp as ChartsExportMeasurementDisplayModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb));
        this.groupTypes = groupTypeOptions(influxExp !== undefined);
    }

    validateInterval: ValidatorFn = (control: AbstractControl) => {
        const type = this.form.get('group.type')?.value;
        if (type === undefined || type === null || type.length === 0) {
            return null;
        }
        if (control.value === undefined || control.value === null || control.value.length === 0) {
            return { validateInterval: { value: control.value } };
        }
        const re = new RegExp('\\d+(ns|u|µ|ms|s|months|y|m|h|d|w)');
        const matches = re.exec(control.value);
        if (matches == null || matches.length === 0 || matches[0].length !== control.value.length) {
            return { validateInterval: { value: control.value } };
        }
        return null;
    };

    compareFields(a: any, b: any): boolean {
        const exportsMatch = (a.instanceId != null && b.instanceId != null &&
            a.instanceId === b.instanceId &&
            a.exportName === b.exportName &&
            a.valueName === b.valueName);
        const deviceMatch = (a.deviceId != null && b.deviceId != null &&
            a.deviceId === b.deviceId &&
            a.serviceId === b.serviceId &&
            a.valuePath === b.valuePath);
        const deviceGroupMatch = (a.deviceGroupId != null && b.deviceGroupId != null &&
            a.deviceGroupId === b.deviceGroupId &&
            a.criteria.function_id === b.criteria.function_id);
        const locationsMatch = (a.locationId != null && b.locationId != null &&
            a.locationId === b.locationId &&
            a.criteria.function_id === b.criteria.function_id);
        return exportsMatch || deviceMatch || deviceGroupMatch || locationsMatch;
    }

    patchFields(fields: ChartsExportVAxesModel[]) {
        this.form.patchValue({ fields });
    }


    private getPreSelectionsByClass(): Map<string, { ids: string[], exports: any[] }> {
        const preExports = this.dataSourceConfig?.exports;
        const selections: Map<string, { ids: string[], exports: any[] }> = new Map();
        this.dataSourceClasses.forEach((sourceClass) => {
            selections.set(sourceClass, { ids: [], exports: [] });
        });
        if (preExports !== undefined && Array.isArray(preExports)) {
            preExports.forEach(exp => {
                const dataSourceClass = this.getSourceClassFromId(exp.id);
                selections.get(dataSourceClass)?.ids.push(exp.id);
                selections.get(dataSourceClass)?.exports.push(exp);
            });
        }
        return selections;
    }

    private getSourceClassFromId(id: string): string {
        if (id.includes('device-group')) {
            return 'Device Groups';
        } else if (id.includes('device')) {
            return 'Devices';
        } else if (id.includes('location')) {
            return 'Locations';
        } else {
            return 'Exports';
        }
    }

    sourceIsUsed(sourceForm: AbstractControl) {
        const cls = sourceForm.get('sourceClass')?.value;
        if (cls !== null) {
            const chosen = this.chosenClassesState();
            return (chosen as string[]).some((a: string | string[]) => a.includes(cls));
        }
        return false;
    }

    getSourceClass(sourceForm: AbstractControl) {
        if (sourceForm.get('sourceClass')?.value) {
            return sourceForm.get('sourceClass')?.value as string;
        }
        return '';
    }


    private updateExportSelections(sourceControl: AbstractControl, changedIds: string[]) {
        const sourceExports: any[] = [];
        const sourceClass = this.getSourceClass(sourceControl);
        changedIds.forEach((id: string) => {
            const exp = this.options.getExportById(id, sourceClass);
            if (exp !== null) {
                sourceExports.push(exp);
            } else {
                throwError(() => new Error('Could not add export with id: ' + id));
            }
        });
        this.selectedExportsBySource.set(sourceClass, sourceExports);

        let allExports: any[] = [];
        this.selectedExportsBySource.forEach((value: any[]) => {
            allExports = [...allExports, ...value];
        });
        this.form.controls['exports'].patchValue(allExports);
    }

    onSelectScroll(scroll: { start: number, end: number }, sourceForm: AbstractControl) {
        // allows to load next bulk of data before reaching the end of list. However sometimes the start and end
        // given by (scroll) are not accurate and may lead to an unwanted stop in scrolling => use onSelectScrollEnd as backup
        const sourceClass = this.getSourceClass(sourceForm);
        const lastStart = sourceForm.get('lastScrollStart')?.value;
        const lastEnd = sourceForm.get('lastScrollEnd')?.value;
        const searchTerm: string = sourceForm.get('lastSearch')?.value;
        const limit = this.scrollDynReloadLimit;
        const lenOptions = this.options.dataSourceOptions.get(sourceClass)?.length || this.scrollDynInitLimit;

        const noDuplicate = lastStart != scroll.start || lastEnd != scroll.end;
        const reachingEnd = scroll.end > (lenOptions - limit);

        if (noDuplicate && reachingEnd && !this.loadingDataSource) {
            this.loadNextOptionsBatch(scroll.start, scroll.end, sourceForm, limit, lenOptions, searchTerm);
        }
    }

    onSelectScrollEnd(sourceForm: AbstractControl) {
        // backup for onSelectScroll
        const sourceClass = this.getSourceClass(sourceForm);
        const searchTerm: string = sourceForm.get('lastSearch')?.value;
        const limit = this.scrollDynReloadLimit;
        const lenOptions = this.options.dataSourceOptions.get(sourceClass)?.length || this.scrollDynInitLimit;

        this.loadNextOptionsBatch(lenOptions, (lenOptions + this.scrollDynReloadLimit), sourceForm, limit, lenOptions, searchTerm);
    }

    onSelectClose(sourceForm: AbstractControl) {
        this.resetDataSourceOptions(sourceForm);
    }

    initOnSelectSearch() {
        this.searchSubject.pipe(
            debounceTime(250),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(({ term, sourceForm }) => {
            this.resetDataSourceOptions(sourceForm, term);
        });
    }
    onSelectSearch(search: { term: string, items: any[] }, sourceForm: AbstractControl) {
        this.searchSubject.next({ term: search.term, sourceForm });
    }

    resetDataSourceOptions(sourceForm: AbstractControl, search: string = '') {
        const sourceClass = this.getSourceClass(sourceForm);
        const limit = this.scrollDynInitLimit;
        const offset = 0;
        this.loadDataSourceOptions(sourceClass, limit, offset, search).pipe(
            map(() => {
                sourceForm.patchValue({
                    lastScrollStart: 0,
                    lastScrollEnd: (this.scrollDynInitLimit - this.scrollDynReloadLimit),
                    lastSearch: search,
                    lastOffset: 0,
                });
            })).subscribe({
                error: (err) => {
                    console.log('Could not reload ' + sourceClass + ':' + err);
                }
            });
    }

    loadNextOptionsBatch(scrollStart: number, scrollEnd: number,
        sourceForm: AbstractControl, limit: number, offset: number, searchTerm: string) {
        const sourceClass = this.getSourceClass(sourceForm);
        sourceForm.patchValue({
            lastScrollStart: scrollStart,
            lastScrollEnd: scrollEnd,
        });

        this.loadingDataSource = true;
        this.loadDataSourceOptions(sourceClass, limit, offset, searchTerm).pipe().subscribe({
            next: () => {
                this.loadingDataSource = false;
            },
            error: (err) => {
                console.log('Could not reload ' + sourceClass + ':' + err);
                this.loadingDataSource = false;
            }
        });
    }
}
