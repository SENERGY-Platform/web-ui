/*
 * Copyright 2025 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
