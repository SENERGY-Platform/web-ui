/*
 * Copyright 2023 InfAI (CC SES)
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

import { Component, OnInit } from '@angular/core';
import { CostService } from '../shared/cost.service';
import { CostEntryModel, CostWithEstimationModel } from '../shared/cost.model';
import { KeyValue } from '@angular/common';

@Component({
  selector: 'senergy-cost-overview',
  templateUrl: './cost-overview.component.html',
  styleUrls: ['./cost-overview.component.css']
})
export class CostOverviewComponent implements OnInit {

  dataReady = false;
  tree: Map<string, CostWithEstimationModel> = new Map();

  constructor(private costService: CostService) {

  }
  ngOnInit(): void {
    this.costService.getTree().subscribe(res => {
      this.tree = res;
      this.dataReady = true;
    });
  }

  originalOrder = (_: KeyValue<string, any>, __: KeyValue<string, any>): number => 0;

  sum(m: CostEntryModel): number {
    return m.cpu + m.ram + m.storage;
  }
}
