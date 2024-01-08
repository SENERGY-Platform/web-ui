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
import { CostEntryModel, CostModel } from '../shared/cost.model';
import { KeyValue } from '@angular/common';
import { Observable, forkJoin, map } from 'rxjs';
import { BillingService } from '../shared/billing.service';
import { FormControl } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
import { BillingInformationModel } from '../shared/billing.model';

@Component({
    selector: 'senergy-cost-overview',
    templateUrl: './cost-overview.component.html',
    styleUrls: ['./cost-overview.component.css']
})
export class CostOverviewComponent implements OnInit {
    dataReady = false;
    tree: Map<string, CostModel> | undefined;
    dates: Date[] = [];
    options: BillingInformationModel[] = [];
    date = new FormControl(new Date());
    now = new Date();
    selectedBill = new FormControl();

    constructor(private costService: CostService, private billingService: BillingService) {

    }
    ngOnInit(): void {
        const obs: Observable<any>[] = [];
        obs.push(
            this.costService.getTree().pipe(map((res: Map<string, CostModel>) => {
                this.tree = res;
            })));

        if (this.billingService.userHasReadAuthorization()) {
            obs.push(
                this.billingService.getAvailable().pipe(map((res) => {
                    this.dates = res;
                })));
        }

        forkJoin(obs).subscribe(_ => this.dataReady = true);
        this.selectedBill.valueChanges.subscribe(tree => this.tree = tree);
    }

    originalOrder = (_: KeyValue<string, any>, __: KeyValue<string, any>): number => 0;

    sum(m: CostEntryModel): number {
        return m.cpu + m.ram + m.storage;
    }

    setMonthAndYear($event: Date, datepicker: MatDatepicker<any>) {
        datepicker.close();
        const now = new Date();
        if (now.getFullYear() === $event.getFullYear() && now.getMonth() === $event.getMonth()) {
            this.costService.getTree().subscribe((res: Map<string, CostModel>) => {
                this.date.setValue(now);
                this.options = [];
                this.tree = res;
            });
        } else {
            this.billingService.getForMonth($event.getFullYear(), $event.getMonth() + 1).subscribe((res => {
                this.date.setValue($event);
                this.options = res;
                if (this.options.length === 0) {
                    this.tree = undefined;
                } else {
                    this.selectedBill.setValue(this.options[this.options.length - 1].tree);
                }
            }));
        }
    }

}
