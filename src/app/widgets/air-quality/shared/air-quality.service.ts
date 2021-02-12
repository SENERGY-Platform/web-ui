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

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AirQualityPropertiesModel, AirQualityExternalProvider, MeasurementModel} from './air-quality.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AirQualityEditDialogComponent} from '../dialog/air-quality-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {environment} from '../../../../environments/environment';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {ChartsExportModel} from '../../charts/export/shared/charts-export.model';
import {
    ChartsExportRequestPayloadModel,
    ChartsExportRequestPayloadQueriesFieldsModel,
    ChartsExportRequestPayloadQueriesModel
} from '../../charts/export/shared/charts-export-request-payload.model';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {ImportInstancesService} from '../../../modules/imports/import-instances/shared/import-instances.service';

@Injectable({
    providedIn: 'root'
})
export class AirQualityService {

    public static getAbsoluteHumidity(temp: number, rel: number): number {
        return 13.2471 * Math.pow(Math.E, 17.67 * temp / (temp + 243.5)) * rel / (273.15 + temp);
    }

    public static getRelativeHumidity(temp: number, abs: number): number {
        return abs * (273.15 + temp) / (13.2471 * Math.pow(Math.E, 17.67 * temp / (temp + 243.5)));
    }

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService,
                private exportService: ExportService,
                private importInstancesService: ImportInstancesService,
                private http: HttpClient) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId
        };
        dialogConfig.minWidth = '750px';
        const editDialogRef = this.dialog.open(AirQualityEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    readAllData(widget: WidgetModel): Observable<WidgetModel> {
        return new Observable<WidgetModel>((observer) => {
            if (widget.properties.measurements) {
                const requestPayload: ChartsExportRequestPayloadModel = {
                    time: {
                        last: '500000w', // arbitrary high number
                        end: undefined,
                        start: undefined
                    },
                    group: {
                        type: undefined,
                        time: ''
                    },
                    queries: [],
                    limit: 1
                };

                const measurements = widget.properties.measurements;
                const array: ChartsExportRequestPayloadQueriesModel[] = [];
                let fieldCounter = 0;
                const insideMap = new Map<number, number>();
                const outsideMap = new Map<number, number>();
                const pollenMap = new Map<number, number>();
                measurements.forEach((measurement: MeasurementModel, index) => {
                    if (measurement.is_enabled) {
                        const id = (measurement.export ? measurement.export.ID : '');
                        const column = measurement.data.column ? measurement.data.column.Name : '';
                        insideMap.set(++fieldCounter, index);
                        array.push({id: id || '', fields: [{name: column, math: measurement.math || ''}]});

                    }
                    if (measurement.has_outside || measurement.provider === AirQualityExternalProvider.UBA) {
                        const id = (measurement.outsideExport ? measurement.outsideExport.ID : '');
                        const column = measurement.outsideData.column ? measurement.outsideData.column.Name : '';
                        const fields: ChartsExportRequestPayloadQueriesFieldsModel[] = [];
                        fields.push({name: column, math: measurement.outsideMath || ''});
                        outsideMap.set(++fieldCounter, index);
                        if (measurement.provider === AirQualityExternalProvider.UBA) {
                            fields.push({
                                name: 'measurement',
                                filterType: '=',
                                filterValue: measurement.short_name,
                                math: ''
                            });
                            fieldCounter++;
                            fields.push({
                                name: 'station_id',
                                filterType: '=',
                                filterValue: widget.properties.ubaInfo?.stationId || '',
                                math: ''
                            });
                            fieldCounter++;
                        }
                        array.push({id: id || '', fields: fields});
                    }
                });
                if (widget.properties.dwdPollenInfo?.exportId !== undefined) {
                    widget.properties.pollen?.forEach((p, index) => {
                        if (!p.is_enabled || widget.properties.dwdPollenInfo?.exportId === undefined) {
                            return;
                        }
                        const fields: ChartsExportRequestPayloadQueriesFieldsModel[] = [];
                        fields.push({
                            name: 'today',
                            math: '',
                        });
                        pollenMap.set(++fieldCounter, index);
                        fields.push({
                            name: 'pollen',
                            math: '',
                            filterType: '=',
                            filterValue: p.short_name,
                        });
                        fieldCounter++;
                        array.push({id: widget.properties.dwdPollenInfo.exportId, fields: fields});
                    });
                }
                requestPayload.queries = array;


                this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries?include_empty_columns=true'), requestPayload)
                    .subscribe(model => {
                        const values = model.results[0].series[0].values;
                        if (values.length === 0) {
                            observer.next(widget);
                            observer.complete();
                            return;
                        }
                        this.mapValuesIntoMeasurements(insideMap, values, widget, 'measurements', true);
                        this.mapValuesIntoMeasurements(outsideMap, values, widget, 'measurements', false);
                        this.mapValuesIntoMeasurements(pollenMap, values, widget, 'pollen', false);

                        observer.next(widget);
                        observer.complete();
                    });
            }
        });
    }

    cleanGeneratedContent(properties: AirQualityPropertiesModel) {
        if (properties.ubaInfo?.exportGenerated === true && properties.ubaInfo?.exportId !== undefined) {
            this.exportService.stopPipelineById(properties.ubaInfo.exportId).subscribe();
        }
        if (properties.ubaInfo?.importGenerated === true && properties.ubaInfo?.importInstanceId !== undefined) {
            this.importInstancesService.deleteImportInstance(properties.ubaInfo.importInstanceId).subscribe();
        }
        if (properties.dwdPollenInfo?.exportGenerated === true && properties.dwdPollenInfo?.exportId !== undefined) {
            this.exportService.stopPipelineById(properties.dwdPollenInfo?.exportId).subscribe();
        }
        if (properties.dwdPollenInfo?.importGenerated === true && properties.dwdPollenInfo?.importInstanceId !== undefined) {
            this.importInstancesService.deleteImportInstance(properties.dwdPollenInfo.importInstanceId).subscribe();
        }
    }

    private mapValuesIntoMeasurements(m: Map<number, number>, values: (string | number)[][], widget: WidgetModel,
                                      property: string, inside: boolean) {

        m.forEach((measurementIndex, columnIndex) => {
            values.forEach(val => {
                // @ts-ignore
                if (val[columnIndex] !== null && widget.properties[property] !== undefined) {
                    if (inside) {
                        // @ts-ignore
                        widget.properties[property][measurementIndex].data.value =
                            Math.round(Number(val[columnIndex]) * 100) / 100;
                    } else {
                        // @ts-ignore
                        widget.properties[property][measurementIndex].outsideData.value =
                            Math.round(Number(val[columnIndex]) * 100) / 100;
                    }
                }
            });
        });
    }
}

