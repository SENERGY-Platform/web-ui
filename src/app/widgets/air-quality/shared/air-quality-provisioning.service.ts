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

import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subscriber, forkJoin, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { WidgetModel, WidgetPropertiesModels } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { UBAStation } from './uba.model';
import { snackError } from '../../../core/services/snack-bar-messages';
import { environment } from '../../../../environments/environment';
import { AirQualityExternalProvider, Location, MeasurementModel } from './air-quality.model';
import { deleteResources, GeneratedResource, UnsavedGeneratedResources } from '../../shared/generated-resources';

/** A generated import instance or export that could not be created; the widget must not be saved. */
export class AirQualitySaveStepError extends Error {
    constructor(
        readonly step: 'import instance' | 'export',
        readonly provider: string,
    ) {
        super('could not create the ' + step + ' for ' + provider);
    }
}

/** The dialog state the provisioning steps read and fill; read through getters because the dialog reassigns it. */
export interface AirQualityProvisioningState {
    readonly widget: WidgetModel;
    readonly measurements: MeasurementModel[];
    readonly pollen: MeasurementModel[];
    readonly location: Location;
    readonly name: string;
    readonly ubaStationSelected: UBAStation;
    readonly importInstances: ImportInstancesModel[];
    readonly exports: ExportModel[];
    hasValidUBAStation(): boolean;
}

/** Creates or reuses the import instances and exports of one dialog and cleans up replaced ones; one instance per dialog. */
@Injectable()
export class AirQualityProvisioningService {
    private exportService = inject(ExportService);
    private importInstancesService = inject(ImportInstancesService);
    private importTypesService = inject(ImportTypesService);
    private snackBar = inject(MatSnackBar);
    private state!: AirQualityProvisioningState;
    private pendingCleanup: { kind: 'export' | 'import instance'; id: string; provider: string }[] = [];
    // created by this dialog and matched like the loaded ones, so a retry reuses them instead of creating them again
    private createdInstances: ImportInstancesModel[] = [];
    private createdExports: ExportModel[] = [];
    // deleted by a clean-up of this dialog, so no later save may adopt them from the lists loaded at open
    private deletedIds = new Set<string>();

    /** Import instances and exports of attempts not yet saved; deleted after a save that does not use them or on close. */
    readonly unsaved = new UnsavedGeneratedResources({
        delete: (resources) =>
            deleteResources(resources, {
                export: (id) => this.exportService.stopPipelineByIdIfExists(id),
                importInstance: (id) =>
                    this.importInstancesService.deleteImportInstance(id).pipe(
                        map(() => ({ status: 200 })),
                        catchError((err: unknown) => of({ status: (err as { status?: number })?.status === 404 ? 404 : 500 })),
                    ),
            }),
        reportNotDeleted: (notDeleted) =>
            snackError(
                this.snackBar,
                'Could not delete the ' + notDeleted.map((r) => r.kind + ' for ' + r.label).join(', ') + ' generated for the unsaved changes',
            ),
    });

    bind(state: AirQualityProvisioningState): void {
        this.state = state;
    }

    private get widget(): WidgetModel {
        return this.state.widget;
    }
    private get measurements(): MeasurementModel[] {
        return this.state.measurements;
    }
    private get pollen(): MeasurementModel[] {
        return this.state.pollen;
    }
    private get location(): Location {
        return this.state.location;
    }
    private get name(): string {
        return this.state.name;
    }
    private get ubaStationSelected(): UBAStation {
        return this.state.ubaStationSelected;
    }
    private get importInstances(): ImportInstancesModel[] {
        return this.state.importInstances;
    }
    private get exports(): ExportModel[] {
        return this.state.exports;
    }
    private hasValidUBAStation(): boolean {
        return this.state.hasValidUBAStation();
    }

    /** DWD, UBA and Yr are prepared in this order; any failed step errors the stream. */
    prepareSave(): Observable<any[]> {
        const observables: Observable<any>[] = [];
        observables.push(this.prepareDWDSave());
        observables.push(this.prepareUbaSave());
        observables.push(this.prepareYrSave());
        return forkJoin(observables);
    }

