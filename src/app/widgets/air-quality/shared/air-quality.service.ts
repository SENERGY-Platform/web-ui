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
import {AirQualityExternalProvider, AirQualityPropertiesModel, MeasurementModel} from './air-quality.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AirQualityEditDialogComponent} from '../dialog/air-quality-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {ImportInstancesService} from '../../../modules/imports/import-instances/shared/import-instances.service';
import {ExportDataService} from '../../shared/export-data.service';
import {QueriesRequestElementModel} from '../../shared/export-data.model';

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
                private exportDataService: ExportDataService,
                private importInstancesService: ImportInstancesService,
    ) {
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
                const requestPayload: QueriesRequestElementModel[] = [];

                const measurements = widget.properties.measurements;
                const insideMap = new Map<number, number>();
                const outsideMap = new Map<number, number>();
                const pollenMap = new Map<number, number>();
                measurements.forEach((measurement: MeasurementModel, index) => {
                    if (measurement.is_enabled) {
                        const id = (measurement.export ? measurement.export.ID : '');
                        const column = measurement.data.column ? measurement.data.column.Name : '';
                        insideMap.set(requestPayload.length, index);
                        requestPayload.push({
                            measurement: id || '',
                            columns: [{name: column, math: measurement.math || undefined}],
                            limit: 1,
                        });

                    }
                    if (measurement.has_outside || measurement.provider === AirQualityExternalProvider.UBA
                        || measurement.provider === AirQualityExternalProvider.Yr) {
                        const id = (measurement.outsideExport ? measurement.outsideExport.ID : '');
                        const column = measurement.outsideData.column ? measurement.outsideData.column.Name : '';
                        outsideMap.set(requestPayload.length, index);
                        if (measurement.provider === AirQualityExternalProvider.UBA) {
                            requestPayload.push({
                                measurement: id || '',
                                columns: [{name: column}],
                                filters: [
                                    {
                                        column: 'measurement',
                                        type: '=',
                                        value: measurement.short_name,
                                    },
                                    {
                                        column: 'station_id',
                                        type: '=',
                                        value: widget.properties.ubaInfo?.stationId || '',
                                    }
                                ],
                                limit: 1,
                            });
                        } else {
                            requestPayload.push({
                                measurement: id || '', columns:
                                    [{name: column, math: measurement.outsideMath || undefined}],
                                limit: 1,
                            });
                        }
                    }
                });
                if (widget.properties.dwdPollenInfo?.exportId !== undefined) {
                    widget.properties.pollen?.forEach((p, index) => {
                        if (!p.is_enabled || widget.properties.dwdPollenInfo?.exportId === undefined) {
                            return;
                        }
                        pollenMap.set(requestPayload.length, index);
                        requestPayload.push({
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
                    });
                }
                this.exportDataService.query(requestPayload)
                    .subscribe(values => {
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
        if (properties.yrInfo?.exportGenerated === true && properties.yrInfo?.exportId !== undefined) {
            this.exportService.stopPipelineById(properties.yrInfo?.exportId).subscribe();
        }
        if (properties.yrInfo?.importGenerated === true && properties.yrInfo?.importInstanceId !== undefined) {
            this.importInstancesService.deleteImportInstance(properties.yrInfo.importInstanceId).subscribe();
        }
    }

    private mapValuesIntoMeasurements(m: Map<number, number>, values: any[][][], widget: WidgetModel,
                                      property: string, inside: boolean) {
        m.forEach((measurementIndex, columnIndex) => {
            if (inside) {
                if (values[columnIndex][0] !== undefined) {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].data.value =
                        Math.round(Number(values[columnIndex][0][1]) * 100) / 100;
                } else {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].data.value = undefined;
                }
            } else {
                if (values[columnIndex][0] !== undefined) {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].outsideData.value =
                        Math.round(Number(values[columnIndex][0][1]) * 100) / 100;
                } else {
                    // @ts-ignore
                    widget.properties[property][measurementIndex].outsideData.value = undefined;
                }
            }
        });
    }
}

