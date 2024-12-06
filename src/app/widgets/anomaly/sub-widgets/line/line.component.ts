import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartType } from 'ng-apexcharts';
import { GoogleChartComponent } from 'ng2-google-charts';
import { GoogleChartsDataTable } from 'ng2-google-charts/lib/google-charts-datatable';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ApexChartOptions } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { ChartsModel } from 'src/app/widgets/charts/shared/charts.model';
import { AnomaliesPerDevice, AnomalyResultModel, DeviceValue } from '../../shared/anomaly.model';
import { AnomalyService } from '../../shared/anomaly.service';
import {  ChangeDetectorRef } from '@angular/core';

const AnomalyPointSize = 7;
const AnomalyPointColor = '#FF0000';
const NormalPointSize = 1;
const NormalPointColor = '#008FFB';
const DebugPointSize = 0;
const NormalWaitingPointSize = 5;

@Component({
    selector: 'anomaly-line',
    templateUrl: './line.component.html',
    styleUrls: ['./line.component.css']
})
export class LineComponent implements OnInit, OnChanges {
    chartsReady = false;
    timeChartData?: any;
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

    valueChartData: any;
    private createApexChartOptions(chartType: ChartType): ApexChartOptions {
        const chartData = {
            series: [],
            chart: {
                redrawOnParentResize: true,
                redrawOnWindowResize: true,
                width: '100%',
                height: 'auto',
                animations: {
                    enabled: false
                },
                type: chartType,
                toolbar: {
                    show: true
                },
                events: {}
            },
            title: {},
            plotOptions: {},
            xaxis: {
                type: 'datetime' as 'datetime' | 'category',
                labels: {
                    datetimeUTC: false,
                },
                title: {
                    text: ''
                }
            },
            yaxis: {
                title: {
                    text: ''
                },
                decimalsInFloat: 3
            },
            colors: [],
            legend: {
                show: true
            },
            annotations: {
                points: [],
                xaxis: []
            },
            tooltip:{
                enabled: true,
                x: {
                    format: 'dd.MM HH:mm:ss.fff',
                }
            },
            markers: {
            },
        };

        return chartData;
    };

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

