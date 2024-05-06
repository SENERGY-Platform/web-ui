import {
    Injectable
} from '@angular/core';
import {
    MatDialog,
    MatDialogConfig
} from '@angular/material/dialog';
import {
    Observable,
    of ,
    map,
    throwError,
    concatMap,
    EMPTY,
    catchError
} from 'rxjs';
import {
    ErrorHandlerService
} from 'src/app/core/services/error-handler.service';
import {
    DashboardManipulationEnum
} from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import {
    WidgetModel
} from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import {
    DashboardService
} from 'src/app/modules/dashboard/shared/dashboard.service';
import {
    LastValuesRequestElementInfluxModel,
    LastValuesRequestElementTimescaleModel,
    QueriesRequestV2ElementTimescaleModel
} from '../../shared/export-data.model';
import {
    ExportDataService
} from '../../shared/export-data.service';
import {
    EditComponent
} from '../dialog/edit/edit.component';
import {
    AnomaliesPerDevice,
    AnomalyResultModel,
    DeviceValue
} from './anomaly.model';
import {
    ChartsExportService
} from '../../charts/export/shared/charts-export.service';
import { ChartsExportRangeTimeTypeEnum } from '../../charts/export/shared/charts-export-range-time-type.enum';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AnomalyService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private exportDataService: ExportDataService,
        private chartsExportService: ChartsExportService,
        private errorService: ErrorHandlerService
    ) {

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
        const editDialogRef = this.dialog.open(EditComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getAnomaly(exportID: string, deviceIDs?: string[]): Observable < AnomalyResultModel | null > {
        const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'value',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'type',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'sub_type',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'threshold',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'mean',
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'time'
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'initial_phase'
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'device_id'
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'start_time'
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'end_time'
        });
        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'original_reconstructed_curves'
        });

        return this.exportDataService.getLastValuesTimescale(requestPayload).pipe(
            map((pairs) => {
                if (pairs.length !== 8) {
                    return null;
                }

                const anomaly: AnomalyResultModel = {
                    value: pairs[0].value as string,
                    type: pairs[1].value as string,
                    subType: pairs[2].value as string,
                    threshold: pairs[3].value as number,
                    mean: pairs[4].value as number,
                    timestamp: pairs[5].value as string,
                    initial_phase: pairs[6].value as string,
                    device_id: pairs[7].value as string,
                    start_time: pairs[8].value as string,
                    end_time: pairs[9].value as string,
                    original_reconstructed_curves: JSON.parse(pairs[10].value as string) as [number, number, number][]
                };
                if(deviceIDs && !deviceIDs.includes(anomaly.device_id)) {
                    return null;
                }

                return anomaly;
            }),
            catchError((_) => of (null))
        );
    }

    private getColumnRowValue(data: any, columnIndex: number, index: number) {
        // the rows values dont have to be the same length, trailing nulls get cut of in the response
        const rows: any[] = data[columnIndex][index];
        if (rows == null) {
            return null;
        }
        if (rows.length === 2) {
            return rows[1];
        }
        return null;
    }

    getAnomalyHistory(exportID: string, lastTimeRange: string) {
        /* Load the anomaly history for given exports.
           Returns: Anomalies per device id. If parameter deviceIDs is set, devices without any anomaly will get a default empty list
        */
        const request: QueriesRequestV2ElementTimescaleModel = {
            exportId: exportID,
            columns: [{
                name: 'value'
            }, {
                name: 'type'
            }, {
                name: 'sub_type'
            }, {
                name: 'threshold'
            }, {
                name: 'mean'
            }, {
                name: 'time'
            }, {
                name: 'device_id'
            }, {
                name: 'initial_phase'
            }, {
                name: 'start_time'
            }, {
                name: 'end_time'
            }, {
                name: 'original_reconstructed_curves'
            }],
            time: {
                last: lastTimeRange,
                ahead: undefined,
                start: undefined,
                end: undefined
            },
            orderDirection: 'asc'
        };

        return this.exportDataService.queryTimescaleV2([request]).pipe(
            map(result => {
                const anomaliesPerDevices: AnomaliesPerDevice = {};
                const data: any[] = result[0].data;
                const numberRows = data[0].length;
                for (let index = 0; index < numberRows; index++) {
                    const anomaly: AnomalyResultModel = {
                        value: this.getColumnRowValue(data, 0, index) as string,
                        type: this.getColumnRowValue(data, 1, index) as string,
                        subType: this.getColumnRowValue(data, 2, index) as string,
                        threshold: this.getColumnRowValue(data, 3, index) as number,
                        mean: this.getColumnRowValue(data, 4, index) as number,
                        timestamp: this.getColumnRowValue(data, 5, index) as string,
                        device_id: this.getColumnRowValue(data, 6, index) as string,
                        initial_phase: this.getColumnRowValue(data, 7, index) as string,
                        start_time: this.getColumnRowValue(data, 8, index) as string,
                        end_time: this.getColumnRowValue(data, 9, index) as string,
                        original_reconstructed_curves: JSON.parse(this.getColumnRowValue(data, 10, index)) as [number, number, number][]
                    };

                    if(anomaly.device_id == null || anomaly.device_id === '') {
                        continue;
                    }

                    if(anomaliesPerDevices[anomaly.device_id] === undefined) {
                        anomaliesPerDevices[anomaly.device_id] = [];
                    }

                    anomaliesPerDevices[anomaly.device_id].push(anomaly);
                }

                return anomaliesPerDevices;
            })
        );
    }

    private fillMissingDevices(anomaliesPerDevices: AnomaliesPerDevice, deviceIDs: string[]) {
        const deviceIDsWithAnomalies = Object.keys(anomaliesPerDevices);
        deviceIDs.forEach(deviceID => {
            if(!deviceIDsWithAnomalies.includes(deviceID)) {
                anomaliesPerDevices[deviceID] = [];
            }
        });
        return anomaliesPerDevices;
    }

    private createIntervalsPerAnomaly(anomalies: AnomalyResultModel[]) {
        const anomalyPhases: any[][] = [];
        for (let index = 0; index < anomalies.length; index++) {
            const anomaly = anomalies[index];
            const anomalyStartTime = anomaly.start_time;
            const anomalyEndTime = anomaly.end_time;
            anomalyPhases.push([anomalyStartTime, 1]);
            anomalyPhases.push([anomalyEndTime, 1]);

            if(index === anomalies.length-1) {
                break;
            }
            const nextAnomaly = anomalies[index + 1];
            const nextAnomalyStartTime = nextAnomaly.start_time;
            // only add normal phase when start time of next anomaly is after end time of current anomaly
            if(new Date(nextAnomalyStartTime).getTime() <= new Date(anomalyEndTime).getTime()) {
                continue;
            }
            anomalyPhases.push([anomalyEndTime, 0]);
            anomalyPhases.push([nextAnomalyStartTime, 0]);
        }
        return anomalyPhases;
    }

    private createIntervalsPerDevice(anomalies: AnomalyResultModel[], earliestStartTime: Date) {
        /* Create time windows based on the found anomalies of one device.
           For each anomaly, a window from start to end will be created.
           For time between anomalies a normal window will be created.
           Edge Cases:
           - No anomalies
           - First anomaly started after the time window history (e.g. the last 2 days, anomaly started yesterday)
           - Last anomaly ended 1 day before. Everything normal until now()
        */
        let anomalyPhases: any[][] = [];
        const now = new Date();
        const nowStr = now.toISOString();

        if(anomalies.length === 0) {
            anomalyPhases.push([earliestStartTime, 0]);
            anomalyPhases.push([nowStr, 0]);
            return anomalyPhases;
        }

        const firstAnomaly = anomalies[0];
        if (new Date(firstAnomaly.start_time) > new Date(earliestStartTime)) {
            anomalyPhases.push([earliestStartTime, 0]);
            anomalyPhases.push([firstAnomaly.start_time, 0]);
        }

        anomalyPhases = anomalyPhases.concat(this.createIntervalsPerAnomaly(anomalies));

        const lastAnomaly = anomalies[0];
        if (new Date(lastAnomaly.end_time) < now) {
            anomalyPhases.push([lastAnomaly.end_time, 0]);
            anomalyPhases.push([nowStr, 0]);
        }

        return anomalyPhases;
    }

    createPhaseWindows(anomalies: AnomaliesPerDevice, earliestStartTime: Date) {
        /* Based on anomalies per device, the corresponding time windows are built
           Returns: Time windows per device ID
        */
        const anomalyPhases: any[][][] = [];
        let deviceIndex = 0;
        for (const [deviceID, anomaliesPerDevice] of Object.entries(anomalies)) {
            const intervals = this.createIntervalsPerDevice(anomaliesPerDevice, earliestStartTime);
            anomalyPhases[deviceIndex] = intervals;
            deviceIndex += 1;
        }
        return anomalyPhases;
    }

    getDeviceCurve(deviceID: string, serviceID: string, pathToColumn: string, lastTimeRange: string, groupTime?: string) {
        // Load the last values of the export. Mostly the device output where anomaly detection is running on
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
                valueAlias: 'Energy Output'
            }]
        };

        if(groupTime != null) {
            properties['group'] = {
                time: groupTime,
                type: 'mean'
            };
        }
        return this.chartsExportService.getData(properties, undefined, undefined, undefined, undefined).pipe(
            concatMap((result) => {
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
}