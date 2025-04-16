import {
    ChangeDetectorRef,
    Component, ElementRef,
    Input,
    OnChanges,
    OnInit, SimpleChanges
} from '@angular/core';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { ApexChartOptions, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';
import ApexCharts from 'apexcharts';

@Component({
    selector: 'timeline-chart',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnInit, OnChanges {
    /*
    Data is expected to be in shape
    [NUMBER_TIMELINE_ROWS, NUMBER_COLUMNS, NUMBER_TIMESTAMPS, 2]
    where NUMBER_TIMELINE_ROWS comes mostly from the number of exports, the index has to match with the vAxes list to find the corresponding alias
    The last dimension is expected to be [timestamp string, value] and has to be sorted descending by timestamp
    */
    @Input() data: any[] = [];
    @Input() chartId = '';
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() enableToolbar = false;
    @Input() vAxes: ChartsExportVAxesModel[] = [];
    @Input() height = 0;
    @Input() width = 0;
    @Input() OnClickFnc = (_: any, _2: any, _3: any) => { };
    render = false;
    private chartInstance: ApexCharts | null = null;
    private series: any[] = [];
    private colors: string[] = [];
    isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());

    apexChartOptions: Partial<ApexChartOptions> = {
        series: this.series,
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: 0.95 * this.width,
            height: '100%',
            animations: {
                enabled: false
            },
            type: 'rangeBar',
            toolbar: {
                show: false
            },
            events: {},
            zoom: {
                // @ts-expect-error allowMouseWheelZoom is unknown to ng2-apexcharts but works as expected
                allowMouseWheelZoom: false,
            }
        },
        plotOptions: {
            bar: {
                barHeight: '90%',
                horizontal: true,
                rangeBarGroupRows: true
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
            },
            title: {
                text: ''
            },
        },
        yaxis: {
            title: {
                text: ''
            },
        },
        colors: this.colors,
        legend: {
            position: 'top',
            show: true,
            horizontalAlign: this.isSafari ? 'center' : 'right',
            offsetY: 15,
            showForSingleSeries: true,
        },
        tooltip: {
            x: {
                format: 'dd.MM HH:mm:ss',
            }
        }
    };

    constructor(
        private errorHandlerService: ErrorHandlerService,
        private cdr: ChangeDetectorRef,
    ) { }

    ngOnInit() {
        // id must clearly identify apx-chart in case multiple widgets of the same type are used
        this.chartId = this.chartId + `_chart_${Math.random().toString(35).substring(2, 7)}`;
        if (this.apexChartOptions.chart !== undefined) {
            this.apexChartOptions.chart.id = this.chartId;
        }
        this.renderTimelineChart();
        if (this.apexChartOptions.chart != null && this.apexChartOptions.chart.events != null) {
            this.apexChartOptions.chart.events['dataPointSelection'] = this.OnClickFnc;
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        let shouldRebuild = false;
        let shouldReloadData = false;

        if (changes['data']) {
            shouldRebuild = true;
            shouldReloadData = true;
        }
        if (changes['height'] || changes['width']) {
            shouldRebuild = true;
        }
        if (shouldRebuild) {
            this.rebuildChart(shouldReloadData);
        }
    }

    rebuildChart(reloadData = true) {
        this.destroyChart();
        this.renderTimelineChart(reloadData);
        this.cdr.detectChanges(); // Ensure Angular detects and applies the changes
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy(); // Destroy the ApexCharts instance
            this.chartInstance = null; // Reset the chart instance
        }
    }
    /*
    resize(height: number, width: number) {
        if(this.apexChartOptions.chart !== undefined) {
            this.apexChartOptions.chart.width = width;
            this.apexChartOptions.chart.height = height;
            this.apexChartOptions.series = this.apexChartOptions.series;
        }
    }*/

    private getXRange() {
        const xMax: Date[] = [];
        const xMin: Date[] = [];

        for (let i = 0; i < this.data.length; i++) {
            const dataEntity = this.data[i];
            if (dataEntity.length > 0) {
                const endSeries = dataEntity[dataEntity.length - 1];
                const startSeries = dataEntity[0];
                const maxSeries = endSeries[0][0];
                const minSeries = startSeries[(startSeries.length - 1)][0];
                xMin.push(new Date(minSeries));
                xMax.push(new Date(maxSeries));
            }
        }

        if (xMax.length > 0 && xMin.length > 0) {
            const maxPoint = xMax.reduce(function (a, b) {
                return a > b ? a : b;
            });
            const minPoint = xMin.reduce(function (a, b) {
                return a < b ? a : b;
            });
            return [minPoint.getTime(), maxPoint.getTime()];
        } else {
            return [undefined, undefined];
        }
    }

    private renderTimelineChart(reloadData = true) {
        if (reloadData || this.series.length === 0) {
            const chartData = this.prepareTimelineChartData();
            this.series = chartData.data;
            this.colors = chartData.colors;
            this.apexChartOptions.series = chartData.data;
            this.apexChartOptions.colors = chartData.colors;

            const xRange = this.getXRange();
            const chartOpt: Partial<ApexChartOptions> = {
                xaxis: {
                    type: 'datetime',
                    labels: {
                        datetimeUTC: false,
                    },
                    title: {
                        text: ''
                    },
                    min: xRange[0],
                    max: xRange[1],
                }
            };
            this.apexChartOptions.xaxis = chartOpt.xaxis;
        }
        if (this.enableToolbar && this.apexChartOptions.chart?.toolbar !== undefined) {
            this.apexChartOptions.chart.toolbar.show = true;
        }
        if (this.apexChartOptions.xaxis?.title !== undefined) {
            this.apexChartOptions.xaxis.title.text = this.hAxisLabel;
        }
        if (this.apexChartOptions.yaxis?.title !== undefined) {
            this.apexChartOptions.yaxis.title.text = this.vAxisLabel;
        }
        // Ensure valid chart dimensions
        if (this.height && this.width) {
            this.apexChartOptions.chart!.height = `${0.9 * this.height}px`;
            this.apexChartOptions.chart!.width = `${0.9 * this.width}px`;
        } else {
            console.error('Chart dimensions are not properly set.');
        }

        this.render = true;
        this.chartInstance = ApexCharts.getChartByID(this.chartId) || null;
        if (this.chartInstance !== null) {
            this.chartInstance.render();
        }
    }

    prepareTimelineChartData() {
        if (this.data == null) {
            // no data
            return { data: [], colors: [] };
        }

        if (this.errorHandlerService.checkIfErrorExists(this.data)) {
            throw (new Error((this.data as any).error));
        }

        const chartData = this.setupTimelineChart();
        this.data.forEach((dataForOneEntity: any, i: any) => {
            if (dataForOneEntity.length > 0) { // only when requested entitity has any data
                this.processDataForOneEntity(dataForOneEntity, chartData, this.vAxes[i]);
            }
        });
        const convertedCartData = this.convertTimelineChartData(chartData);
        return {
            data: convertedCartData,
            colors: this.setupTimelineColors(convertedCartData)
        };
    }

    setupTimelineColors(chartData: any) {
        const colors: string[] = [];
        chartData.forEach((serie: any) => {
            let aliasFound = false;
            this.vAxes.forEach((vAxis: any) => {
                vAxis.conversions.forEach((conversion: any) => {
                    if (aliasFound) {
                        return;
                    }
                    if (conversion.alias === serie.name || conversion.alias === serie.to) {
                        colors.push(conversion.color);
                        aliasFound = true;
                    }
                });
                if (aliasFound) {
                    return;
                }
            });
        });
        return colors;
    }

    convertTimelineChartData(chartData: any) {
        const convertedChartData = [];
        for (const [key, value] of Object.entries(chartData)) {
            const data = (value as any)['data'];
            if (data.length === 0) {
                continue;
            }
            convertedChartData.push({
                name: key,
                data
            });
        }
        return convertedChartData;
    }

    setupTimelineChart() {
        const chartData: any = {};
        this.vAxes.forEach(vAxis => {
            (vAxis?.conversions || []).forEach(conversion => {
                chartData[conversion.alias || conversion.to] = {
                    data: []
                };
            });
        });
        return chartData;
    }

    mergeTimelineData(data: any) {
        /* Merge intervals with the same value
           [3.5 false]
           [2.5 false]
           [1.5 false]
           => [3.5 false], [1.5 false]
        */
        const mergedData: any = [];
        data = data[0];
        let endRow: any = data[0];
        data.forEach((row: any, i: any) => {
            let changeDetected = false;
            let nextRow;
            // last value should be the last value even when no change
            if (i === data.length - 1) {
                changeDetected = true;
            } else {
                nextRow = data[i + 1];
                changeDetected = row[1] !== nextRow[1];
            }
            if (changeDetected) {
                mergedData.push(endRow);
                mergedData.push(row);
                endRow = nextRow;
            }
        });
        return mergedData;
    }

    getAliasOfMatchingRule(vAxis: ChartsExportVAxesModel, firstValue: any, lastValue: any) {
        let alias;
        (vAxis?.conversions || []).forEach(conversion => {
            // console.log(conversion.to + "-" + lastValue + "-" + conversion.from + "-" + firstValue)
            // convert everything to string, as there are problems with booleans in the conversion that are sometimes strings or bool
            if (String(conversion.to) === String(lastValue) && String(conversion.from) === String(firstValue)) {
                alias = conversion.alias || String(conversion.to);
                return;
            }
        });
        return alias;
    }

    processDataForOneEntity(data: any, chartData: any, vAxis: ChartsExportVAxesModel) {
        const mergedData = this.mergeTimelineData(data);
        mergedData.forEach((row: any, i: any) => {
            if (i === mergedData.length - 1) {
                return;
            }
            const nextRow = mergedData[i + 1];
            const firstValue = nextRow[1];
            const lastValue = row[1];
            const ruleAlias = this.getAliasOfMatchingRule(vAxis, firstValue, lastValue);
            if (ruleAlias != null) {
                const startDate = new Date(nextRow[0]);
                let endDate;
                if (i === 0) {
                    endDate = new Date(row[0]);
                } else {
                    // here I use the previous row to get the start date, this assumes that the operator output is valid until the next input
                    // If the border shall be more exact (ending with the last timestamp with that value, use row[0])
                    const prevRow = mergedData[i - 1];
                    endDate = new Date(prevRow[0]);
                }

                chartData[ruleAlias]['data'].push({
                    x: vAxis.valueAlias || vAxis.exportName,
                    y: [
                        startDate.getTime(),
                        endDate.getTime()
                    ]
                });
            }
        });
    }

    resetZoom() {
        if (!this.chartInstance) {
            this.chartInstance = ApexCharts.getChartByID(this.chartId) || null;
        }
        if (this.chartInstance && this.apexChartOptions.xaxis?.min && this.apexChartOptions.xaxis?.max) {
            this.chartInstance.zoomX(this.apexChartOptions.xaxis.min, this.apexChartOptions.xaxis.max);
        }
    }
}
