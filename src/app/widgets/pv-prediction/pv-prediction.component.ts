import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartSelectEvent, GoogleChartComponent } from 'ng2-google-charts';
import { concatMap, of, Subscription, map } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { PvPredictionService } from './shared/pv-load.service';
import { PVPredictionResult } from './shared/prediction.model';
import { ChartsModel } from '../charts/shared/charts.model';
import { SingleValueModel } from '../single-value/shared/single-value.model';

@Component({
    selector: 'senergy-pv-prediction',
    templateUrl: './pv-prediction.component.html',
    styleUrls: ['./pv-prediction.component.css']
})
export class PvPredictionComponent implements OnInit, OnDestroy {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    error?: string;
    chartExportData: any;
    nextPrediction?: SingleValueModel;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;

    constructor(
      private dashboardService: DashboardService,
      private pvService: PvPredictionService
    ) {}

    // Use a setter for the chart which will get called when then ngif from ready evaluates to true
    // This is needed so the element is not undefined when called later to draw
    private chartExport!: GoogleChartComponent;
    @ViewChild('chartExport', {static: false}) set content(content: GoogleChartComponent) {
        if(content) { // initially setter gets called with undefined
            this.chartExport = content;
        }
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    ngOnInit(): void {
        this.update();
        this.configured = this.widget.properties.pvPrediction !== undefined;
    }

    private update() {
        const exportID = this.widget.properties?.pvPrediction?.exportID;
        if(exportID == null) {
            console.error('Export ID missing');
            return;
        }

        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            concatMap((event: string) => {
                if (event === 'reloadAll' || event === this.widget.id) {
                    this.refreshing = true;
                    return this.pvService.getPVPrediction(exportID);
                }
                return of();
            }),
            map((data: PVPredictionResult) => {
                const nextValueConfig = this.widget.properties.pvPrediction?.nextValueConfig;
                if(this.widget.properties.pvPrediction?.displayTimeline) {
                    this.setupChartData(data);
                } else if(this.widget.properties.pvPrediction?.displayNextValue && nextValueConfig) {
                    this.calcNextPVPrediction(data, nextValueConfig.level, nextValueConfig.time);
                }
                return data;
            })).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                console.error(err);
                this.error = err;
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    setupChartData(data: PVPredictionResult) {
        const dataTable: any = [['time', 'energy']];
        data.predictions.forEach(row => {
            dataTable.push([new Date(row.timestamp), row.value]);
        });
        this.chartExportData = new ChartsModel('LineChart', dataTable, {
            legend: {position: 'none'},
            vAxis: {
                title: 'Average Power in W'
            }
        });
        this.chartExport?.draw();
    }

    calcNextPVPrediction(data: PVPredictionResult, level: string, time: number) {
        // predictions are hourly
        if(level === 'd') {
            time = time * 24;
        }
        const filteredData = data.predictions.slice(-time);
        const aggregatedPrediction = filteredData.reduce((accumulator, current) => accumulator + current.value, 0);
        this.nextPrediction = {
            value: Math.round(aggregatedPrediction * 100) / 100 + ' Wh',
            type: 'String',
            date: new Date()
        };
    }

    edit() {
        this.pvService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    onChartSelect(_: ChartSelectEvent) {
    }
}
