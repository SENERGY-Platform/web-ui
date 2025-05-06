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

import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { concatMap, of, throwError } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../charts/export/shared/charts-export-range-time-type.enum';
import { ChartsExportService } from '../../charts/export/shared/charts-export.service';
import { QueriesRequestV2ElementTimescaleModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { EditVentilationWidgetComponent } from '../dialog/edit/edit.component';
import { DeviceValue, VentilationResult } from './model';

@Injectable({
    providedIn: 'root'
})
export class BadVentilationService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private exportDataService: ExportDataService,
        private chartsExportService: ChartsExportService,
        private errorService: ErrorHandlerService
    ) { }

    getDeviceCurve(deviceID: string, serviceID: string, pathToColumn: string, lastTimeRange: string, groupTime?: string) {
        const properties: any = {
            exports: [{
                id: deviceID,
                name: pathToColumn,
                values: [],
                exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb
            }],
            time: {
                last: lastTimeRange,
                ahead: undefined,
                start: undefined,
                end: undefined
            },
            timeRangeType: ChartsExportRangeTimeTypeEnum.Relative,
            vAxes: [{
                deviceId: deviceID,
                serviceId: serviceID,
                exportName: '',
                color: '',
                math: '',
                valueName: pathToColumn,
                valueType: '',
                conversions: [],
            }]
        };

        if(groupTime != null) {
            properties['group'] = {
                time: groupTime,
                type: 'mean'
            };
        }
        return this.chartsExportService.getData(properties, undefined, undefined, undefined, undefined).pipe(
            concatMap((r) => {
                const result = r.data;
                if (result != null && this.errorService.checkIfErrorExists(result)) {
                    return throwError(() => new Error(result.error));
                } else if (result != null) {
                    const deviceValues: DeviceValue[] = [];
                    const singleResult = result[0];
                    const outputResult = singleResult[0];
                    outputResult.forEach(row => {
                        deviceValues.push({
                            timestamp: row[0],
                            value: row[1]
                        });
                    });
                    return of(deviceValues);
                }
                return throwError(() => new Error('error'));
            })
        );
    }

    private getColumnRowValue(data: any, columnIndex: number, rowIndex: number, resultIndex: number) {
        // the rows values dont have to be the same length, trailing nulls get cut of in the response
        const rows: any[] = data[columnIndex][rowIndex];
        if (rows == null) {
            return null;
        }
        if (rows.length === 2) {
            return rows[resultIndex];
        }
        return null;
    }

    getVentilationOutput(exportID: string, lastTimeRange: string) {
        const request: QueriesRequestV2ElementTimescaleModel = {
            exportId: exportID,
            columns: [{
                name: 'humidity_too_fast_too_high'
            }, {
                name: 'window_open'
            }],
            time: {
                last: lastTimeRange,
                ahead: undefined,
                start: undefined,
                end: undefined
            },
            orderDirection: 'desc'
        };


        return this.exportDataService.queryTimescaleV2([request]).pipe(
            concatMap((result) => {
                const ventilationResults: VentilationResult[] = [];
                const data: any[] = result[0].data;
                const numberRows = data[0].length;
                for (let index = 0; index < numberRows; index++) {
                    const ventilationResult: VentilationResult = {
                        timestamp: this.getColumnRowValue(data, 0, index, 0) as string,
                        humidity_too_fast_too_high: this.getColumnRowValue(data, 0, index, 1) as string,
                        window_open: this.getColumnRowValue(data, 1, index, 1) as boolean,
                    };
                    ventilationResults.push(ventilationResult);
                }

                return of(ventilationResults);
            })
        );
    }


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '450px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(EditVentilationWidgetComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }
}
