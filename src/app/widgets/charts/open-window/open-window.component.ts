import {Component, HostListener, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import moment from 'moment';
import { DurationInputArg1, unitOfTime } from 'moment';
import { Subscription, map, Observable, catchError, concatMap, of, forkJoin, throwError } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { QueriesRequestTimeModel, QueriesRequestV2ElementTimescaleModel, TimeValuePairModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { ChartsExportRangeTimeTypeEnum } from '../export/shared/charts-export-range-time-type.enum';
import { OpenWindowEditComponent } from './dialog/edit/edit.component';

interface InitCheck {
  message: string;
  anyExportInInitPhase: boolean;
}

@Component({
  selector: 'senergy-open-window',
  templateUrl: './open-window.component.html',
  styleUrls: ['./open-window.component.css']
})
export class OpenWindowComponent implements OnInit, OnChanges {
    ready = false;
    init = false;
    refreshing = false;
    destroy = new Subscription();
    error?: string;
    timelineChartData: any;
    notConfigured = false;
    chartDataReady = false;
    message = '';
    timelineWidth = 0;
    timelineHeight = 0;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    constructor(
      private dashboardService: DashboardService,
      private elementSizeService: ElementSizeService,
      private exportDataService: ExportDataService,
      private errorHandlerService: ErrorHandlerService,
      private dialog: MatDialog
    ) {}


    resizeTimeout = 0;
    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resize();
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    ngOnInit(): void {
        this.widgetIsConfigured();
        if(!this.notConfigured) {
            this.update();
        }
    }

    ngOnChanges() {
        this.resize();
    }

    widgetIsConfigured() {
        this.notConfigured = this.widget.properties.windowExports === undefined;
        if(this.notConfigured) {
            return;
        }
    }

    private update() {
        this.operatorInInitPhase().pipe(
            concatMap((initPhase: InitCheck) => {
                if(initPhase.anyExportInInitPhase) {
                    this.message = initPhase.message;
                    return of(true);
                }

                return this.getTimelineData();
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                this.errorHandlerService.logError('OpenWindow', 'getTimelineData', err);
                this.message = 'Widget could not be loaded';
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    operatorInInitPhase(): Observable<InitCheck> {
        const requestPayloads: any[] = [];
        const exports = this.widget.properties?.windowExports || [];

        exports.forEach(exportConfig => {
            if(exportConfig.id != null) {
                requestPayloads.push({
                    exportId: exportConfig.id,
                    measurement: exportConfig.id,
                    columnName: 'initial_phase'
                });
            }
        });

        return this.exportDataService.getLastValuesTimescale(requestPayloads).pipe(
            map((lastValuePerExport: TimeValuePairModel[]) => {
                if(lastValuePerExport.length === 0) {
                    throw(new Error('No last value for init check'));
                }

                let initCheck = {message: '', anyExportInInitPhase: false};
                lastValuePerExport.forEach(lastValue => {
                    const initPhase = lastValue.value as string;
                    const exportIsInInitPhase = initPhase !== '' && initPhase != null;
                    if(exportIsInInitPhase) {
                        initCheck = {message: initPhase, anyExportInInitPhase: true};
                    }
                });

                return initCheck;
            })
        );
    }

    edit() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '600px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widget: this.widget,
            dashboardId: this.dashboardId,
            userHasUpdateNameAuthorization: this.userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization: this.userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(OpenWindowEditComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    resize() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);

        this.timelineWidth = element.width;
        this.timelineHeight = element.height;
    }

    getTimelineData() {
        this.resize();

        const timescaleElements: QueriesRequestV2ElementTimescaleModel[] = [];
        const exports = this.widget.properties?.windowExports || [];
        const time: QueriesRequestTimeModel = {};
        const timeRangeLevel = this.widget.properties.windowTimeRange?.level || '';
        const timeRangeType = this.widget.properties.windowTimeRange?.type || '';
        if(timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute) {
            const start = this.widget.properties.windowTimeRange?.start;
            if(start != null && start !== '') {
                const date = new Date(start);
                time['start'] =  date.toISOString();
            }
            const end = this.widget.properties.windowTimeRange?.end;
            if(end != null && end !== '') {
                const date = new Date(end);
                time['end'] =  date.toISOString();
            }
        } else if(timeRangeType === ChartsExportRangeTimeTypeEnum.Relative) {
            const last = this.widget.properties.windowTimeRange?.time;
            if(last != null) {
                time['last'] = last + timeRangeLevel;
            }
        } else if(timeRangeType === ChartsExportRangeTimeTypeEnum.RelativeAhead) {
            const ahead = this.widget.properties.windowTimeRange?.time;
            if(ahead != null) {
                time['ahead'] = ahead + timeRangeLevel;
            }
        }

        exports.forEach(dataExport => {
            timescaleElements.push({
                columns: [{
                    name: 'window_open'
                }
                ],
                time,
                orderDirection: 'desc',
                orderColumnIndex: 0,
                exportId: dataExport.id
            });
        });

        return this.exportDataService.queryTimescaleV2(timescaleElements).pipe(
            concatMap((resp: any) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorHandlerService.logError('OpenWindow', 'getTimelineData', resp);
                    return throwError(() => resp.error);
                }

                if(((resp as any).length || 0) === 0) {
                    this.message = 'No data';
                    return throwError(() => new Error('no data'));
                }
                return this.parseToTimelineFormat(resp);
            }),
            map(chartData => {
                this.timelineChartData = chartData;
                this.chartDataReady = true;
            })
        );
    }

    getLastDetectionValue(exportID: string) {
        const requestPayloads: any[] = [];

        requestPayloads.push({
            exportId: exportID,
            measurement: exportID,
            columnName: 'window_open'
        });

        return this.exportDataService.getLastValuesTimescale(requestPayloads).pipe(
            map((lastValuePerExport: TimeValuePairModel[]) => {
                if(lastValuePerExport.length === 0) {
                    throw(new Error('No last value'));
                }

                return lastValuePerExport[0].value as boolean;
            })
        );
    }

    parseDeviceDataToTimeline(deviceData: any[][][], exportID: string) {
        const deviceDataWithoutColumn = deviceData[0];
        const expid = exportID;
        // if(deviceDataWithoutColumn.length === 0) {
        //     return this.getLastDetectionValue(exportID).pipe(
        //         map(lastDetectedValue => {
        //             const timeRange = this.widget.properties.windowTimeRange?.time || 2;
        //             const timeRangeLevel = this.widget.properties.windowTimeRange?.level || 'days';
        //             const startTimestamp = moment().subtract(timeRange as DurationInputArg1, timeRangeLevel as unitOfTime.DurationConstructor).toISOString();
        //             const paddingData = [[startTimestamp, lastDetectedValue], [new Date().toISOString(), lastDetectedValue]];
        //             deviceDataWithoutColumn = paddingData.concat(deviceDataWithoutColumn);
        //             console.log('if clause parseDeviceDataToTimeline: ', deviceDataWithoutColumn);
        //             return [deviceDataWithoutColumn];
        //         })
        //     );
        // }

        // Last value in timeline should always be the current time with the last/newest detected value
        // const lastValue = deviceDataWithoutColumn[0][1];
        // console.log('last value', lastValue);
        // deviceDataWithoutColumn = [[new Date().toISOString(), lastValue]].concat(deviceDataWithoutColumn);
        return of([deviceDataWithoutColumn]);
    }

    parseToTimelineFormat(response: any) {
        const exports = this.widget.properties?.windowExports || [];
        const obs: Observable<any[][][]>[] = [];
        response.forEach((dataPerExport: any, index: number) => {
            const exportID = exports[index].id;
            obs.push(this.parseDeviceDataToTimeline(dataPerExport['data'], exportID));
        });

        return forkJoin(obs);
    }
}