            this.timeChartData.chart.width = this.chartWidth;
            this.timeChartData.chart.height = this.chartHeight;
        }
        this.valueChartData.chart.width = this.chartWidth;
        this.valueChartData.chart.height = this.chartHeight;

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

    private combineCurveAnomalies(curveAnomalies: AnomalyResultModel[]) {
        /* Curve Anomalies can overlap. The interval bounds and reconstructions need to be merged
           Assumption: curveAnomalies is sorted by ascending occurence
        */
        let anomalyIntervals: any[] = [];
        let overlapFound = false;
        const anomaliesWithOverlap: AnomalyResultModel[] = [];
        const startTimesOfFirstOverlaps: any[] = [];

        const point = {
            x: 0,
            x2: 0,
            fillColor: '#FF4C4C',
            opacity: 0.4,
        };

        for (let index = 0; index < curveAnomalies.length; index++) {
            const currentAnomaly = curveAnomalies[index];
            if(index === curveAnomalies.length-1) {
                if(overlapFound) {
                    break;
                }
                // console.log('last anomaly without overlap');

                point.x = new Date(currentAnomaly.start_time).getTime();
                point.x2 = new Date(currentAnomaly.end_time).getTime();
                anomalyIntervals.push(point);
                break;
            }

            const nextAnomaly = curveAnomalies[index+1];
            if(new Date(nextAnomaly.start_time).getTime() < new Date(currentAnomaly.end_time).getTime()) {
                // Case: Overlap with the next anomaly
                // console.log('overlap');
                overlapFound = true;
                currentAnomaly.end_time = nextAnomaly.end_time;
                anomaliesWithOverlap.push(currentAnomaly);
                startTimesOfFirstOverlaps.push(nextAnomaly.start_time);
            } else {
                // Case: No Overlap, Interval can be directly created from anomaly
                // console.log('no overlap');
                point.x = new Date(currentAnomaly.start_time).getTime();
                point.x2 = new Date(currentAnomaly.end_time).getTime();
                anomalyIntervals.push(point);
            }
        }

        if(!overlapFound) {
            return [anomalyIntervals, []];
        } else {
            const result = this.combineCurveAnomalies(anomaliesWithOverlap);
            anomalyIntervals = anomalyIntervals.concat(result[0]);
        }

        const points: any[] = this.createReconstructionPoints(curveAnomalies, startTimesOfFirstOverlaps);
        return [anomalyIntervals, points];
    }

    private createReconstructionPoints(anomalies: AnomalyResultModel[], startTimesOfFirstOverlaps: any[]) {
        /* Assumption: Reconstruction are sorted asc by timestamp
           startTimesOfFirstOverlaps contains start times of overlapping intervals. These are end bounds for reconstructions from single anomalies.
        */
        const reconstrucedPoints: any[] = [];
        const reconstructionInputPoints: any[] = [];

        anomalies.forEach((anomaly, anomalyIndex) => {
            const reconstructions: any[] = anomaly.original_reconstructed_curves;
            const endTimeOfAnomalyPhase = new Date(startTimesOfFirstOverlaps[anomalyIndex]); // will be undefined for anomalies that are not overlapping
            for (let index = 0; index < reconstructions.length; index++) {
                const reconstruction = reconstructions[index];
                const ts = reconstruction[0];
                if(endTimeOfAnomalyPhase != null && new Date(ts).getTime() > endTimeOfAnomalyPhase.getTime()) {
                    // Outside of anomaly interval
                    break;
                }

                const inputValue = reconstruction[1];
                const reconstructedValue = reconstruction[2];
                reconstrucedPoints.push({
                    x: new Date(ts).getTime(),
                    y: parseFloat(reconstructedValue)
                });
                reconstructionInputPoints.push({
                    x: new Date(ts).getTime(),
                    y: parseFloat(inputValue)
                });
            }
        });

        return [reconstrucedPoints, reconstructionInputPoints];
    }

    private getDeviceAnomalies(deviceId: string) {
        let anomaliesOfDevice: AnomalyResultModel[] = [];
        if(this.anomalies != null && this.anomalies[deviceId] != null) {
            anomaliesOfDevice = this.anomalies[deviceId];
        }
        return anomaliesOfDevice;
    }

    private getChartAnomalies(deviceId: string) {
        const anomalyPoints: any[] = [];
        const curveAnomalies: any[] = [];
        const extremeBoundIntervals: any[] = [];
        this.getDeviceAnomalies(deviceId).forEach(anomaly => {
            const ts = new Date(anomaly.timestamp).getTime();
            if(anomaly.type === 'extreme_value') {
                this.extremeOutliers.push(anomaly);
                anomalyPoints.push({
                    x: ts,
                    y: parseFloat(anomaly.value)
                });

                extremeBoundIntervals.push({
                    x: ts,
                    y: [anomaly.lower_bound, anomaly.upper_bound]
                });
            } else if(anomaly.type === 'curve') {
                curveAnomalies.push(anomaly);
            }
        });

        const result = this.combineCurveAnomalies(curveAnomalies);
        const anomalyIntervals = result[0];
        const points = result[1];
        const reconstrucedPoints = points[0];
        const reconstructionInputPoints: any[] = points[1];
        return [anomalyPoints, reconstrucedPoints, reconstructionInputPoints, anomalyIntervals];
    }

    private createValueChartModel(deviceId: string, serviceId: string, pathToColumn: string, lastTimeRange: string) {
        // Anomaly Operator works on 1 minute sampling for curve anomalies
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, lastTimeRange, '1m').pipe(
            map(data => {
                const chartData = this.createApexChartOptions('line');
                const points: any[] = [];
                data.forEach(deviceValue => {
                    points.push({
                        x: new Date(deviceValue.timestamp).getTime(),
                        y: deviceValue.value
                    });
                });

                const colors = [NormalPointColor];
                const sizes = [NormalPointSize];

                chartData.series?.push({data: points, name: 'Original', type:'line'});
                const anomalies = this.getChartAnomalies(deviceId);

                const outlierPoints = anomalies[0];
                if(chartData.annotations.points != null) {
                    // Anomaly Points can be drawn as annotations -> Unfortunately ApexCahrt has no tooltip on annotations
                    // Can be drawn as scatter plot -> but marker size is not configurable when combi chart line+scatter is done
                    //chartData.annotations.points = anomalyPoints;
                    chartData.series?.push({data: outlierPoints, name: 'Outlier', type:'scatter'});
                    colors.push(AnomalyPointColor);
                    sizes.push(AnomalyPointSize);
                }

                if(this.showDebug) {
                    const reconstrucedPoints = anomalies[1];
                    chartData.series?.push({data: reconstrucedPoints, name: 'Prediction', type:'line'});
                    colors.push('#228B22');
                    sizes.push(DebugPointSize);

                    const reconstructionInputPoints = anomalies[2];
                    chartData.series?.push({data: reconstructionInputPoints, name: 'Processed', type:'line'});
                    colors.push('#AFE1AF');
                    sizes.push(DebugPointSize);
                }

                const anomalyIntervals = anomalies[3];
                if(chartData.annotations.xaxis != null) {
                    chartData.annotations.xaxis = anomalyIntervals;
                }

                chartData.markers.colors = colors;
                chartData.colors = colors;
                chartData.markers.size = sizes;

                if(chartData.yaxis.title != null) {
                    chartData.yaxis.title.text = 'Device Output';
                }
                const self = this;

                chartData.tooltip.custom = function({series, seriesIndex, dataPointIndex}) {
                    // console.log(w)
                    const value = series[seriesIndex][dataPointIndex].toFixed(2);
                    let tooltipMsg;
                    switch(seriesIndex) {
                    case 0:
                        tooltipMsg = '<b>Device Output:</b> ' + value;
                        break;
                    case 1:
                        const anomaly = self.extremeOutliers[dataPointIndex];
                        tooltipMsg = '<b>Extreme Outlier:</b> ' + anomaly.value + ' [' + anomaly.lower_bound + '-' + anomaly.upper_bound + ']';
                        break;
                    case 2:
                        tooltipMsg = '<b>Predicted Value:</b> ' + value;
                        break;
                    case 3:
                        tooltipMsg = '<b>Preprocessed Value:</b> ' + value;
                        break;
                    default:
                        tooltipMsg = value;
                    }

                    return '<div class="arrow_box">' +
                      '<span>' + tooltipMsg + '</span>' +
                      '</div>';
                };
                return chartData;
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


    private parseFrequencyAnomalies(deviceId: string) {
        const frequencyAnomalies: any[] = [];
        this.getDeviceAnomalies(deviceId).forEach(anomaly => {
            if(anomaly.type === 'freq') {
                frequencyAnomalies.push({
                    x: new Date(anomaly.timestamp).getTime(),
                    y: parseFloat(anomaly.value)
                });
            }
        });
        return frequencyAnomalies;
    }

    private createTimeChartModel(deviceId: string, serviceId: string, pathToColumn: string, _: string) {
        return this.anomalyService.getDeviceCurve(deviceId, serviceId, pathToColumn, '10m').pipe(
            map(data => {
                const chartData = this.createApexChartOptions('scatter');
                const points: any[] = [];
                const waitingTimesInMs = this.calcWaitingTimes(data);
                const level = this.detectLevelOfTimestamps(waitingTimesInMs);
                if(chartData.yaxis.title != null) {
                    chartData.yaxis.title.text = 'Waiting time in ' + level;
                }
                waitingTimesInMs.forEach((waitingTime, index) => {
                    const row = data[index];
                    const roundedWaitingTime = this.roundMilliseconds(waitingTime, level);
                    points.push({
                        x: new Date(row.timestamp).getTime(),
                        y: roundedWaitingTime,
                    });
                });

                chartData.series?.push({data: points, name: 'Waiting Time'});
                const colors = [NormalPointColor];
                const sizes = [NormalWaitingPointSize];

                const outlierPoints = this.parseFrequencyAnomalies(deviceId);
                chartData.series?.push({data: outlierPoints, name: 'Outlier', type:'scatter'});
                colors.push(AnomalyPointColor);
                sizes.push(AnomalyPointSize);

                chartData.markers.colors = colors;
                chartData.colors = colors;
                chartData.markers.size = sizes;
                return chartData;
            })
        );
    }

    private roundMilliseconds(miliseconds: number, to: string) {
        switch (to) {
        case 'seconds':
            return miliseconds/1000;
        case 'minutes':
            return miliseconds/1000/60;
        case 'hours':
            return miliseconds/1000/60/60;
        case 'days':
            return miliseconds/1000/60/60/24;
        }

        return miliseconds;
    }

    private detectLevelOfTimestamps(timesInMs: number[]) {
        const sum = timesInMs.reduce((a,b) => a+b, 0);
        const avg = sum / timesInMs.length;
        let level = 'seconds';
        let time = avg/1000;

        if(time > 60) {
            level = 'minutes';
            time = time/60;

            if(time > 60) {
                time = time/60;
                level = 'hours';

                if(time > 24) {
                    time = time/24;
                    level = 'days';

                    if(time > 30) {
                        time = time/30;
                        level = 'Months';
                    }
                }
            }
        }
        return level;
    }

    calcWaitingTimes(data: DeviceValue[]) {
        /* Calculate the waiting time between data points.
           Data is sorted by descending time.
        */
        const waitingTimesInMs: number[] = [];
        for (let index = 0; index < data.length; index++) {
            const nextIndex = index+1;
            if(nextIndex > data.length-1) {
                waitingTimesInMs.push(0);
                break;
            }
            const currentRow = data[index];
            const nextRow = data[nextIndex];
            const waitingTime = new Date(currentRow.timestamp).getTime() - new Date(nextRow.timestamp).getTime();
            waitingTimesInMs.push(waitingTime);
        }
        return waitingTimesInMs;
    }

}