    // Old generated resources are deleted only after the new ones exist and the widget was saved.
    private queueCleanup(kind: 'export' | 'import instance', id: string, provider: string): void {
        if (!this.pendingCleanup.some((c) => c.kind === kind && c.id === id)) {
            this.pendingCleanup.push({ kind, id, provider });
        }
    }

    /** The import instances and exports the given widget properties refer to, including the exports measurements read from. */
    referencesOf(properties: WidgetPropertiesModels): GeneratedResource[] {
        const infos = [properties.ubaInfo, properties.dwdPollenInfo, properties.yrInfo].flatMap((i): GeneratedResource[] => [
            ...(i?.exportId ? [{ kind: 'export' as const, id: i.exportId, label: '' }] : []),
            ...(i?.importInstanceId ? [{ kind: 'import instance' as const, id: i.importInstanceId, label: '' }] : []),
        ]);
        // any export the user may pick, a generated one included, can feed a measurement
        const measurementExports = [...(properties.measurements || []), ...(properties.pollen || [])]
            .flatMap((m) => [m.export?.ID, m.outsideExport?.ID])
            .filter((id): id is string => !!id)
            .map((id) => ({ kind: 'export' as const, id, label: '' }));
        return [...infos, ...measurementExports];
    }

    /** Runs after the property update answered OK; `sent` are the references of the properties that update carried. */
    runPendingCleanup(sent: GeneratedResource[]): void {
        this.unsaved.takeForSave().forEach((r) => (r.kind === 'export' || r.kind === 'import instance') && this.queueCleanup(r.kind, r.id, r.label));
        const stillUsed = new Set([...sent, ...this.unsaved.possiblyStored()].map((r) => r.id));
        const failed: string[] = [];
        this.pendingCleanup
            .filter((c) => !stillUsed.has(c.id))
            .forEach((c) => {
                this.deletedIds.add(c.id);
                const text = c.kind + ' for ' + c.provider;
                const request: Observable<{ status: number } | void> =
                    c.kind === 'export' ? this.exportService.stopPipelineByIdIfExists(c.id) : this.importInstancesService.deleteImportInstance(c.id);
                request.subscribe({
                    next: (resp) => {
                        if (resp && resp.status >= 400 && resp.status !== 404) {
                            this.reportFailedCleanup(failed, text);
                        }
                    },
                    // a 404 means the resource is already gone
                    error: (err: unknown) => {
                        if ((err as { status?: number })?.status !== 404) {
                            this.reportFailedCleanup(failed, text);
                        }
                    },
                });
            });
        this.pendingCleanup = [];
    }

    private reportFailedCleanup(failed: string[], text: string): void {
        failed.push(text);
        snackError(this.snackBar, 'Could not delete the old ' + failed.join(', ') + ', the widget was saved');
    }

    private getImportInstancesOfType(typeId: string): ImportInstancesModel[] {
        return [...this.importInstances, ...this.createdInstances].filter((i) => i.import_type_id === typeId && !this.deletedIds.has(i.id));
    }

    private filterImportInstancesByConfigValue(
        importInstances: ImportInstancesModel[],
        configName: string,
        configValue: any,
        moreAllowed = true,
    ) {
        return importInstances.filter(
            (i) =>
                i.configs.findIndex((c) => {
                    if (c.name !== configName) {
                        return false;
                    }
                    if (moreAllowed && Array.isArray(c.value)) {
                        return c.value.findIndex((v) => v === configValue) !== -1;
                    }
                    return configValue === c.value;
                }) !== -1,
        );
    }

    private getExportsOfImports(importInstances: ImportInstancesModel[]): ExportModel[] {
        const ids = importInstances.map((i) => i.id);
        return [...this.exports, ...this.createdExports].filter(
            (e) => e.FilterType === 'import_id' && ids.indexOf(e.Filter) !== -1 && !this.deletedIds.has(e.ID || ''),
        );
    }

