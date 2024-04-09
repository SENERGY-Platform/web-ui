import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { concatMap, map, Observable, throwError, of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { LastValuesRequestElementInfluxModel, LastValuesRequestElementTimescaleModel, TimeValuePairModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { PVLoadRecommendationEditComponent } from '../dialog/edit/edit.component';
import { PVLoadRecommendationResult } from './recommendation.model';

@Injectable({
    providedIn: 'root'
})
export class PvLoadService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
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
        const editDialogRef = this.dialog.open(PVLoadRecommendationEditComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getPVLoadRecommendation(exportID: string): Observable<PVLoadRecommendationResult> {
        const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

        requestPayload.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'activate_device',
        });

        return this.exportDataService.getLastValuesTimescale(requestPayload).pipe(
            concatMap((pairs) => {
                if (pairs.length !== 1) {
                    return throwError(() => new Error('Data does not match expected schema'));
                }

                if(pairs[0].value == null) {
                    return throwError(() => new Error('Result is null'));
                }

                const model: PVLoadRecommendationResult = JSON.parse(pairs[0].value as string) as PVLoadRecommendationResult;
                return of(model);
            })
        );
    }
}
