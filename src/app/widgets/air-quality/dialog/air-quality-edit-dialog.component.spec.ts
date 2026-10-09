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
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of, throwError } from 'rxjs';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';
import { environment } from '../../../../environments/environment';

describe('AirQualityEditDialogComponent save', () => {
    let component: AirQualityEditDialogComponent;
    let snackOpen: jasmine.Spy;
    let dashboardServiceSpy: Spy<DashboardService>;
    let exportServiceSpy: Spy<ExportService>;
    let importInstancesServiceSpy: Spy<ImportInstancesService>;
    let importTypesServiceSpy: Spy<ImportTypesService>;
    let matDialogRefSpy: Spy<MatDialogRef<AirQualityEditDialogComponent>>;

    const instance = { id: 'instance1', name: 'instance', kafka_topic: 'topic' } as ImportInstancesModel;

    beforeEach(() => {
        dashboardServiceSpy = createSpyFromClass(DashboardService);
        exportServiceSpy = createSpyFromClass(ExportService);
        importInstancesServiceSpy = createSpyFromClass(ImportInstancesService);
        importTypesServiceSpy = createSpyFromClass(ImportTypesService);
        matDialogRefSpy = createSpyFromClass<MatDialogRef<AirQualityEditDialogComponent>>(MatDialogRef);

        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
        dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'OK' }));
        importInstancesServiceSpy.saveImportInstance.and.returnValue(of(instance));
        importInstancesServiceSpy.deleteImportInstance.and.returnValue(of(undefined));
        exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
        importTypesServiceSpy.getImportType.and.returnValue(of({ name: 'type' } as ImportTypeModel));
        importTypesServiceSpy.parseImportTypeExportValues.and.returnValue([]);
        exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export1', Values: [] } as unknown as ExportModel));

        TestBed.configureTestingModule({
            providers: [
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
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
        // ngOnInit is not run: the test sets the state a loaded dialog would have
        component = TestBed.createComponent(AirQualityEditDialogComponent).componentInstance;
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

    it('reports a failed cleanup of the old import instance and still stores the widget', () => {
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

        it('deletes the old import instance and export after the widget was saved', () => {
            component.save();

            expect(order).toEqual(['save', 'delete import instance', 'delete export']);
            expect(importInstancesServiceSpy.deleteImportInstance.calls.allArgs()).toEqual([['old']]);
            expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).toEqual([['old_export']]);
            expect(snackOpen).not.toHaveBeenCalled();
        });

        it('does not delete a resource the saved widget still uses', () => {
            importInstancesServiceSpy.saveImportInstance.and.returnValue(of({ ...instance, id: 'old' }));

            component.save();

            expect(order).toEqual(['save', 'delete export']);
        });

        it('stores the widget and names the old export that could not be deleted', () => {
            exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 500 }));

            component.save();

            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
            expect(matDialogRefSpy.close.calls.count()).toBe(1);
            expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not delete the old export for Yr');
            expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
        });

        it('deletes the old resources although the name update failed', () => {
            component.userHasUpdateNameAuthorization = true;
            dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));

            component.save();

            expect(order).toEqual(['save', 'delete import instance', 'delete export']);
            expect(matDialogRefSpy.close.calls.count()).toBe(0);
        });

        it('takes a 404 for a resource that is already gone', () => {
            exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 404 }));
            importInstancesServiceSpy.deleteImportInstance.and.returnValue(throwError(() => ({ status: 404 })));

            component.save();

            expect(importInstancesServiceSpy.deleteImportInstance.calls.count()).toBe(1);
            expect(matDialogRefSpy.close.calls.count()).toBe(1);
            expect(snackOpen).not.toHaveBeenCalled();
        });
    });
});
