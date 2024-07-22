import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import { map } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ApexChartOptions } from '../charts/export/shared/charts-export-properties.model';
import { ChartsModel } from '../charts/shared/charts.model';
import { ConsumptionProfileProperties, ConsumptionProfilePropertiesModel, ConsumptionProfileResponse } from './shared/consumption-profile.model';
import { ConsumptionProfileService } from './shared/consumption-profile.service';

@Component({
    selector: 'senergy-consumption-profile-widget',
    templateUrl: './consumption-profile.component.html',
    styleUrls: ['./consumption-profile.component.css']
})
export class ConsumptionProfileComponent implements OnInit {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', {static: false}) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;
    error = false;
    widgetProperties!: ConsumptionProfileProperties;
    refreshing = false;
    ready = false;
    timeWindow = '';
    message = '';
    chartData: ApexChartOptions = {
        series: [],
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: '100%',
            animations: {
                enabled: false
            },
            type: 'scatter',
            toolbar: {
                show: false
            },
            events: {},
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
                format: 'dd.MM',
            }
        },
        markers: {
            size: 4
        },
    };
    operatorIsInitPhase = false;
    initialPhaseMsg = '';

    constructor(
        private consumptionService: ConsumptionProfileService,
    ) {

    }

    private checkForInit(data: ConsumptionProfileResponse) {
        if(data.initial_phase !== '' && data.initial_phase !== null) {
            this.operatorIsInitPhase = true;
            this.initialPhaseMsg = data.initial_phase;
            return true;
        }
        return false;
    }

    ngOnInit(): void {
        if(!this.widget.properties.consumptionProfile) {
            this.configured = false;
            return;
        } else {
            this.configured = true;
            this.widgetProperties = this.widget.properties.consumptionProfile || {};
        }

        this.consumptionService.getLatestConsumptionProfileOutput(this.widgetProperties.exportID).pipe(
            map((data) => {
                this.setupChartData(data);
            })
        ).subscribe({
            next: () => {
                this.ready = true;
            },
            error: (err) => {
                console.log(err);
                this.ready = true;
                this.error = true;
            }
        });
    }

    setupChartData(data: ConsumptionProfileResponse) {
        this.checkForInit(data);
        this.timeWindow = data.time_window;

        this.message = 'Normaler Verbrauch im Zeitfenster:';
        if(data.value===true) {
            const anomalyType = data.type === 'low' ? 'niedriger' : 'hoher';
            this.message = 'Ungewöhnlicher ' + anomalyType + ' Verbrauch im Zeitfenster:';
        }

        const points: any[] = [];
        const anomalyPoints: any[] = [];
        data.last_consumptions.forEach(row => {
            const ts = new Date(row[0]).getTime();
            const value = row[1];
            const pointIsAnomaly = row[2];

            if(pointIsAnomaly === 1) {
                anomalyPoints.push({
                    x: ts,
                    y: value
                });
            } else {
                points.push({
                    x: ts,
                    y: value
                });
            }
        });
        this.chartData?.series.push({data: points, name: 'Normal Consumption'});
        this.chartData?.series.push({data: anomalyPoints, name: 'Anomalous Consumption'});
        this.chartData.colors = ['#008FFB', '#FF0000'];
    }

    edit() {
        this.consumptionService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