    private generateUbaImportInstance(stationId: string): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (station ' + stationId + ')',
            configs: [
                {
                    name: 'FilterStationIds',
                    value: ['' + +this.ubaStationSelected.station_id],
                },
            ],
            import_type_id: environment.importTypeIdUbaStation,
            generated: true,
        } as ImportInstancesModel).pipe(tap((instance) => this.recordInstance(instance, 'UBA')));
    }

    private prepareUbaSave(): Observable<null> {
        if (!this.hasValidUBAStation()) {
            // no station -> nothing to do
            return of(null);
        }
        return new Observable<null>((obs) => {
            if (this.widget.properties.ubaInfo === undefined) {
                this.widget.properties.ubaInfo = {};
            }
            this.widget.properties.ubaInfo.stationId = '' + this.ubaStationSelected.station_id;
            let ubaInstances = this.getImportInstancesOfType(environment.importTypeIdUbaStation);
            ubaInstances = this.filterImportInstancesByConfigValue(
                ubaInstances,
                'FilterStationIds',
                '' + this.ubaStationSelected.station_id,
            );
            if (ubaInstances.length === 0) {
                // no matching import instance, generate import and export
                if (
                    this.widget.properties.ubaInfo.importGenerated === true &&
                    this.widget.properties.ubaInfo.importInstanceId !== undefined
                ) {
                    this.queueCleanup('import instance', this.widget.properties.ubaInfo.importInstanceId, 'UBA');
                }
                this.generateUbaImportInstance(this.widget.properties.ubaInfo.stationId).subscribe({
                    next: (instance) => {
                        if (obs.closed) {
                            return;
                        }
                        this.adoptCreatedInstance(instance);
                        if (this.widget.properties.ubaInfo === undefined) {
                            this.widget.properties.ubaInfo = {};
                        }
                        this.widget.properties.ubaInfo.importInstanceId = instance.id;
                        this.widget.properties.ubaInfo.importGenerated = true;
                        this.helperGenerateUbaExport(instance, obs);
                    },
                    error: () => obs.error(new AirQualitySaveStepError('import instance', 'UBA')),
                });
            } else {
                // matching import instance found, might need to generate export
                const oldInstance = ubaInstances.find((i) => i.id === this.widget.properties.ubaInfo?.importInstanceId);
                let instance: ImportInstancesModel;
                if (oldInstance !== undefined) {
                    instance = oldInstance;
                } else {
                    if (
                        this.widget.properties.ubaInfo.importGenerated === true &&
                        this.widget.properties.ubaInfo.importInstanceId !== undefined
                    ) {
                        this.queueCleanup('import instance', this.widget.properties.ubaInfo.importInstanceId, 'UBA');
                    }
                    instance = ubaInstances[0];
                    // adopted from the loaded list: generated only if this dialog created it, else it belongs to others
                    this.widget.properties.ubaInfo.importGenerated = this.isCreatedHere(instance.id);
                }
                if (this.widget.properties.ubaInfo === undefined) {
                    this.widget.properties.ubaInfo = {};
                }
                this.widget.properties.ubaInfo.importInstanceId = instance.id;
                const matchingExports = this.getExportsOfImports(ubaInstances);
                if (matchingExports.length === 0) {
                    this.helperGenerateUbaExport(instance, obs);
                } else {
                    // matching export found, no need to generate anything
                    const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.ubaInfo?.exportId);
                    let exp: ExportModel;
                    if (oldExport !== undefined) {
                        exp = oldExport;
                    } else {
                        if (
                            this.widget.properties.ubaInfo?.exportGenerated === true &&
                            this.widget.properties.ubaInfo?.exportId !== undefined
                        ) {
                            this.cleanMeasurementsExportInfo(this.widget.properties.ubaInfo?.exportId);
                            this.queueCleanup('export', this.widget.properties.ubaInfo.exportId, 'UBA');
                        }
                        exp = matchingExports[0];
                        this.widget.properties.ubaInfo.exportGenerated = this.isCreatedHere(exp.ID);
                    }
                    this.widget.properties.ubaInfo.exportId = exp.ID;
                    this.widget.properties.ubaInfo.exportDatabaseId = exp.ExportDatabaseID;
                    this.fillMeasurementsUbaInfo(exp);
                    obs.next(null);
                    obs.complete();
                }
            }
        });
    }

    /**
     * Cleans measurements from old uba export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateUbaExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (this.widget.properties.ubaInfo?.exportGenerated === true && this.widget.properties.ubaInfo?.exportId !== undefined) {
            this.cleanMeasurementsExportInfo(this.widget.properties.ubaInfo?.exportId);
            this.queueCleanup('export', this.widget.properties.ubaInfo.exportId, 'UBA');
        }
        this.generateExportOfImport(instance, environment.importTypeIdUbaStation, 'UBA').subscribe((exp) => {
            if (obs.closed) {
                return;
            }
            if (exp === null) {
                obs.error(new AirQualitySaveStepError('export', 'UBA'));
                return;
            }
            this.createdExports.push(exp);
            if (this.widget.properties.ubaInfo === undefined) {
                this.widget.properties.ubaInfo = {};
            }
            this.widget.properties.ubaInfo.exportId = exp.ID;
            this.widget.properties.ubaInfo.exportGenerated = true;
            this.widget.properties.ubaInfo.exportDatabaseId = exp.ExportDatabaseID;
            this.fillMeasurementsUbaInfo(exp);
            obs.next(null);
            obs.complete();
        });
    }

    private fillMeasurementsUbaInfo(exp: ExportModel) {
        this.measurements.forEach((m) => {
            if (m.provider === AirQualityExternalProvider.UBA && !m.has_outside) {
                m.outsideExport = exp;
                m.outsideData.column = exp.Values.find(
                    (v) => v.Path === 'value.measurements.' + m.short_name + '.' + m.short_name + '_value',
                );
            }
        });
    }

    private cleanMeasurementsExportInfo(exportId: string) {
        this.measurements.forEach((m) => {
            if (m.outsideExport?.ID === exportId) {
                m.outsideExport = undefined;
                m.outsideData.column = undefined;
            }
        });
    }

    private prepareDWDSave(): Observable<any> {
        const selectedPollen = this.pollen.filter((p) => p.is_enabled);
        if (selectedPollen.length === 0) {
            if (this.widget.properties.dwdPollenInfo !== undefined) {
                if (
                    this.widget.properties.dwdPollenInfo.importGenerated === true &&
                    this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                ) {
                    this.queueCleanup('import instance', this.widget.properties.dwdPollenInfo.importInstanceId, 'DWD pollen');
                }
                this.widget.properties.dwdPollenInfo.importGenerated = undefined;
                this.widget.properties.dwdPollenInfo.importInstanceId = undefined;

                if (
                    this.widget.properties.dwdPollenInfo.exportGenerated === true &&
                    this.widget.properties.dwdPollenInfo.exportId !== undefined
                ) {
                    this.queueCleanup('export', this.widget.properties.dwdPollenInfo.exportId, 'DWD pollen');
                }
                this.widget.properties.dwdPollenInfo.exportGenerated = undefined;
                this.widget.properties.dwdPollenInfo.exportId = undefined;
                this.widget.properties.dwdPollenInfo.exportDatabaseId = undefined;
            }
            return of(null);
        } else {
            return new Observable<any>((obs) => {
                let matchingImportInstances = this.getImportInstancesOfType(environment.importTypeIdDwdPollen);
                matchingImportInstances = this.filterImportInstancesByConfigValue(matchingImportInstances, 'lat', this.location.latitude);
                matchingImportInstances = this.filterImportInstancesByConfigValue(matchingImportInstances, 'long', this.location.longitude);
                selectedPollen.forEach(
                    (p) =>
                        (matchingImportInstances = this.filterImportInstancesByConfigValue(
                            matchingImportInstances,
                            'FilterPollen',
                            p.short_name,
                        )),
                );
                if (matchingImportInstances.length === 0) {
                    if (
                        this.widget.properties.dwdPollenInfo?.importGenerated === true &&
                        this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                    ) {
                        this.queueCleanup('import instance', this.widget.properties.dwdPollenInfo.importInstanceId, 'DWD pollen');
                    }
                    this.generateDwdImportInstance(this.location.latitude, this.location.longitude, selectedPollen).subscribe({
                        next: (instance) => {
                            if (obs.closed) {
                                return;
                            }
                            this.adoptCreatedInstance(instance);
                            if (this.widget.properties.dwdPollenInfo === undefined) {
                                this.widget.properties.dwdPollenInfo = {};
                            }
                            this.widget.properties.dwdPollenInfo.importInstanceId = instance.id;
                            this.widget.properties.dwdPollenInfo.importGenerated = true;
                            this.helperGenerateDWDExport(instance, obs);
                        },
                        error: () => obs.error(new AirQualitySaveStepError('import instance', 'DWD pollen')),
                    });
                } else {
                    if (this.widget.properties.dwdPollenInfo === undefined) {
                        this.widget.properties.dwdPollenInfo = {};
                    }
                    // matching import instance found, might need to generate export
                    const oldInstance = matchingImportInstances.find(
                        (i) => i.id === this.widget.properties.dwdPollenInfo?.importInstanceId,
                    );
                    let instance: ImportInstancesModel;
                    if (oldInstance !== undefined) {
                        instance = oldInstance;
                    } else {
                        if (
                            this.widget.properties.dwdPollenInfo.importGenerated === true &&
                            this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                        ) {
                            this.queueCleanup('import instance', this.widget.properties.dwdPollenInfo.importInstanceId, 'DWD pollen');
                        }
                        instance = matchingImportInstances[0];
                        // adopted from the loaded list: generated only if this dialog created it, else it belongs to others
                        this.widget.properties.dwdPollenInfo.importGenerated = this.isCreatedHere(instance.id);
                    }
                    this.widget.properties.dwdPollenInfo.importInstanceId = instance.id;
                    const matchingExports = this.getExportsOfImports(matchingImportInstances);
                    if (matchingExports.length === 0) {
                        this.helperGenerateDWDExport(instance, obs);
                    } else {
                        // matching export found, no need to generate anything
                        const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.dwdPollenInfo?.exportId);
                        let exp: ExportModel;
                        if (oldExport !== undefined) {
                            exp = oldExport;
                        } else {
                            if (
                                this.widget.properties.dwdPollenInfo?.exportGenerated === true &&
                                this.widget.properties.dwdPollenInfo?.exportId !== undefined
                            ) {
                                this.queueCleanup('export', this.widget.properties.dwdPollenInfo.exportId, 'DWD pollen');
                            }
                            exp = matchingExports[0];
                            this.widget.properties.dwdPollenInfo.exportGenerated = this.isCreatedHere(exp.ID);
                        }
                        this.widget.properties.dwdPollenInfo.exportId = exp.ID;
                        this.widget.properties.dwdPollenInfo.exportDatabaseId = exp.ExportDatabaseID;
                        obs.next(null);
                        obs.complete();
                    }
                }
            });
        }
    }

    private generateDwdImportInstance(lat: number, long: number, pollen: MeasurementModel[]): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (lat: ' + lat + ', long: ' + long + ')',
            configs: [
                {
                    name: 'lat',
                    value: lat,
                },
                {
                    name: 'long',
                    value: long,
                },
                {
                    name: 'FilterPollen',
                    value: pollen.map((p) => p.short_name),
                },
            ],
            import_type_id: environment.importTypeIdDwdPollen,
            generated: true,
        } as ImportInstancesModel).pipe(tap((instance) => this.recordInstance(instance, 'DWD pollen')));
    }

    /**
     * Cleans measurements from old dwd export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateDWDExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (
            this.widget.properties.dwdPollenInfo?.exportGenerated === true &&
            this.widget.properties.dwdPollenInfo?.exportId !== undefined
        ) {
            this.queueCleanup('export', this.widget.properties.dwdPollenInfo.exportId, 'DWD pollen');
        }
        this.generateExportOfImport(instance, environment.importTypeIdDwdPollen, 'DWD pollen').subscribe((exp) => {
            if (obs.closed) {
                return;
            }
            if (exp === null) {
                obs.error(new AirQualitySaveStepError('export', 'DWD pollen'));
                return;
            }
            this.createdExports.push(exp);
            if (this.widget.properties.dwdPollenInfo === undefined) {
                this.widget.properties.dwdPollenInfo = {};
            }
            this.widget.properties.dwdPollenInfo.exportId = exp.ID;
            this.widget.properties.dwdPollenInfo.exportGenerated = true;
            this.widget.properties.dwdPollenInfo.exportDatabaseId = exp.ExportDatabaseID;
            obs.next(null);
            obs.complete();
        });
    }

    private generateYrImportInstance(): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (lat: ' + this.location.latitude + ', long: ' + this.location.longitude + ')',
            configs: [
                {
                    name: 'lat',
                    value: this.location.latitude,
                },
                {
                    name: 'long',
                    value: this.location.longitude,
                },
                {
                    name: 'max_forecasts',
                    value: 1,
                },
            ],
            import_type_id: environment.importTypeIdYrForecast,
            generated: true,
        } as ImportInstancesModel).pipe(tap((instance) => this.recordInstance(instance, 'Yr')));
    }

    private recordInstance(instance: ImportInstancesModel, provider: string): void {
        this.unsaved.record({ kind: 'import instance', id: instance.id, label: provider });
    }

    // Only an attempt still running adopts what it created; a late answer to an aborted one is left to the clean-up.
    private adoptCreatedInstance(instance: ImportInstancesModel): void {
        // without its configs the instance cannot be matched again, a retry then creates a new one
        if (Array.isArray(instance.configs)) {
            this.createdInstances.push(instance);
        }
    }

    private isCreatedHere(id: string | undefined): boolean {
        return this.createdInstances.some((i) => i.id === id) || this.createdExports.some((e) => e.ID === id);
    }

    /** Answers null when the import type cannot be loaded or the export cannot be started. */
    private generateExportOfImport(importInstance: ImportInstancesModel, typeId: string, provider: string): Observable<ExportModel | null> {
        return this.importTypesService.getImportType(typeId).pipe(
            mergeMap((type) =>
                this.exportService.startPipeline({
                    Offset: 'smallest',
                    Name: 'AirQuality Widget: ' + this.name,
                    Filter: importInstance.id,
                    FilterType: 'import_id',
                    ServiceName: type.name,
                    Values: this.importTypesService.parseImportTypeExportValues(type),
                    EntityName: importInstance.name,
                    Topic: importInstance.kafka_topic,
                    TimePath: 'time',
                    ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                    TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
                    Generated: true,
                } as ExportModel),
            ),
            tap((exp) => exp !== null && this.unsaved.record({ kind: 'export', id: exp.ID || '', label: provider })),
            catchError(() => of(null)),
        );
    }

    private prepareYrSave(): Observable<null> {
        return new Observable<null>((obs) => {
            if (this.widget.properties.yrInfo === undefined) {
                this.widget.properties.yrInfo = {};
            }
            let yrInstances = this.getImportInstancesOfType(environment.importTypeIdYrForecast);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'lat', this.location.latitude);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'long', this.location.longitude);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'max_forecasts', 1);
            if (yrInstances.length === 0) {
                // no matching import instance, generate import and export
                if (
                    this.widget.properties.yrInfo.importGenerated === true &&
                    this.widget.properties.yrInfo.importInstanceId !== undefined
                ) {
                    this.queueCleanup('import instance', this.widget.properties.yrInfo.importInstanceId, 'Yr');
                }
                this.generateYrImportInstance().subscribe({
                    next: (instance) => {
                        if (obs.closed) {
                            return;
                        }
                        this.adoptCreatedInstance(instance);
                        if (this.widget.properties.yrInfo === undefined) {
                            this.widget.properties.yrInfo = {};
                        }
                        this.widget.properties.yrInfo.importInstanceId = instance.id;
                        this.widget.properties.yrInfo.importGenerated = true;
                        this.helperGenerateYrExport(instance, obs);
                    },
                    error: () => obs.error(new AirQualitySaveStepError('import instance', 'Yr')),
                });
            } else {
                // matching import instance found, might need to generate export
                const oldInstance = yrInstances.find((i) => i.id === this.widget.properties.yrInfo?.importInstanceId);
                let instance: ImportInstancesModel;
                if (oldInstance !== undefined) {
                    instance = oldInstance;
                } else {
                    if (
                        this.widget.properties.yrInfo.importGenerated === true &&
                        this.widget.properties.yrInfo.importInstanceId !== undefined
                    ) {
                        this.queueCleanup('import instance', this.widget.properties.yrInfo.importInstanceId, 'Yr');
                    }
                    instance = yrInstances[0];
                    // adopted from the loaded list: generated only if this dialog created it, else it belongs to others
                    this.widget.properties.yrInfo.importGenerated = this.isCreatedHere(instance.id);
                }
                if (this.widget.properties.yrInfo === undefined) {
                    this.widget.properties.yrInfo = {};
                }
                this.widget.properties.yrInfo.importInstanceId = instance.id;
                const matchingExports = this.getExportsOfImports(yrInstances);
                if (matchingExports.length === 0) {
                    this.helperGenerateYrExport(instance, obs);
                } else {
                    // matching export found, no need to generate anything
                    const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.yrInfo?.exportId);
                    let exp: ExportModel;
                    if (oldExport !== undefined) {
                        exp = oldExport;
                    } else {
                        if (
                            this.widget.properties.yrInfo?.exportGenerated === true &&
                            this.widget.properties.yrInfo?.exportId !== undefined
                        ) {
                            this.cleanMeasurementsExportInfo(this.widget.properties.yrInfo?.exportId);
                            this.queueCleanup('export', this.widget.properties.yrInfo.exportId, 'Yr');
                        }
                        exp = matchingExports[0];
                        this.widget.properties.yrInfo.exportGenerated = this.isCreatedHere(exp.ID);
                    }
                    this.widget.properties.yrInfo.exportId = exp.ID;
                    this.widget.properties.yrInfo.exportDatabaseId = exp.ExportDatabaseID;
                    this.fillMeasurementsYrInfo(exp);
                    obs.next(null);
                    obs.complete();
                }
            }
        });
    }

    /**
     * Cleans measurements from old uba export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateYrExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (this.widget.properties.yrInfo?.exportGenerated === true && this.widget.properties.yrInfo?.exportId !== undefined) {
            this.cleanMeasurementsExportInfo(this.widget.properties.yrInfo?.exportId);
            this.queueCleanup('export', this.widget.properties.yrInfo.exportId, 'Yr');
        }
        this.generateExportOfImport(instance, environment.importTypeIdYrForecast, 'Yr').subscribe((exp) => {
            if (obs.closed) {
                return;
            }
            if (exp === null) {
                obs.error(new AirQualitySaveStepError('export', 'Yr'));
                return;
            }
            this.createdExports.push(exp);
            if (this.widget.properties.yrInfo === undefined) {
                this.widget.properties.yrInfo = {};
            }
            this.widget.properties.yrInfo.exportId = exp.ID;
            this.widget.properties.yrInfo.exportDatabaseId = exp.ExportDatabaseID;
            this.widget.properties.yrInfo.exportGenerated = true;
            this.fillMeasurementsYrInfo(exp);
            obs.next(null);
            obs.complete();
        });
    }

    private fillMeasurementsYrInfo(exp: ExportModel) {
        this.measurements.forEach((m) => {
            if (m.provider === AirQualityExternalProvider.Yr && !m.has_outside) {
                m.outsideExport = exp;
                let path = '';
                switch (m.short_name) {
                case 'Temp.':
                    path = 'value.instant_air_temperature';
                    break;
                case 'Pressure':
                    path = 'value.instant_air_pressure_at_sea_level';
                    break;
                case 'Hum.':
                    path = 'value.instant_relative_humidity';
                    break;
                case 'Precipitation':
                    path = 'value.1_hours_precipitation_amount';
                    break;
                }
                m.outsideData.column = exp.Values.find((v) => v.Path === path);
            }
        });
    }
}
