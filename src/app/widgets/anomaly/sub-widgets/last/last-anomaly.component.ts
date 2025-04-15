import { Component, Input, OnInit } from '@angular/core';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { AnomalyResultModel } from '../../shared/anomaly.model';

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
