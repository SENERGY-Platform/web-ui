import { ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, ElementRef, Input, OnChanges, OnInit, Renderer2, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { AnomalyReconstructionComponent } from 'src/app/widgets/anomaly/reconstruction/reconstruction.component';
import { ApexChartOptions, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';

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
    @Input() data = [];

    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() enableToolbar = false;
    @Input() vAxes: ChartsExportVAxesModel[] = [];
    @Input() height = 0;
    @Input() width = 0;
    @Input() OnClickFnc = (_: any, _2: any, _3: any) => {};
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
            redrawOnWindowResize: true,
            events: {}
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
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.renderTimelineChart();
        if(this.apexChartOptions.chart != null && this.apexChartOptions.chart.events != null) {
            this.apexChartOptions.chart.events['dataPointSelection'] = this.OnClickFnc;
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        // trick to force the chart to reload -> could not find a programatic way of redrawing it
        if(changes["height"] != null && changes["width"] != null){
            this.render = false;
            this.height = changes["height"].currentValue;
            this.width = changes["width"].currentValue;
            this.cdr.detectChanges();
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
            const data = (value as any)['data'];
            if(data.length === 0){
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
        (vAxis?.conversions || []).forEach(conversion => {
            //console.log(conversion.to + "-" + lastValue + "-" + conversion.from + "-" + firstValue)
            // convert everything to string, as there are problems with booleans in the conversion that are sometimes strings or bool
            if(String(conversion.to) === String(lastValue) && String(conversion.from) === String(firstValue)) {
                alias = conversion.alias || String(conversion.to);
                return;
            }
        });
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
