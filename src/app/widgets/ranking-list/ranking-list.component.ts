/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, Input, OnInit} from '@angular/core';
import {
    WidgetModel
} from '../../modules/dashboard/shared/dashboard-widget.model';
import {EventListService} from '../event-list/shared/event-list.service';
import {RankingListModel} from './shared/ranking-list.model';

@Component({
    selector: 'senergy-ranking-list',
    templateUrl: './ranking-list.component.html',
    styleUrls: ['./ranking-list.component.css'],
})
export class RankingListComponent implements OnInit {

    rankings: RankingListModel[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};

    constructor(private eventListService: EventListService) {
    }

    ngOnInit() {
        this.initMockup();
    }

    edit() {
       this.eventListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    initMockup() {
        this.rankings.push({rank: 1, header: 'Waschmaschine', savings: '55,55€ jährlich', recommendation: 'Kauf Model X'});
        this.rankings.push({rank: 2, header: 'Geschirrspüler', savings: '23,50€ jährlich', recommendation: 'Kauf Model Y'});
        this.rankings.push({rank: 3, header: 'Staubsauger', savings: '20,00€ jährlich', recommendation: 'Kauf Model Z'});
    }


}
