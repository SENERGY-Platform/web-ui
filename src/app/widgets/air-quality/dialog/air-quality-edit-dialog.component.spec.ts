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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of, Subject, throwError } from 'rxjs';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';
import { environment } from '../../../../environments/environment';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { GENERATED_RESOURCE_STORAGE, PENDING_GENERATED_RESOURCES_KEY, PendingGeneratedResource } from '../../shared/generated-resource-janitor';
import { MemoryStorage } from '../../shared/memory-storage.mock';

describe('AirQualityEditDialogComponent save', () => {
    let component: AirQualityEditDialogComponent;
    let fixture: ComponentFixture<AirQualityEditDialogComponent>;
    let snackOpen: jasmine.Spy;
    let dashboardServiceSpy: Spy<DashboardService>;
    let exportServiceSpy: Spy<ExportService>;
    let importInstancesServiceSpy: Spy<ImportInstancesService>;
    let importTypesServiceSpy: Spy<ImportTypesService>;
    let matDialogRefSpy: Spy<MatDialogRef<AirQualityEditDialogComponent>>;
    let storage: MemoryStorage;
    const pending = (): PendingGeneratedResource[] => JSON.parse(storage.data.get(PENDING_GENERATED_RESOURCES_KEY) || '[]');
    const pendingIds = () => pending().map((e) => e.resource.id).sort();

    const instance = { id: 'instance1', name: 'instance', kafka_topic: 'topic' } as ImportInstancesModel;

    beforeEach(() => {
        dashboardServiceSpy = createSpyFromClass(DashboardService);
        exportServiceSpy = createSpyFromClass(ExportService);
        importInstancesServiceSpy = createSpyFromClass(ImportInstancesService);
        importTypesServiceSpy = createSpyFromClass(ImportTypesService);
        matDialogRefSpy = createSpyFromClass<MatDialogRef<AirQualityEditDialogComponent>>(MatDialogRef);

        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
        dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'OK' }));
        dashboardServiceSpy.getWidget.and.returnValue(of({ id: 'widget1', properties: {} } as WidgetModel));
        importInstancesServiceSpy.saveImportInstance.and.returnValue(of(instance));
        importInstancesServiceSpy.deleteImportInstance.and.returnValue(of(undefined));
        exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
        importTypesServiceSpy.getImportType.and.returnValue(of({ name: 'type' } as ImportTypeModel));
        importTypesServiceSpy.parseImportTypeExportValues.and.returnValue([]);
        exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export1', Values: [] } as unknown as ExportModel));

        storage = new MemoryStorage();
        TestBed.configureTestingModule({
            providers: [
                { provide: GENERATED_RESOURCE_STORAGE, useFactory: () => storage },
                { provide: AuthorizationService, useValue: { getUserId: () => 'user-1' } },
                { provide: DashboardService, useValue: dashboardServiceSpy },
                { provide: ExportService, useValue: exportServiceSpy },
                { provide: ImportInstancesService, useValue: importInstancesServiceSpy },
                { provide: ImportTypesService, useValue: importTypesServiceSpy },
                { provide: MatDialogRef, useValue: matDialogRefSpy },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        dashboardId: 'dashboard1',
                        widgetId: 'widget1',
                        userHasUpdateNameAuthorization: false,
                        userHasUpdatePropertiesAuthorization: true,
                    },
                },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
        // ngOnInit is not run: the test sets the state a loaded dialog would have
        fixture = TestBed.createComponent(AirQualityEditDialogComponent);
        component = fixture.componentInstance;
        component.widget = { id: 'widget1', properties: {} } as any;
        component.ready = true;
    });

    function expectAborted(text: string): void {
        expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
        expect(matDialogRefSpy.close.calls.count()).toBe(0);
        expect(component.ready).toBeTrue();
        expect(snackOpen.calls.mostRecent().args[0]).toContain(text);
        expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
    }

    function useUba(): void {
        component.ubaStationSelected = { station_id: 5, station_longitude: 1, station_latitude: 1, station_name: 'station' };
    }

    function useDwd(): void {
        component.pollen[0].is_enabled = true;
    }

    it('stores the widget and closes when every import and export was created', () => {
        useUba();
        useDwd();

        component.save();

        expect(exportServiceSpy.startPipeline.calls.count()).toBe(3);
        expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
        expect(matDialogRefSpy.close.calls.count()).toBe(1);
        expect(snackOpen).not.toHaveBeenCalled();
    });

    it('does not store the widget when the Yr export cannot be started', () => {
        exportServiceSpy.startPipeline.and.returnValue(of(null));

        component.save();

        expectAborted('Could not create the export for Yr');
    });

    it('names the UBA export when only that one fails', () => {
        useUba();
        importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
            of({ ...instance, id: i.import_type_id === environment.importTypeIdUbaStation ? 'uba' : 'yr' }));
        exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) =>
            of(exp.Filter === 'uba' ? null : ({ ID: 'export1', Values: [] } as unknown as ExportModel)));

        component.save();

        expectAborted('Could not create the export for UBA');
    });

    it('names the DWD pollen export when only that one fails', () => {
        useDwd();
        importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
            of({ ...instance, id: i.import_type_id === environment.importTypeIdDwdPollen ? 'dwd' : 'yr' }));
        exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) =>
            of(exp.Filter === 'dwd' ? null : ({ ID: 'export1', Values: [] } as unknown as ExportModel)));

        component.save();

        expectAborted('Could not create the export for DWD pollen');
    });

    it('does not store the widget when the import instance cannot be saved', () => {
        importInstancesServiceSpy.saveImportInstance.and.returnValue(throwError(() => new Error('500')));

        component.save();

        expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
        expectAborted('Could not create the import instance for Yr');
    });

    it('treats an import type that cannot be loaded as a failed export', () => {
        importTypesServiceSpy.getImportType.and.returnValue(throwError(() => new Error('500')));

        component.save();

        expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
        expectAborted('Could not create the export for Yr');
    });

    it('reports a failed cleanup of the old import instance when nothing can be logged and still stores the widget', () => {
        storage.failWrite = true;
        component.widget.properties.yrInfo = { importGenerated: true, importInstanceId: 'old' } as any;
        importInstancesServiceSpy.deleteImportInstance.and.returnValue(throwError(() => new Error('500')));

        component.save();

        expect(importInstancesServiceSpy.deleteImportInstance.calls.allArgs()).toEqual([['old']]);
        expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not delete the old import instance for Yr');
        expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
        expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
        expect(matDialogRefSpy.close.calls.count()).toBe(1);
    });

    describe('cleanup of the old generated resources', () => {
        let order: string[];

        beforeEach(() => {
            order = [];
            component.widget.properties.yrInfo = {
                importGenerated: true,
                importInstanceId: 'old',
                exportGenerated: true,
                exportId: 'old_export',
            } as any;
            dashboardServiceSpy.updateWidgetProperty.and.callFake(() => {
                order.push('save');
                return of({ message: 'OK' });
            });
            importInstancesServiceSpy.deleteImportInstance.and.callFake(() => {
                order.push('delete import instance');
                return of(undefined);
            });
            exportServiceSpy.stopPipelineByIdIfExists.and.callFake(() => {
                order.push('delete export');
                return of({ status: 200 });
            });
        });

        it('deletes nothing when the new export cannot be created', () => {
            exportServiceSpy.startPipeline.and.returnValue(of(null));

            component.save();

            expectAborted('Could not create the export for Yr');
            expect(order).toEqual([]);
        });

        it('deletes nothing when the new import instance cannot be saved', () => {
            importInstancesServiceSpy.saveImportInstance.and.returnValue(throwError(() => new Error('500')));

            component.save();

            expectAborted('Could not create the import instance for Yr');
            expect(order).toEqual([]);
        });

        it('deletes nothing after the widget was saved and logs the old import instance and export for the clean-up', () => {
            component.save();

            expect(order).toEqual(['save']);
            expect(pending().map((e) => [e.userId, e.dashboardId, e.widgetId, e.resource.kind, e.resource.id, e.resource.label])).toEqual([
                ['user-1', 'dashboard1', 'widget1', 'import instance', 'old', 'Yr'],
                ['user-1', 'dashboard1', 'widget1', 'export', 'old_export', 'Yr'],
            ]);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('does not log a resource the saved widget still uses', () => {
            importInstancesServiceSpy.saveImportInstance.and.returnValue(of({ ...instance, id: 'old' }));

            component.save();

            expect(order).toEqual(['save']);
            expect(pendingIds()).toEqual(['old_export']);
        });

        it('deletes the old resources at once when they cannot be logged, except what the saved widget still uses', () => {
            storage.failWrite = true;
            importInstancesServiceSpy.saveImportInstance.and.returnValue(of({ ...instance, id: 'old' }));

            component.save();

            expect(order).toEqual(['save', 'delete export']);
            expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).toEqual([['old_export']]);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('stores the widget and names the old export that could not be deleted when nothing can be logged', () => {
            storage.failWrite = true;
            exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 500 }));

            component.save();

            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
            expect(matDialogRefSpy.close.calls.count()).toBe(1);
            expect(snackOpen.calls.mostRecent().args[0]).toBe('Could not delete the old export for Yr, the widget was saved');
            expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
        });

        it('logs the old resources although the name update failed', () => {
            component.userHasUpdateNameAuthorization = true;
            dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));

            component.save();

            expect(order).toEqual(['save']);
            expect(pendingIds()).toEqual(['old', 'old_export']);
            expect(matDialogRefSpy.close.calls.count()).toBe(0);
        });

        it('takes a 404 for a resource that is already gone when nothing can be logged', () => {
            storage.failWrite = true;
            exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 404 }));
            importInstancesServiceSpy.deleteImportInstance.and.returnValue(throwError(() => ({ status: 404 })));

            component.save();

            expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(1);
            expect(matDialogRefSpy.close.calls.count()).toBe(1);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        describe('resources of an attempt that was not saved', () => {
            // the test environment uses one import type id for all providers, so they are told apart by their configs
            const providerOf = (i: ImportInstancesModel) => {
                const names = (i.configs || []).map((c) => c.name);
                return names.includes('FilterStationIds') ? 'uba' : names.includes('FilterPollen') ? 'dwd' : 'yr';
            };

            beforeEach(() => {
                // the services answer what they stored, so the dialog can match its own instances and exports again
                importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
                    of({ ...i, id: providerOf(i), kafka_topic: 'topic' }),
                );
                exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) => of({ ...exp, ID: 'export_' + exp.Filter }));
            });

            function closeDialog(): void {
                component.close();
                fixture.destroy();
            }

            // UBA import instance and export and the Yr import instance are created, the Yr export fails
            function failAtYrExport(): void {
                useUba();
                exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) =>
                    of(exp.Filter === 'yr' ? null : { ...exp, ID: 'export_' + exp.Filter }),
                );
            }

            it('deletes nothing when the dialog is closed and keeps exactly what the failed attempt created logged', () => {
                failAtYrExport();
                component.save();
                expectAborted('Could not create the export for Yr');

                closeDialog();

                expect(order).toEqual([]);
                expect(pendingIds()).toEqual(['export_uba', 'uba', 'yr']);
                expect(snackOpen.calls.count()).toBe(1);
            });

            it('reuses what the failed attempt created on a retry and logs only the old resources', () => {
                failAtYrExport();
                component.save();
                exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) => of({ ...exp, ID: 'export_' + exp.Filter }));

                component.save();
                closeDialog();

                expect(importInstancesServiceSpy.saveImportInstance.calls.count()).toBe(2);
                expect(exportServiceSpy.startPipeline.calls.allArgs().map((a) => a[0].Filter)).toEqual(['uba', 'yr', 'yr']);
                expect(order).toEqual(['save']);
                expect(pendingIds()).toEqual(['old', 'old_export']);
                const saved = dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3];
                expect(saved.ubaInfo).toEqual(jasmine.objectContaining({ importInstanceId: 'uba', exportId: 'export_uba' }));
                expect(saved.yrInfo).toEqual(jasmine.objectContaining({ importInstanceId: 'yr', exportId: 'export_yr' }));
            });

            it('does not reuse an instance that a later save of the same dialog released for clean-up', () => {
                component.userHasUpdateNameAuthorization = true;
                dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));
                let n = 0;
                importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
                    of({ ...i, id: 'yr' + ++n, kafka_topic: 'topic' }),
                );

                component.save();
                component.location = { latitude: 1, longitude: 1 };
                component.save();
                component.location = { latitude: 0, longitude: 0 };
                component.save();

                expect(importInstancesServiceSpy.saveImportInstance.calls.count()).toBe(3);
                expect(dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3].yrInfo.importInstanceId).toBe('yr3');
                expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                expect(pendingIds()).toEqual(['export_yr1', 'export_yr2', 'old', 'old_export', 'yr1', 'yr2']);
            });

            it('deletes nothing new after a successful save, also when the dialog closes', () => {
                useUba();

                component.save();
                closeDialog();

                expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
            });

            it('waits for a running attempt and logs only the old resources once it saved', () => {
                const response = new Subject<{ message: string }>();
                dashboardServiceSpy.updateWidgetProperty.and.returnValue(response);

                component.save();
                closeDialog();
                expect(order).toEqual([]);
                response.next({ message: 'OK' });
                response.complete();

                expect(order).toEqual([]);
                expect(pendingIds()).toEqual(['old', 'old_export']);
            });

            it('logs what a step creates after the attempt failed and the dialog was closed', () => {
                useUba();
                const ubaInstance = new Subject<ImportInstancesModel>();
                importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
                    providerOf(i) === 'uba' ? ubaInstance : throwError(() => new Error('500')),
                );

                component.save();
                expectAborted('Could not create the import instance for Yr');
                closeDialog();
                expect(order).toEqual([]);
                ubaInstance.next({ ...instance, id: 'uba' });
                ubaInstance.complete();

                // the aborted attempt's chain ends with the answer, so no export is created for it
                expect(order).toEqual([]);
                expect(pendingIds()).toEqual(['uba']);
                expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
            });

            it('keeps what a property update without OK sent logged when the dialog closes, without a notice', () => {
                useUba();
                dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error update' }));

                component.save();
                closeDialog();

                expect(dashboardServiceSpy.getWidget.calls.count()).toBe(0);
                expect(order).toEqual([]);
                expect(pendingIds()).toEqual(['export_uba', 'export_yr', 'old', 'old_export', 'uba', 'yr']);
                expect(snackOpen).not.toHaveBeenCalled();
            });

            it('never deletes what a property update without OK sent, not even after a later save', () => {
                let n = 0;
                importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
                    of({ ...i, id: 'yr' + ++n, kafka_topic: 'topic' }),
                );
                dashboardServiceSpy.updateWidgetProperty.and.returnValues(of({ message: 'error update' }), of({ message: 'OK' }));

                component.save();
                component.location = { latitude: 1, longitude: 1 };
                component.save();

                expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
            });

            describe('with an aborted attempt whose UBA import instance answers late', () => {
                let lateUba: Subject<ImportInstancesModel>;
                const lateInstance = {
                    ...instance,
                    id: 'uba1',
                    configs: [{ name: 'FilterStationIds', value: ['5'] }],
                } as ImportInstancesModel;

                beforeEach(() => {
                    useUba();
                    lateUba = new Subject<ImportInstancesModel>();
                    let uba = 0;
                    let yr = 0;
                    importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) => {
                        if (providerOf(i) === 'uba') {
                            return ++uba === 1 ? lateUba : of({ ...i, id: 'uba2', kafka_topic: 'topic' });
                        }
                        return ++yr === 1 ? throwError(() => new Error('500')) : of({ ...i, id: 'yr', kafka_topic: 'topic' });
                    });
                    component.save();
                    expectAborted('Could not create the import instance for Yr');
                });

                function answerLate(): void {
                    lateUba.next(lateInstance);
                    lateUba.complete();
                }

                it('cleans up by what the save sent, not by what the late answer would have written', () => {
                    const response = new Subject<{ message: string }>();
                    let sent: Record<string, unknown> = {};
                    dashboardServiceSpy.updateWidgetProperty.and.callFake((_d: string, _w: string, _p: string[], properties: unknown) => {
                        sent = JSON.parse(JSON.stringify(properties));
                        return response;
                    });

                    component.save();
                    answerLate();
                    response.next({ message: 'OK' });
                    response.complete();

                    const used = jasmine.objectContaining({ importInstanceId: 'uba2', exportId: 'export_uba2' });
                    expect(sent['ubaInfo']).toEqual(used);
                    expect(component.widget.properties.ubaInfo).toEqual(used);
                    expect(pendingIds()).toContain('uba1');
                    expect(pendingIds()).not.toContain('uba2');
                    expect(pendingIds()).not.toContain('export_uba2');
                    expect(exportServiceSpy.startPipeline.calls.allArgs().map((a) => a[0].Filter)).not.toContain('uba1');
                });

                it('leaves the widget handed to the dashboard alone when the late answer arrives after the save', () => {
                    component.save();
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    const handed = matDialogRefSpy.close.calls.first().args[0] as WidgetModel;
                    closeDialog();

                    answerLate();

                    expect(handed.properties.ubaInfo).toEqual(jasmine.objectContaining({ importInstanceId: 'uba2', exportId: 'export_uba2' }));
                    expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                    expect(pendingIds()).toContain('uba1');
                    expect(pendingIds()).not.toContain('uba2');
                    expect(exportServiceSpy.startPipeline.calls.allArgs().map((a) => a[0].Filter)).not.toContain('uba1');
                });
            });

            it('marks an adopted import instance and export of others as not generated and never releases them', () => {
                component.widget.properties.ubaInfo = {
                    stationId: '4',
                    importGenerated: true,
                    importInstanceId: 'own_uba',
                    exportGenerated: true,
                    exportId: 'own_uba_export',
                };
                component.widget.properties.dwdPollenInfo = {
                    importGenerated: true,
                    importInstanceId: 'own_dwd',
                    exportGenerated: true,
                    exportId: 'own_dwd_export',
                };
                component.widget.properties.yrInfo = {
                    importGenerated: true,
                    importInstanceId: 'own_yr',
                    exportGenerated: true,
                    exportId: 'own_yr_export',
                };
                const position = [
                    { name: 'lat', value: 0 },
                    { name: 'long', value: 0 },
                ];
                component.importInstances = [
                    { id: 'shared_uba', import_type_id: environment.importTypeIdUbaStation, configs: [{ name: 'FilterStationIds', value: ['5'] }] },
                    {
                        id: 'shared_dwd',
                        import_type_id: environment.importTypeIdDwdPollen,
                        configs: [...position, { name: 'FilterPollen', value: [component.pollen[0].short_name] }],
                    },
                    { id: 'shared_yr', import_type_id: environment.importTypeIdYrForecast, configs: [...position, { name: 'max_forecasts', value: 1 }] },
                ] as ImportInstancesModel[];
                component.exports = ['uba', 'dwd', 'yr'].map(
                    (p) => ({ ID: 'shared_' + p + '_export', FilterType: 'import_id', Filter: 'shared_' + p, Values: [] }) as unknown as ExportModel,
                );
                useUba();
                useDwd();

                component.save();

                const info = component.widget.properties;
                for (const [provider, i] of [['uba', info.ubaInfo], ['dwd', info.dwdPollenInfo], ['yr', info.yrInfo]] as const) {
                    expect(i).toEqual(
                        jasmine.objectContaining({
                            importInstanceId: 'shared_' + provider,
                            importGenerated: false,
                            exportId: 'shared_' + provider + '_export',
                            exportGenerated: false,
                        }),
                    );
                }

                component.ubaStationSelected = { station_id: 6, station_longitude: 1, station_latitude: 1, station_name: 'other' };
                component.location = { latitude: 1, longitude: 1 };
                component.save();

                expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
                expect(pendingIds()).toEqual(['own_dwd', 'own_dwd_export', 'own_uba', 'own_uba_export', 'own_yr', 'own_yr_export']);
            });

            it('marks an adopted import instance and export pending clean-up as generated, so a later change releases them again', () => {
                const released = (id: string, kind: string) => ({
                    userId: 'user-1',
                    dashboardId: 'dashboard9',
                    widgetId: 'widget9',
                    resource: { kind, id, label: 'Yr' },
                    touched: Date.now(),
                });
                storage.data.set(
                    PENDING_GENERATED_RESOURCES_KEY,
                    JSON.stringify([released('shared_yr', 'import instance'), released('shared_yr_export', 'export')]),
                );
                component.importInstances = [
                    {
                        id: 'shared_yr',
                        import_type_id: environment.importTypeIdYrForecast,
                        configs: [
                            { name: 'lat', value: 0 },
                            { name: 'long', value: 0 },
                            { name: 'max_forecasts', value: 1 },
                        ],
                    },
                ] as ImportInstancesModel[];
                component.exports = [{ ID: 'shared_yr_export', FilterType: 'import_id', Filter: 'shared_yr', Values: [] } as unknown as ExportModel];

                component.save();
                expect(component.widget.properties.yrInfo).toEqual(
                    jasmine.objectContaining({ importInstanceId: 'shared_yr', importGenerated: true, exportId: 'shared_yr_export', exportGenerated: true }),
                );
                component.location = { latitude: 1, longitude: 1 };
                component.save();

                expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
                expect(pending().map((e) => [e.widgetId, e.resource.id, e.resource.exportIds])).toEqual([
                    ['widget9', 'shared_yr', undefined],
                    ['widget9', 'shared_yr_export', undefined],
                    ['widget1', 'old', undefined],
                    ['widget1', 'old_export', undefined],
                    ['widget1', 'shared_yr', ['shared_yr_export']],
                    ['widget1', 'shared_yr_export', undefined],
                ]);
            });

            for (const provider of ['UBA', 'DWD pollen'] as const) {
                it('marks an adopted ' + provider + ' import instance and export pending clean-up as generated, so a later change releases them again', () => {
                    const id = provider === 'UBA' ? 'shared_uba' : 'shared_dwd';
                    const released = (resourceId: string, kind: string) => ({
                        userId: 'user-1',
                        dashboardId: 'dashboard9',
                        widgetId: 'widget9',
                        resource: { kind, id: resourceId, label: provider },
                        touched: Date.now(),
                    });
                    storage.data.set(PENDING_GENERATED_RESOURCES_KEY, JSON.stringify([released(id, 'import instance'), released(id + '_export', 'export')]));
                    component.importInstances = [
                        provider === 'UBA'
                            ? { id, import_type_id: environment.importTypeIdUbaStation, configs: [{ name: 'FilterStationIds', value: ['5'] }] }
                            : {
                                  id,
                                  import_type_id: environment.importTypeIdDwdPollen,
                                  configs: [
                                      { name: 'lat', value: 0 },
                                      { name: 'long', value: 0 },
                                      { name: 'FilterPollen', value: [component.pollen[0].short_name] },
                                  ],
                              },
                    ] as ImportInstancesModel[];
                    component.exports = [{ ID: id + '_export', FilterType: 'import_id', Filter: id, Values: [] } as unknown as ExportModel];
                    const info = () => (provider === 'UBA' ? component.widget.properties.ubaInfo : component.widget.properties.dwdPollenInfo);
                    if (provider === 'UBA') {
                        useUba();
                    } else {
                        useDwd();
                    }

                    component.save();
                    expect(info()).toEqual(
                        jasmine.objectContaining({ importInstanceId: id, importGenerated: true, exportId: id + '_export', exportGenerated: true }),
                    );
                    if (provider === 'UBA') {
                        component.ubaStationSelected = { station_id: 6, station_longitude: 1, station_latitude: 1, station_name: 'other' };
                    } else {
                        component.location = { latitude: 1, longitude: 1 };
                    }
                    component.save();

                    expect(info()).toEqual(jasmine.objectContaining({ importInstanceId: provider === 'UBA' ? 'uba' : 'dwd' }));
                    expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(0);
                    expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
                    expect(pending().filter((e) => e.resource.id.startsWith(id)).map((e) => [e.widgetId, e.resource.id, e.resource.exportIds])).toEqual([
                        ['widget9', id, undefined],
                        ['widget9', id + '_export', undefined],
                        ['widget1', id, [id + '_export']],
                        ['widget1', id + '_export', undefined],
                    ]);
                });
            }

            it('does not match an import instance or export that an earlier save of the dialog released for clean-up', () => {
                component.importInstances = [
                    {
                        id: 'old',
                        import_type_id: environment.importTypeIdYrForecast,
                        configs: [
                            { name: 'lat', value: 0 },
                            { name: 'long', value: 0 },
                            { name: 'max_forecasts', value: 1 },
                        ],
                    },
                ] as ImportInstancesModel[];
                component.exports = [{ ID: 'old_export', FilterType: 'import_id', Filter: 'old', Values: [] } as unknown as ExportModel];
                let n = 0;
                importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) =>
                    of({ ...i, id: 'yr' + ++n, kafka_topic: 'topic' }),
                );

                component.location = { latitude: 1, longitude: 1 };
                component.save();
                expect(pendingIds()).toEqual(['old', 'old_export']);
                component.location = { latitude: 0, longitude: 0 };
                component.save();

                expect(importInstancesServiceSpy.saveImportInstance.calls.count()).toBe(2);
                expect(dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3].yrInfo).toEqual(
                    jasmine.objectContaining({ importInstanceId: 'yr2', exportId: 'export_yr2' }),
                );
            });

            it('deletes what the failed attempt created at once on close when nothing can be logged', () => {
                storage.failWrite = true;
                failAtYrExport();
                component.save();

                closeDialog();

                expect(importInstancesServiceSpy.deleteImportInstance.calls.allArgs()).toEqual([['uba'], ['yr']]);
                expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).toEqual([['export_uba']]);
            });

            it('reports a delete that failed after the dialog was closed when nothing can be logged', () => {
                storage.failWrite = true;
                failAtYrExport();
                importInstancesServiceSpy.deleteImportInstance.and.returnValue(throwError(() => ({ status: 500 })));
                component.save();

                closeDialog();

                expect(snackOpen.calls.mostRecent().args[0]).toBe(
                    'Could not delete the import instance for UBA, import instance for Yr generated for the unsaved changes',
                );
                expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
            });

            it('logs what a failed attempt created for this widget and keeps it logged after the close', () => {
                failAtYrExport();
                component.save();

                expect(pending().map((e) => [e.userId, e.dashboardId, e.widgetId, e.resource.kind, e.resource.id, e.resource.exportIds])).toEqual([
                    ['user-1', 'dashboard1', 'widget1', 'import instance', 'uba', ['export_uba']],
                    ['user-1', 'dashboard1', 'widget1', 'export', 'export_uba', undefined],
                    ['user-1', 'dashboard1', 'widget1', 'import instance', 'yr', undefined],
                ]);
                closeDialog();

                expect(pendingIds()).toEqual(['export_uba', 'uba', 'yr']);
            });

            it('keeps the old resources of a save that answered OK logged when the dialog closes', () => {
                useUba();

                component.save();
                closeDialog();

                expect(pendingIds()).toEqual(['old', 'old_export']);
            });

            it('deletes the old resources at once after a save when the log cannot be read', () => {
                storage.failRead = true;

                component.save();

                expect(order).toEqual(['save', 'delete import instance', 'delete export']);
            });

            it('logs the replaced resources of the stored state when a property update did not answer OK', () => {
                dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error update' }));

                component.save();

                expect(pendingIds()).toEqual(['export_yr', 'old', 'old_export', 'yr']);
            });
        });
    });
});
