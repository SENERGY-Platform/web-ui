import {
    Injectable
} from '@angular/core';
import {
    MatDialog,
    MatDialogConfig
} from '@angular/material/dialog';
import {
    Observable, of, map, throwError, concatMap, EMPTY, catchError
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
    TimeValuePairModel
} from '../../shared/export-data.model';
import {
    ExportDataService
} from '../../shared/export-data.service';
import {
    EditComponent
} from '../dialog/edit/edit.component';
import {
    AnomalyResultModel
} from './anomaly.model';
import {environment} from '../../../../environments/environment';
import { ChartsExportService } from '../../charts/export/shared/charts-export.service';

@Injectable({
    providedIn: 'root'
})
export class AnomalyService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
        private chartsExportService: ChartsExportService
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

    getAnomaly(widget: WidgetModel): Observable<AnomalyResultModel | null> {
        const m = widget.properties.anomalyDetection;
        if (m) {
            const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'value',
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'type',
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'sub_type',
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'threshold',
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'mean',
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'time'
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'initial_phase'
            });
            requestPayload.push({
                exportId: m.export,
                measurement: m.export,
                columnName: 'device_id'
            });

            return this.exportDataService.getLastValuesTimescale(requestPayload).pipe(
                map((pairs) => {
                    if (pairs.length !== 8) {
                        return null;
                    }

                    if(pairs[0].value == null) {
                        return null;
                    }
                    const model: AnomalyResultModel = {
                        value: pairs[0].value as string,
                        type: pairs[1].value as string,
                        subType: pairs[2].value as string,
                        threshold: pairs[3].value as number,
                        mean: pairs[4].value as number,
                        timestamp: pairs[5].value as string,
                        initial_phase: pairs[6].value as string,
                        device_id: pairs[7].value as string
                    };
                    return model;
                }),
                catchError((_) => of(null))
            );
        }
        return of(null);
    }

    getAnomalyHistory(exportID: string) {
        const properties = {
            exports: [{
                    id: exportID,
                    name: 'value',
                    values: [],
                    exportDatabaseId: 'urn:infai:ses:export-db:ac535dbb-4600-4b84-8660-2f40de034644'
            }],
            group: {
                    time: '5m',
                    type: 'mean'
            },
            time: {
                    last: '1d',
                    ahead: undefined,
                    start: undefined,
                    end: undefined
            },
            timeRangeType: 'relative',
            vAxes: [{
                    instanceId: exportID,
                    exportName: '',
                    color: '',
                    math: '',
                    valueName: 'value',
                    valueType: '',
                    conversions: [{
                        from: '1',
                        to: '1',
                        color: '#AA4A44',
                        alias: 'auffällig'
                    }, {
                        from: '0',
                        to: '0',
                        color: '#50C878',
                        alias: 'normal'
                    }],
                    valueAlias: 'Temperatur'
            }]
        };
    }
}
