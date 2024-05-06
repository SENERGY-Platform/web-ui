import { Component, Input, OnInit, Output, ViewChild } from '@angular/core';
import { GoogleChartComponent } from 'ng2-google-charts';
import { map, of } from 'rxjs';
import { ElementSizeService } from 'src/app/core/services/element-size.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ChartsModel } from 'src/app/widgets/charts/shared/charts.model';
import { AnomalyResultModel } from '../../shared/anomaly.model';
import { AnomalyService } from '../../shared/anomaly.service';

@Component({
    selector: 'last-anomaly',
    templateUrl: './last-anomaly.component.html',
    styleUrls: ['./last-anomaly.component.css']
})
export class LastAnomalyComponent implements OnInit {
  @Input() anomaly?: AnomalyResultModel;
  @Input() showDebug = false;
  @Input() widget?: WidgetModel;

  anomalyDetected = false;

  ngOnInit(): void {
      if(this.anomaly != null && this.anomaly.value !== '' && this.anomaly.type !== '') {
          this.anomalyDetected = true;
      }
  }
}
