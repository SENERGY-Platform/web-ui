/*
 * Copyright 2020 InfAI (CC SES)
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

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {
    WidgetModel
} from '../../modules/dashboard/shared/dashboard-widget.model';
import {RankingListModel} from './shared/ranking-list.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {RankingListService} from './shared/ranking-list.service';

@Component({
    selector: 'senergy-ranking-list',
    templateUrl: './ranking-list.component.html',
    styleUrls: ['./ranking-list.component.css'],
})
export class RankingListComponent implements OnInit, OnDestroy {

    rankings: RankingListModel[] = [];
    ready = false;

    private destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private rankingListService: RankingListService, private dashboardService: DashboardService) {
    }

    ngOnInit() {
      this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
          if (event === 'reloadAll' || event === this.widget.id) {
              this.ready = false;
                this.initMockup();
                this.ready = true;
            }
        });
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
       this.rankingListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    initMockup() {
        this.rankings = [];
        this.rankings.push({rank: 1, header: 'Waschmaschine', savings: '55,55€ jährlich', recommendation: 'Kauf Model X'});
        this.rankings.push({rank: 2, header: 'Geschirrspüler', savings: '23,50€ jährlich', recommendation: 'Kauf Model Y'});
        this.rankings.push({rank: 3, header: 'Staubsauger', savings: '20,00€ jährlich', recommendation: 'Kauf Model Z'});
    }


}
