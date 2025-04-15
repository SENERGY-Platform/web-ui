import { Component, HostListener, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subscription, map, Observable, concatMap, of, forkJoin, throwError } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DashboardManipulationEnum } from 'src/app/modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { QueriesRequestTimeModel, QueriesRequestV2ElementTimescaleModel, TimeValuePairModel } from '../../shared/export-data.model';
import { ExportDataService } from '../../shared/export-data.service';
import { ChartsExportRangeTimeTypeEnum } from '../export/shared/charts-export-range-time-type.enum';
import { OpenWindowEditComponent } from './dialog/edit/edit.component';
import { TimelineComponent } from '../shared/chart-types/timeline/timeline.component';

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

    @ViewChild(TimelineComponent) timelineChart!: TimelineComponent;

    ngOnInit(): void {
        this.widgetIsConfigured();
        if(!this.notConfigured) {
            this.update();
        }
        this.scheduleRefresh();
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

    private scheduleRefresh() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refresh();
            }
        });
    }

    private refresh() {
        this.refreshing = true;
        if (this.timelineChart) {
            this.getTimelineData().subscribe({
                next: (_) => {
                    this.timelineChart.rebuildChart();      // in single cases, apx chart is build incorrectly
                    this.timelineChart.rebuildChart(false); // building the chart twice resets the bug, no need to load data twice though
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

        const requestRange = new Map<string, any>();
        const timescaleElements: QueriesRequestV2ElementTimescaleModel[] = [];
        const exports = this.widget.properties?.windowExports || [];
        const time: QueriesRequestTimeModel = {};
        const timeRangeLevel = this.widget.properties.windowTimeRange?.level || '';
        const timeRangeType = this.widget.properties.windowTimeRange?.type || '';

        requestRange.set('timeRangeType', timeRangeType);
        if(timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute) {
            const start = this.widget.properties.windowTimeRange?.start;
            if(start != null && start !== '') {
                const date = new Date(start);
                time['start'] =  date.toISOString();
                requestRange.set('start', date);
            }
            const end = this.widget.properties.windowTimeRange?.end;
            if(end != null && end !== '') {
                const date = new Date(end);
                time['end'] =  date.toISOString();
                requestRange.set('end', date);
            }
        } else if(timeRangeType === ChartsExportRangeTimeTypeEnum.Relative) {
            const last = this.widget.properties.windowTimeRange?.time;
            if(last != null) {
                time['last'] = last + timeRangeLevel;
                requestRange.set('timeRangeLevel', timeRangeLevel);
                requestRange.set('timeCount', last);
            }
        } else if(timeRangeType === ChartsExportRangeTimeTypeEnum.RelativeAhead) {
            const ahead = this.widget.properties.windowTimeRange?.time;
            if(ahead != null) {
                time['ahead'] = ahead + timeRangeLevel;
                requestRange.set('timeRangeLevel', timeRangeLevel);
                requestRange.set('timeCount', ahead);
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
                return this.parseToTimelineFormat(resp, requestRange);
            }),
            map(chartData => {
                this.timelineChartData = chartData;
                this.chartDataReady = true;
            })
        );
    }

    getMedianTimeGap(deviceData: any[][]): number {
        if (deviceData.length < 2){
            return 0;
        }
        const testSet = deviceData.length>1000 ? deviceData.slice(0, 1000) : deviceData;
        let pred = new Date(deviceData[0][0]);
        const timeGaps = [];
        for (let i = 1; i < testSet.length; i++) {
            const current = new Date(deviceData[i][0]);
            const diffTime = Math.abs(current.getTime() - pred.getTime());
            const gapSec = Math.floor(diffTime / (1000));
            if (gapSec !== 0) {
                timeGaps.push(gapSec);
            }
            pred = current;
        }
        if (timeGaps.length > 0) {
            return timeGaps.slice().sort((a, b) => a - b)[Math.floor(timeGaps.length / 2)]; // median
        } else {
            return 0;
        }
    }

    calcRelativeTimeRange(timeRangeType: string, timeRangeLevel: string, timeCount: number): [Date, Date] {
        const now = new Date();
        if (timeRangeLevel === 'months'){
            if (timeRangeType==='relative') {
                const start = new Date(new Date(now).setMonth(now.getMonth() - timeCount));
                return [start, now];
            }else{
                const end = new Date(new Date(now).setMonth(now.getMonth() + timeCount));
                return [now, end];
            }
        } else if (timeRangeLevel === 'y') {
            if (timeRangeType==='relative') {
                const start = new Date(new Date(now).setFullYear(now.getFullYear() - timeCount));
                return [start, now];
            }else{
                const end = new Date(new Date(now).setFullYear(now.getFullYear() + timeCount));
                return [now, end];
            }
        } else { // for all other cases fixed delta is sufficient
            let delta = 0;
            if (timeRangeLevel === 'ms') {
                delta = timeCount;
            } else if (timeRangeLevel === 's') {
                delta = timeCount * 1000;
            } else if (timeRangeLevel === 'm') {
                delta = timeCount * 1000 * 60;
            } else if (timeRangeLevel === 'h') {
                delta = timeCount * 1000 * 60 * 60;
            } else if (timeRangeLevel === 'd') {
                delta = timeCount * 1000 * 60 * 60 * 24;
            } else if (timeRangeLevel === 'w') {
                delta = timeCount * 1000 * 60 * 60 * 24 * 7;
            } else {
                throw new Error('Open Window Widget: No valid TimeRangeType given');
            }

            if (timeRangeType==='relative') {
                const start = new Date(now.getTime() - delta);
                return [start, now];
            } else {
                const end = new Date(now.getTime() + delta);
                return [now, end];
            }
        }
    }

    getTimeRange(timeRequest: Map<string,any>): [Date, Date] {
        if (timeRequest.has('timeRangeType')) {
            const timeRangeType = timeRequest.get('timeRangeType');
            if (timeRangeType === 'absolute') {
                if (timeRequest.has('start')  && timeRequest.has('end')) {
                    return [timeRequest.get('start') as Date, timeRequest.get('end') as Date];
                }
            } else if (timeRangeType === 'relative' || timeRangeType === 'relative ahead') {
                if (timeRequest.has('timeRangeLevel') && timeRequest.has('timeCount')) {
                    return this.calcRelativeTimeRange(timeRangeType, timeRequest.get('timeRangeLevel'), timeRequest.get('timeCount'));
                }
            }
        }
        throw new Error('Open Window Widget: No valid TimeRangeType given');
    }

    fillDataGaps(deviceData: any[][], timeRequest: Map<string,any>, resolution: number = 30): any[][] {
        if (resolution === 0) {
            throw new RangeError('Open Window Widget: resolution to fill data gaps must not be 0.');
        }
        const thresh = this.getGapThreshold(resolution);
        const [startTime, endTime] = this.getTimeRange(timeRequest);
        let succ: Date = endTime;
        const updates: any [][] = [];
        for (let i = 0; i < deviceData.length+1; i++) {
            const current = i < deviceData.length ? new Date(deviceData[i][0]): startTime;
            const diffTime = Math.abs(succ.getTime() - current.getTime());
            const gapSec = Math.floor(diffTime / (1000));
            if (gapSec > thresh) {
                const succTimeDiff = i===0 ? 0: (resolution * 1000); // end point can be taken as it is, else create new point with timediff
                const newEndDate = new Date(succ.getTime() - succTimeDiff);
                const newEndDp = [newEndDate.toISOString(), null];
                updates.push([i, newEndDp]);

                const startTimeDiff = i===deviceData.length ? 0: (resolution * 1000); // start point can be taken as it is
                const newStartDate = new Date(current.getTime() + startTimeDiff);
                const newStartDp = [newStartDate.toISOString(), null];
                updates.push([i, newStartDp]);
            }
            succ = current;
        }
        let counter = 0;
        updates.forEach((update) => {
            deviceData.splice(update[0]+counter, 0, update[1]);
            counter = counter + 1;
        });
        return deviceData;
    }

    getGapThreshold(res: number): number {
        const resolutionToGapThreshold = {
            '1min' : (5*60), // in seconds
            '5min' : (15*60),
            '15min' : (30*60),
        };
        if (res<=(60)) {
            return resolutionToGapThreshold['1min'];
        } else if (res<=(5*60)) {
            return resolutionToGapThreshold['5min'];
        } else if (res<=(15*60)) {
            return resolutionToGapThreshold['15min'];
        } else {
            return 3*res;
        }
    }

    parseDeviceDataToTimeline(deviceData: any[][][], timeRequest: Map<string, any>) {
        const deviceDataWithoutColumn = deviceData[0];
        let filledData = deviceDataWithoutColumn;
        const medianTimeGap = this.getMedianTimeGap(deviceDataWithoutColumn);
        if (medianTimeGap > 0) {
            filledData = this.fillDataGaps(deviceDataWithoutColumn, timeRequest, medianTimeGap);
        } else {
            filledData = this.fillDataGaps(deviceDataWithoutColumn, timeRequest);
        }
        return of([filledData]);
    }

    parseToTimelineFormat(response: any, timeRequest: Map<string, any>) {
        const obs: Observable<any[][][]>[] = [];
        response.forEach((dataPerExport: any) => {
            obs.push(this.parseDeviceDataToTimeline(dataPerExport['data'], timeRequest));
        });

        return forkJoin(obs);
    }
}
