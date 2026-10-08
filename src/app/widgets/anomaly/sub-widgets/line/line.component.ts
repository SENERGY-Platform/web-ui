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

import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { AnomaliesPerDevice, AnomalyResultModel, DeviceValue } from '../../shared/anomaly.model';
import { AnomalyService } from '../../shared/anomaly.service';
import { ChangeDetectorRef } from '@angular/core';
import { chartAnomalies, timeChartSeries, valueChartSeries, waitingTimes } from './anomaly-line-chart';
import { AnomalyChartConfig, timeChartConfig, valueChartConfig } from './anomaly-line-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';
import { ChartToolbarComponent } from '../../../shared/chart-toolbar/chart-toolbar.component';
import { BaseChartDirective } from 'ng2-charts';

@Component({
    selector: 'anomaly-line',
    templateUrl: './line.component.html',
    styleUrls: ['./line.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ChartToolbarComponent, BaseChartDirective]
})
export class LineComponent implements OnInit, OnChanges {
    chartsReady = false;
    timeChartData?: AnomalyChartConfig;
    readonly chartPlugins = [crosshairPlugin];
    @Input() widget?: WidgetModel;
    @Input() anomalies?: AnomaliesPerDevice;
    @Input() widgetHeight = 0;
    @Input() widgetWidth = 0;
    @Input() showDebug = false;

    chartHeight = 0;
    chartWidth = 0;
    render = false;
    showFrequencyAnomalies = false;

    extremeOutliers: AnomalyResultModel[] = [];

    valueChartData?: AnomalyChartConfig;
    constructor(
      private anomalyService: AnomalyService,
      private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.setupCharts().subscribe({
            next: () => {
                this.setChartSize();
                this.chartsReady = true;
            },
            error: (err: any) => {
                console.log(err);
                this.chartsReady = false;
            }
        });

    }

    private setChartSize() {
        this.render = false;
        this.chartHeight = this.widgetHeight;
        this.chartWidth = this.widgetWidth - 100;

        if(this.showFrequencyAnomalies === true) {
            this.chartHeight = this.widgetHeight * 0.45;
        }

        this.cdr.detectChanges();
        this.render = true;
    }

    ngOnChanges(changes: SimpleChanges): void {
        const widgetWidth = changes['widgetWidth'];
        const widgetHeight = changes['widgetHeight'];
        if(widgetWidth != null) {
            this.widgetWidth = widgetWidth.currentValue;
        }

        if(widgetHeight != null) {
            this.widgetHeight = widgetHeight.currentValue;
        }

        if(this.valueChartData != null) {
            this.setChartSize();
        }
    }

    setupCharts() {
        if(this.widget?.properties?.anomalyDetection == null) {
            return of(null);
        }

        this.showFrequencyAnomalies = this.widget.properties.anomalyDetection.showFrequencyAnomalies;

        // Take the device/service from the selection. TODO: loop over and create sub components
        const deviceId = this.widget?.properties?.anomalyDetection.deviceValueConfig.exports[0].id || '';
        const serviceId =  this.widget?.properties?.anomalyDetection.deviceValueConfig.fields[0].serviceId || '';
        const pathToColumn = this.widget?.properties?.anomalyDetection.deviceValueConfig.fields[0].valuePath || '';

        const timeRangeConfig = this.widget?.properties?.anomalyDetection.timeRangeConfig.timeRange;
        if(timeRangeConfig.time == null || timeRangeConfig.level == null) {
            return of(null);
        }
        const lastTimeRange = timeRangeConfig.time + timeRangeConfig.level;
        const chartJobs: Observable<any>[] = [
            this.createValueChartModel(deviceId, serviceId, pathToColumn, lastTimeRange),
            this.createTimeChartModel(deviceId, serviceId, pathToColumn, lastTimeRange)
        ];

        return forkJoin(chartJobs).pipe(
            map(results => {
                this.valueChartData = results[0];
                this.timeChartData = results[1];
                return null;
            })
        );
    }

    private getDeviceAnomalies(deviceId: string) {
        let anomaliesOfDevice: AnomalyResultModel[] = [];
        if(this.anomalies != null && this.anomalies[deviceId] != null) {
            anomaliesOfDevice = this.anomalies[deviceId];
        }
        return anomaliesOfDevice;
    }

    private createValueChartModel(deviceId: string, serviceId: string, pathToColumn: string, lastTimeRange: string) {
        // Anomaly Operator works on 1 minute sampling for curve anomalies
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, lastTimeRange, '1m').pipe(
            map(data => {
                const anomalies = chartAnomalies(this.getDeviceAnomalies(deviceId));
                this.extremeOutliers.push(...anomalies.extremeOutliers);
                return valueChartConfig(valueChartSeries(data, anomalies, this.showDebug), anomalies.intervals, anomalies.extremeOutliers);
            })
        );
    }

    /*

    NOTE: For Google Chart!!

    private createValueChartModel(deviceId: string, serviceId: string, pathToColumn: string, lastTimeRange: string) {
        // Load device curve. Group by 1h to prevent too many points beeing drawn, anomalies are drawn separately anyways
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, lastTimeRange).pipe(
            map(data => {
                const extremeAnomalyPoints = this.createAnomalyValuePoints(this.showDebug, 'extreme_value');
                const curveAnomalyPoints = this.createAnomalyValuePoints(this.showDebug, 'curve');
                const anomalyPoints = extremeAnomalyPoints.concat(curveAnomalyPoints);

                let dataTable: any = [];
                let valuePoints: any = [];

                if(this.showDebug) {
                    // Note: Interval Columns need to follow after a column that has no null values
                    dataTable = [['time', 'extreme_anomaly', 'curve_anomaly', 'value', {id:'i0', role:'interval'},  {id:'i1', role:'interval'}]];
                    valuePoints = this.getChartPointsWithBounds(data);
                } else {
                    dataTable = [['time', 'extreme_anomaly', 'curve_anomaly', 'value']];
                    valuePoints = this.getChartPoints(data);
                }
                valuePoints = valuePoints.concat(anomalyPoints);
                valuePoints.sort((a: any,b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

                dataTable = dataTable.concat(valuePoints);
                console.log(dataTable)

                const options: any = {
                    legend: {position: 'none'},
                    vAxis: {
                        title: 'Value',
                    },
                    theme: 'material',
                    series: {
                        0: {
                            // series with extreme anomaly values
                            pointSize: 10,
                            color: '#ff0000'
                        },
                        1: {
                            // series with curve anomaly points
                            color: '#ff0000'
                        },
                        2: {
                            // series with original value points
                            color: '#008000'
                        }
                    },
                };

                if(this.showDebug) {
                    options['intervals'] = { 'style':'area' };
                };

                const valueChartData = new ChartsModel('LineChart', dataTable, options);

                return valueChartData;
            })
        );
    }

    private getChartPoints(data: DeviceValue[]) {
        const dataTable: any[] = [];
        data.forEach(row => {
            dataTable.push([new Date(row.timestamp), null, null, row.value]);
        });
        return dataTable;
    }

    private getBoundsFromFollowingAnomaly(anomalyStack: any[], row: any): any[] {
        const latestAnomaly = anomalyStack[0];
        const rowTime = new Date(row.timestamp).getTime();

        if(rowTime > new Date(latestAnomaly.timestamp).getTime()) {
            return [null, null];
        };

        if(anomalyStack.length === 1) {
            return [500, 600]; // bound from latest
        }
        const secondLatestAnomaly = anomalyStack[1];
        if(rowTime > new Date(secondLatestAnomaly.timestamp).getTime()) {
            return [600, 700];
        };

        anomalyStack.pop();
        return this.getBoundsFromFollowingAnomaly(anomalyStack, row);

    }

    private getChartPointsWithBounds(data: DeviceValue[]) {
         Each device value point needs to get the bounds from the next anomaly.
           This is needed so that the interval band can be drawn.
           Note, this is can take some time if lots of data points are present e.g. when multiple days of data are displayed.
           E.g Anomaly at 10 with bounds [0,20] -> Device Value at 9 gets bounds [0,20]

        const dataTable: any[] = [];
        const anomalyStack: any[] = JSON.parse(JSON.stringify(this.anomalies?.[Object.keys(this.anomalies)[0]]));
        data.forEach(row => {
            const bounds = this.getBoundsFromFollowingAnomaly(anomalyStack, row);
            dataTable.push([new Date(row.timestamp), null, null, row.value, bounds[0], bounds[1]]);
        });
        return dataTable;
    }

    private createAnomalyValuePoints(withInterval: boolean, anomalyType: string) {
        // Filter point outlier anomalies and create google chart points
        const deviceId = Object.keys(this.anomalies||{})[0];
        const points: any[][] = [];
        this.anomalies?.[deviceId].forEach(anomaly => {
            if(anomaly.type === anomalyType) {
                let point: any;
                if(anomalyType === 'extreme_value') {
                    point = [new Date(anomaly.timestamp), parseFloat(anomaly.value), null, null];
                } else if(anomalyType === 'curve') {
                    point = [new Date(anomaly.timestamp), null, parseFloat(anomaly.value), null];

                }
                if(withInterval) {
                    point.push(null);
                    point.push(null);
                }
                points.push(point);
            }
        });
        return points;
    }

    private convertAnomaliesToTimeChartPoints() {
        // Filter frequency anomalies and create google chart points
        const deviceId = Object.keys(this.anomalies||{})[0];
        const points: any[][] = [];
        this.anomalies?.[deviceId].forEach(anomaly => {
            if(anomaly.type === 'time') {
                points.push([anomaly.timestamp, anomaly.value]);
            }
        });
        return points;
    }


    private createTimeChartModel(deviceId: string, serviceId: string, pathToColumn: string, lastTimeRange: string) {
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, lastTimeRange).pipe(
            map(data => {
                let dataTable: any = [['time', 'value']];
                const waitingTimesInMs = this.calcWaitingTimes(data);
                let roundedWaitingTimes: any[][] = [];
                const level = this.detectLevelOfTimestamps(waitingTimesInMs);
                waitingTimesInMs.forEach((waitingTime, index) => {
                    const row = data[index];
                    const roundedWaitingTime = this.roundMilliseconds(waitingTime, level);
                    roundedWaitingTimes.push([new Date(row.timestamp), roundedWaitingTime]);
                });

                const anomalyPoints = this.convertAnomaliesToTimeChartPoints();
                roundedWaitingTimes = roundedWaitingTimes.concat(anomalyPoints);
                roundedWaitingTimes.sort((a: any,b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());
                //roundedWaitingTimes = roundedWaitingTimes.slice(0, 100);

                dataTable = dataTable.concat(roundedWaitingTimes);
                const timeChartData = new ChartsModel('LineChart', dataTable, {
                    legend: {position: 'none'},
                    vAxis: {
                        title: 'Waiting time in ' + level
                    },
                    hAxis: {
                    },
                    pointSize: 5,
                    lineWidth: 0,
                    theme: 'material'
                });

                return timeChartData;
            })
        );
    }

    */


    private createTimeChartModel(deviceId: string, serviceId: string, pathToColumn: string, _: string) {
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, '10m').pipe(
            map(data => {
                const timeChart = timeChartSeries(data, this.getDeviceAnomalies(deviceId));
                return timeChartConfig(timeChart.series, timeChart.yTitle);
            })
        );
    }

    calcWaitingTimes(data: DeviceValue[]) {
        return waitingTimes(data);
    }

}
