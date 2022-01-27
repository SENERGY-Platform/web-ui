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
import {forkJoin, Observable} from 'rxjs';
import {AirQualityExternalProvider, AirQualityPropertiesModel, MeasurementModel} from './air-quality.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AirQualityEditDialogComponent} from '../dialog/air-quality-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {ImportInstancesService} from '../../../modules/imports/import-instances/shared/import-instances.service';
import {DBTypeEnum, ExportDataService} from '../../shared/export-data.service';
import {QueriesRequestElementInfluxModel, QueriesRequestElementTimescaleModel} from '../../shared/export-data.model';
import {map} from 'rxjs/internal/operators';


interface RequestElementModel extends QueriesRequestElementInfluxModel {
    dbId?: string;
}

@Injectable({
    providedIn: 'root',
})
export class AirQualityService {
    public static getAbsoluteHumidity(temp: number, rel: number): number {
        return (13.2471 * Math.pow(Math.E, (17.67 * temp) / (temp + 243.5)) * rel) / (273.15 + temp);
    }

    public static getRelativeHumidity(temp: number, abs: number): number {
        return (abs * (273.15 + temp)) / (13.2471 * Math.pow(Math.E, (17.67 * temp) / (temp + 243.5)));
    }

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportService: ExportService,
        private exportDataService: ExportDataService,
        private importInstancesService: ImportInstancesService,
    ) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
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
                const requestPayloadInflux: QueriesRequestElementInfluxModel[] = [];
                const requestPayloadTimescale: QueriesRequestElementTimescaleModel[] = [];

                const measurements = widget.properties.measurements;
                const insideMapInflux: Map<number, number> = new Map();
                const outsideMapInflux: Map<number, number> = new Map();
                const pollenMapInflux: Map<number, number> = new Map();
                const insideMapTimescale: Map<number, number> = new Map();
                const outsideMapTimescale: Map<number, number> = new Map();
                const pollenMapTimescale: Map<number, number> = new Map();
                measurements.forEach((measurement: MeasurementModel, index) => {
                    if (measurement.is_enabled) {
                        const exportId = measurement.export ? measurement.export.ID : '';
                        const column = measurement.data.column ? measurement.data.column.Name : '';
                        if (measurement.insideDeviceId !== undefined || measurement.export?.DbId === DBTypeEnum.snrgyTimescale) {
                            insideMapTimescale.set(requestPayloadTimescale.length, index);
                            const element: QueriesRequestElementTimescaleModel = {
                                limit: 1,
                            } as QueriesRequestElementTimescaleModel;
                            if (measurement.insideDeviceId !== undefined && measurement.insideDeviceId !== null) {
                                element.deviceId = measurement.insideDeviceId;
                                element.serviceId = measurement.insideServiceId;
                                element.columns =  [{name: measurement.insideDeviceValuePath || '', math: measurement.math || undefined}];
                            } else {
                                element.exportId = exportId;
                                element.columns = [{name: column, math: measurement.math || undefined}];
                            }
                            requestPayloadTimescale.push(element);
                        } else {
                            insideMapInflux.set(requestPayloadInflux.length, index);
                            requestPayloadInflux.push({
                                measurement: exportId || '',
                                columns: [{name: column, math: measurement.math || undefined}],
                                limit: 1,
                            });
                        }
                    }
                    if (
                        measurement.has_outside ||
                        measurement.provider === AirQualityExternalProvider.UBA ||
                        measurement.provider === AirQualityExternalProvider.Yr
                    ) {
                        const exportId = measurement.outsideExport ? measurement.outsideExport.ID : '';
                        const column = measurement.outsideData.column ? measurement.outsideData.column.Name : '';
                        let element = {} as QueriesRequestElementInfluxModel;
                        if (measurement.provider === AirQualityExternalProvider.UBA) {
                            element = {
                                measurement: exportId || '',
                                columns: [{name: column}],
                                filters: [
                                    {
                                        column: 'station_id',
                                        type: '=',
                                        value: widget.properties.ubaInfo?.stationId || '',
                                    },
                                ],
                                limit: 1,
                            };
                            if (widget.properties.version === undefined || widget.properties.version < 3) {
                                element?.filters?.push({
                                    column: 'measurement',
                                    type: '=',
                                    value: measurement.short_name,
                                });
                            }

                        } else {
                            element = {
                                measurement: exportId || '',
                                columns: [{name: column, math: measurement.outsideMath || undefined}],
                                limit: 1,
                            };
                        }


                        if (measurement.outsideDeviceId !== undefined || measurement.outsideExport?.DbId === DBTypeEnum.snrgyTimescale) {
                            const timescaleElement = element as QueriesRequestElementTimescaleModel;
                            if (element.measurement !== '') {
                                timescaleElement.exportId = element.measurement;
                            } else {
                                timescaleElement.exportId = undefined;
                                timescaleElement.deviceId = measurement.outsideDeviceId;
                                timescaleElement.serviceId = measurement.outsideServiceId;
                                timescaleElement.columns = [{name: measurement.outsideDeviceValuePath || '', math: measurement.outsideMath || undefined}];
                            }
                            outsideMapTimescale.set(requestPayloadTimescale.length, index);
                            requestPayloadTimescale.push(element);
                        } else {
                            outsideMapInflux.set(requestPayloadInflux.length, index);
                            requestPayloadInflux.push(element);
                        }
                    }
                });
                if (widget.properties.dwdPollenInfo?.exportId !== undefined) {
                    widget.properties.pollen?.forEach((p, index) => {
                        if (!p.is_enabled || widget.properties.dwdPollenInfo?.exportId === undefined) {
                            return;
                        }
                        if (widget.properties.dwdPollenInfo?.exportId === DBTypeEnum.snrgyTimescale) {
                            pollenMapTimescale.set(requestPayloadTimescale.length, index);
                            requestPayloadTimescale.push({
                                exportId: widget.properties.dwdPollenInfo.exportId,
                                columns: [{name: 'today'}],
                                filters: [
                                    {
                                        column: 'pollen',
                                        type: '=',
                                        value: p.short_name,
                                    },
                                ],
                                limit: 1,
                            });
                        } else {
                            pollenMapInflux.set(requestPayloadInflux.length, index);
                            requestPayloadInflux.push({
                                measurement: widget.properties.dwdPollenInfo.exportId,
                                columns: [{name: 'today'}],
                                filters: [
                                    {
                                        column: 'pollen',
                                        type: '=',
                                        value: p.short_name,
                                    },
                                ],
                                limit: 1,
                            });
                        }
                    });
                }
                const obs: Observable<{ source: string; values: any[][][] }>[] = [];
                if (requestPayloadInflux.length > 0) {
                    obs.push(this.exportDataService.queryInflux(requestPayloadInflux).pipe(map(values => ({
                        source: 'influx',
                        values
                    }))));
                }
                if (requestPayloadTimescale.length > 0) {
                    obs.push(this.exportDataService.queryTimescale(requestPayloadTimescale).pipe(map(values => ({
                        source: 'timescale',
                        values
                    }))));
                }
                forkJoin(obs).subscribe((resps) => {
                    resps.forEach(resp => {
                        const values = resp.values;
                        if (resp.source === 'influx') {
                            this.mapValuesIntoMeasurements(insideMapInflux, values, widget, 'measurements', true);
                            this.mapValuesIntoMeasurements(outsideMapInflux, values, widget, 'measurements', false);
                            this.mapValuesIntoMeasurements(pollenMapInflux, values, widget, 'pollen', false);
                        } else {
                            this.mapValuesIntoMeasurements(insideMapTimescale, values, widget, 'measurements', true);
                            this.mapValuesIntoMeasurements(outsideMapTimescale, values, widget, 'measurements', false);
                            this.mapValuesIntoMeasurements(pollenMapTimescale, values, widget, 'pollen', false);
                        }
                    });
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
        if (properties.yrInfo?.exportGenerated === true && properties.yrInfo?.exportId !== undefined) {
            this.exportService.stopPipelineById(properties.yrInfo?.exportId).subscribe();
        }
        if (properties.yrInfo?.importGenerated === true && properties.yrInfo?.importInstanceId !== undefined) {
            this.importInstancesService.deleteImportInstance(properties.yrInfo.importInstanceId).subscribe();
        }
    }

    private mapValuesIntoMeasurements(m: Map<number, number>, values: any[][][], widget: WidgetModel, property: string, inside: boolean) {
        m.forEach((measurementIndex, valueIndex) => {
            const valid = values.length >= (valueIndex - 1) && values[valueIndex].length > 0 && values[valueIndex][0].length > 0 && values[valueIndex][0][0] !== undefined && values[valueIndex][0][0] !== null;
            if (inside) {
                if (valid) {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].data.value = Math.round(Number(values[valueIndex][0][1]) * 100) / 100;
                } else {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].data.value = undefined;
                }
            } else {
                if (valid) {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].outsideData.value =
                        Math.round(Number(values[valueIndex][0][1]) * 100) / 100;
                } else {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].outsideData.value = undefined;
                }
            }
        });
    }
}
