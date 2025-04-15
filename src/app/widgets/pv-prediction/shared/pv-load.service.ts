import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { concatMap, Observable, throwError, of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../charts/export/shared/charts-export-range-time-type.enum';
import { ChartsExportService } from '../../charts/export/shared/charts-export.service';
import { PVPredictionEditComponent } from '../dialog/edit/edit.component';
import { PVPrediction, PVPredictionResult } from './prediction.model';

@Injectable({
    providedIn: 'root'
})
export class PvPredictionService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private chartsExportService: ChartsExportService
    ) {}

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
        const editDialogRef = this.dialog.open(PVPredictionEditComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getPVPrediction(exportID: string): Observable<PVPredictionResult> {
        const properties = {
            exports: [{
                id: exportID,
                name: 'output',
                values: [],
                exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb
            }],
            group: {
                time: '1h',
                type: 'last'
            },
            time: {
                last: '48h',
                ahead: undefined,
                start: undefined,
                end: undefined
            },
            timeRangeType: ChartsExportRangeTimeTypeEnum.Relative,
            vAxes: [{
                instanceId: exportID,
                exportName: '',
                color: '',
                math: '',
                valueName: 'output',
                valueType: '',
                conversions: [],
                valueAlias: 'Energy Output'
            }]
        };

        return this.chartsExportService.getData(properties, undefined, undefined, undefined, undefined).pipe(
            concatMap((r) => {
                const result = r.data;
                if (result != null && this.errorHandlerService.checkIfErrorExists(result)) {
                    return throwError(() => new Error(result.error));
                } else if (result != null) {
                    const predictions: PVPrediction[] = [];
                    const singleResult = result[0];
                    const outputResult = singleResult[0];
                    outputResult.forEach(row => {
                        predictions.push({
                            timestamp: row[0],
                            value: row[1]
                        });
                    });
                    const predictionResult: PVPredictionResult = {predictions};
                    return of(predictionResult);
                }
                return throwError(() => new Error('error'));
            })
        );
    }
}
