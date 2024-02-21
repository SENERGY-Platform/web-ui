import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { ApexChartOptions, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';

@Component({
  selector: 'timeline-chart',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnInit, OnChanges {
    @Input() data = [];
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() enableToolbar = false;
    @Input() vAxes: ChartsExportVAxesModel[] = [];
    @Input() height = 0;
    @Input() width = 0;
    render = false;

    apexChartOptions: Partial<ApexChartOptions> = {
        series: [],
        chart: {
            width: '100%',
            height: 'auto',
            animations: {
                enabled: false
            },
            type: 'rangeBar',
            toolbar: {
                show: false
            },
            redrawOnWindowResize: true
        },
        plotOptions: {
            bar: {
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
            }
        },
        yaxis: {
            title: {
                text: ''
            }
        },
        colors: [],
        legend: {
            show: true
        },
        tooltip: {
            x: {
                format: 'dd.MM HH:mm:ss',
            }
        }
    };

    constructor(
        private errorHandlerService: ErrorHandlerService,
    ) {}

    ngOnInit() {
        this.renderTimelineChart();
    }

    ngOnChanges(changes: SimpleChanges) {
        // trick to force the chart to reload -> could not find a programatic way of redrawing it
        if(changes["height"] != null && changes["width"] != null){
            this.render = false;
            this.height = changes["height"].currentValue;
            this.width = changes["width"].currentValue;

            this.render = true;
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

    private renderTimelineChart() {
        const chartData = this.prepareTimelineChartData();
        this.apexChartOptions.series = chartData.data;
        this.apexChartOptions.colors = chartData.colors;
        if(this.enableToolbar && this.apexChartOptions.chart?.toolbar !== undefined) {
            this.apexChartOptions.chart.toolbar.show = true;
        }
        if(this.apexChartOptions.xaxis?.title !== undefined) {
            this.apexChartOptions.xaxis.title.text = this.hAxisLabel;
        }
        if(this.apexChartOptions.yaxis?.title !== undefined) {
            this.apexChartOptions.yaxis.title.text = this.vAxisLabel;
        }
        this.render = true;
    }

    prepareTimelineChartData() {
        if (this.data == null) {
            // no data
            return {data: [], colors: []};
        }

        if (this.errorHandlerService.checkIfErrorExists(this.data)) {
            throw(new Error((this.data as any).error));
        }

        const chartData = this.setupTimelineChart();
        this.data.forEach((dataForOneEntity: any, i: any) => {
            if(dataForOneEntity.length > 0) { // only when requested entitity has any data
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
                    if(aliasFound) {
                        return;
                    }
                    if(conversion.alias === serie.name || conversion.alias === serie.to) {
                        colors.push(conversion.color);
                        aliasFound = true;
                    }
                });
                if(aliasFound) {
                    return;
                }
            });
        });
        return colors;
    }

    convertTimelineChartData(chartData: any) {
        const convertedChartData = [];
        for(const [key, value] of Object.entries(chartData)) {
            convertedChartData.push({
                name: key,
                data:(value as any)['data']
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
        const mergedData: any = [];
        data = data[0];
        let endRow: any = data[0];
        data.forEach((row: any, i: any) => {
            let changeDetected = false;
            let nextRow;
            if(i === data.length-1) {
                changeDetected = true;
            } else {
                nextRow = data[i+1];
                changeDetected = row[1] !== nextRow[1];
            }
            if(changeDetected) {
                mergedData.push(endRow);
                mergedData.push(row);
                endRow = nextRow;
            }
        });
        return mergedData;
    }

    getAliasOfMatchingRule(vAxis: ChartsExportVAxesModel, firstValue: any, lastValue: any) {
        let alias;
        console.log(vAxis);

        (vAxis?.conversions || []).forEach(conversion => {
            console.log(conversion.to + "-" + lastValue + "-" + conversion.from + "-" + firstValue)
            // convert everything to string, as there are problems with booleans in the conversion that are sometimes strings or bool
            if(String(conversion.to) === String(lastValue) && String(conversion.from) === String(firstValue)) {
                alias = conversion.alias || String(conversion.to);
                return;
            }
        });
        console.log(alias)
        return alias;
    }

    processDataForOneEntity(data: any, chartData: any, vAxis: ChartsExportVAxesModel) {

        const mergedData = this.mergeTimelineData(data);
        mergedData.forEach((row: any, i: any) => {
            if(i === mergedData.length-1) {
                return;
            }
            const nextRow = mergedData[i+1];
            const firstValue = nextRow[1];
            const lastValue = row[1];
            const ruleAlias = this.getAliasOfMatchingRule(vAxis, firstValue, lastValue);
            if(ruleAlias != null) {
                const startDate = new Date(nextRow[0]);
                let endDate;
                if(i === 0) {
                    endDate = new Date(row[0]);
                } else {
                    // here I use the previous row to get the start date, this assumes that the operator output is valid until the next input
                    // If the border shall be more exact (ending with the last timestamp with that value, use row[0])
                    const prevRow = mergedData[i-1];
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
}
