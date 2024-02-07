import {
    Injectable
} from '@angular/core';
import {
    MatDialog,
    MatDialogConfig
} from '@angular/material/dialog';
import {
    Observable, of, map
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

@Injectable({
    providedIn: 'root'
})
export class AnomalyService {

    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private exportDataService: ExportDataService,
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
        const m = widget.properties.measurement;
        if (m) {
            const requestPayload: (LastValuesRequestElementInfluxModel | LastValuesRequestElementTimescaleModel)[] = [];

            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'value',
            });
            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'type',
            });
            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'sub_type',
            });
            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'unit',
            });
            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'time'
            });
            requestPayload.push({
                exportId: m.id,
                measurement: m.id,
                columnName: 'initial_phase'
            });

            let o: Observable < TimeValuePairModel[] > | undefined;
            switch (m.exportDatabaseId) {
            case environment.exportDatabaseIdInternalTimescaleDb:
                o = this.exportDataService.getLastValuesTimescale(requestPayload);
                break;
            case undefined:
            case environment.exportDatabaseIdInternalInfluxDb:
                o = this.exportDataService.getLastValuesInflux(requestPayload as LastValuesRequestElementInfluxModel[]);
                break;
            default:
                console.error('cant load data of this export: not internal');
                return of();
            }
            return o.pipe(
                map((pairs) => {
                    if (pairs.length !== 6) {
                        return null;
                    }

                    if(pairs[0].value == null) {
                        return null;
                    }
                    const model: AnomalyResultModel = {
                        value: pairs[0].value as string,
                        type: pairs[1].value as string,
                        subType: pairs[2].value as string,
                        unit: pairs[3].value as string,
                        timestamp: pairs[4].value as string,
                        initial_phase: pairs[5].value as string,
                    };
                    return model;
                })
            );
        }
        return of();
    }
}
