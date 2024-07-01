import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import { map } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
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

  // Use a setter for the chart which will get called when then ngif from ready evaluates to true
  // This is needed so the element is not undefined when called later to draw
  private chartExport!: GoogleChartComponent;
  @ViewChild('chartExport', {static: false}) set content(content: GoogleChartComponent) {
      if(content) { // initially setter gets called with undefined
          this.chartExport = content;
      }
  }

  constructor(private leakageService: LeakageDetectionService) {

  }

  ngOnInit(): void {
      if(!this.widget.properties.consumptionProfile) {
          this.configured = false;
          return;
      } else {
          this.configured = true;
          this.widgetProperties = this.widget.properties.consumptionProfile || {};
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

  setupChartData(data: LeakageDetectionResponse) {
      const dataTable: any = [["time", "value"]];
      data.last_consumptions.forEach(row => {
          const ts = row[0];
          const value = row[1];
          dataTable.push([ts, value]);
      });
      this.chartExportData = new ChartsModel('LineChart', dataTable, {
          legend: {position: 'none'},
          vAxis: {
              title: 'Leakage'
          }
      });
      this.chartExport?.draw();
  }

  edit() {
      this.leakageService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
  }
}
