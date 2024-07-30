import { Component, Input, OnInit } from '@angular/core';
import moment from 'moment';
import { concatMap, map, of, Subscription, throwError } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ApexChartOptions } from '../charts/export/shared/charts-export-properties.model';
import { BadVentilationService } from './shared/bad-ventilation.service';
import { VentilationResult } from './shared/model';

@Component({
    selector: 'senergy-bad-ventilation',
    templateUrl: './bad-ventilation.component.html',
    styleUrls: ['./bad-ventilation.component.css']
})
export class BadVentilationComponent implements OnInit {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    error = false;
    operatorIsInitPhase = false;
    initialPhaseMsg = '';
    showDebug = false;
    widgetHeight = 0;
    widgetWidth = 0;
    configured = false;
    ventilationResults: VentilationResult[] = [];

    chartData: ApexChartOptions = {
        series: [],
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: '100%',
            height: 'auto',
            animations: {
                enabled: false
            },
            type: 'line',
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

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;


    constructor(
      private ventilationService: BadVentilationService,
      private dashboardService: DashboardService,
    ) {

    }
    ngOnInit(): void {
        this.configured = this.widget.properties.badVentilation !== undefined;
        if(!this.configured) {
            return;
        }
        this.update();
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            concatMap((event: string) => {
                if (event === 'reloadAll' || event === this.widget.id) {
                    this.refreshing = true;
                    const exportConfig = this.widget.properties.badVentilation?.exportConfig;
                    if(exportConfig == null || exportConfig.exports.length === 0) {
                        return throwError(() => new Error('Export Config missing'));
                    }
                    return this.loadVentilationResult(exportConfig?.exports[0].id);
                }
                return of(null);
            }),
            concatMap(_ => this.addDeviceCurve()),
            map(_ => this.addRangeAnnotations())
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                console.log(err)
                this.error = true;
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    edit() {
        this.ventilationService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    createMockResult() {
        const highHumidity = moment().subtract(8, 'minutes').toISOString();
        const closed = moment().subtract(10, 'minutes').toISOString();
        const opened = moment().subtract(11, 'minutes').toISOString();

        return [{
            timestamp: highHumidity,
            humidity_too_fast_too_high: highHumidity,
            window_open: false,
        }, {
            timestamp: closed,
            humidity_too_fast_too_high: '',
            window_open: false
        }, {
            timestamp: opened,
            humidity_too_fast_too_high: '',
            window_open: true
        }];
    }

    loadVentilationResult(exportID: string) {
        let timeRange = '';
        try {
            timeRange = this.getTimeRange();
        } catch {
            return throwError(() => new Error('Time range Config missing'));
        }
        return this.ventilationService.getVentilationOutput(exportID, timeRange).pipe(
            map(result => {
                this.ventilationResults = result;
                //this.ventilationResults = this.createMockResult();
            })
        );
    }

    addRangeAnnotations() {
        // Loop through results in desc order and annotate windows 
        // Window 1: where window was closed until high humidity was detected
        // Window 2: where window was open until closed
        if(this.ventilationResults.length === 0) {
            return;
        }
        for (let index = 0; index < this.ventilationResults.length; index++) {
            const result = this.ventilationResults[index];
            const nextResult = this.ventilationResults[index+1];
            if(nextResult == null) {
                return;
            }

            const dateStrOfHighHumidty = result.humidity_too_fast_too_high;
            if(dateStrOfHighHumidty !== '') {
                const dateOfHighHumidty = new Date(dateStrOfHighHumidty);
                if(nextResult.window_open === true) {
                    // if next result was a open window, we skip as high humidity can only be detected after an closed window
                    continue;
                };
                const dateStrOfLastClosedWindow = nextResult.timestamp;

                const annotation = {
                    x: new Date(dateStrOfLastClosedWindow).getTime(),
                    x2: new Date(dateOfHighHumidty).getTime(),
                    fillColor: '#EE4B2B',
                    label: {
                        text: 'High Humidity Increase',
                        borderColor: '#EE4B2B',
                        style: {
                            background: '#EE4B2B',
                            color: '#fff'
                        }
                    }
                };
                this.chartData.annotations.xaxis?.push(annotation);
                continue;
            }

            const windowOpen = result.window_open;
            if(windowOpen === false) {
                if(nextResult.window_open === false) {
                    // if next result was a closed window, we skip as closed windows can only be detected after an opened window
                    continue;
                }
                const annotation = {
                    x: new Date(nextResult.timestamp).getTime(),
                    x2: new Date(result.timestamp).getTime(),
                    fillColor: '#097969',
                    label: {
                        text: 'Open Window',
                        borderColor: '#097969',
                        style: {
                            background: '#097969',
                            color: '#fff'
                        }
                    }
                };
                this.chartData.annotations.xaxis?.push(annotation);
            }

        };
    }

    getTimeRange() {
        const timeConfig = this.widget.properties.badVentilation?.timeRangeConfig.timeRange?.time;
        if(timeConfig == null) {
            throw new Error('Time range Config missing');
        }
        const timeLevelConfig = this.widget.properties.badVentilation?.timeRangeConfig.timeRange?.level;
        if(timeLevelConfig == null) {
            throw new Error('Time range Config missing');
        }
        const timeRange = timeConfig + timeLevelConfig;
        return timeRange;
    }

    addDeviceCurve() {
        const deviceConfig = this.widget.properties.badVentilation?.deviceConfig;
        if(deviceConfig == null) {
            return throwError(() => new Error('Device Config missing'));
        }
        const deviceId = deviceConfig.exports[0].id;
        const serviceId = deviceConfig.fields[0].serviceId || '';
        const pathToColumn = deviceConfig.fields[0].valuePath || '';

        let timeRange = '';
        try {
            timeRange = this.getTimeRange();
        } catch {
            return throwError(() => new Error('Time range Config missing'));
        }

        return this.ventilationService.getDeviceCurve(deviceId, serviceId, pathToColumn, timeRange, '1m').pipe(
            map(data => {
                const points: any[] = [];
                data.forEach((row) => {
                    points.push({
                        x: new Date(row.timestamp).getTime(),
                        y: row.value,
                    });
                });
                this.chartData.series?.push({data: points, name: 'Humidity'});
            })
        );
    }
}
