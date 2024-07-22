import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import { map } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ApexChartOptions } from '../charts/export/shared/charts-export-properties.model';
import { ChartsModel } from '../charts/shared/charts.model';
import { LeackageDetectionProperties, LeakageDetectionResponse } from './shared/leakage-detction.model';
import { LeakageDetectionService } from './shared/leakage-detection.service';

@Component({
    selector: 'senergy-leakage-detection-widget',
    templateUrl: './leakage-detection.component.html',
    styleUrls: ['./leakage-detection.component.css']
})
export class LeakageDetectionComponent implements OnInit {
  @Input() dashboardId = '';
  @Input() widget: WidgetModel = {} as WidgetModel;
  @Input() zoom = false;
  @ViewChild('content', {static: false}) contentBox!: ElementRef;
  @Input() userHasDeleteAuthorization = false;
  @Input() userHasUpdatePropertiesAuthorization = false;
  @Input() userHasUpdateNameAuthorization = false;
  refreshing = false;
  error = false;
  ready = false;
  chartExportData: any;
  configured = false;
  widgetProperties!: LeackageDetectionProperties;
  message = '';
  timeWindow = '';

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
        type: 'scatter',
        toolbar: {
            show: false
        },
        events: {}
    },
    markers: {
        size: 4
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
  };
  operatorIsInitPhase = false;
  initialPhaseMsg = '';

  constructor(
      private leakageService: LeakageDetectionService
  ) {

  }

  ngOnInit(): void {
      if(!this.widget.properties.leakageDetection) {
          this.configured = false;
          return;
      } else {
          this.configured = true;
          this.widgetProperties = this.widget.properties.leakageDetection || {};
      }

      this.leakageService.getLatestLeakageDetectionOutput(this.widgetProperties.exportID).pipe(
          map((data) => {
              this.setupChartData(data);
          })
      ).subscribe({
          next: () => {
              this.ready = true;
          },
          error: (err) => {
              console.log(err);
              this.error = true;
              this.ready = true;
          }
      });
  }

  private checkForInit(data: LeakageDetectionResponse) {
      if(data.initial_phase !== '' && data.initial_phase !== null) {
          this.operatorIsInitPhase = true;
          this.initialPhaseMsg = data.initial_phase;
          return true;
      }
      return false;
  }

  setupChartData(data: LeakageDetectionResponse) {
      this.checkForInit(data);
      this.message = 'Normaler Wasserverbrauch im Zeitfenster:';
      if(data.value===1) {
          this.message = 'In den letzten 5 Minuten wurde übermäßig viel Wasser verbraucht:';
      }
      this.timeWindow = data.time_window;
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
      this.leakageService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
  }
}
