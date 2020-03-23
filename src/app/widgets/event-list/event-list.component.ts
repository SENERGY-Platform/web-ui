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
import {EventListService} from './shared/event-list.service';
import {EventListModel} from './shared/event-list.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-event-list',
    templateUrl: './event-list.component.html',
    styleUrls: ['./event-list.component.css'],
})
export class EventListComponent implements OnInit, OnDestroy {

    events: EventListModel[] = [];
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private eventListService: EventListService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.initMockup();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
       this.eventListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private initMockup() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                const date = new Date().getTime();
                this.events = [];
                this.events.push({icon: 'meeting_room', time: new Date(), event: 'Küche: Fenster geschlossen'});
                this.events.push({icon: 'meeting_room', time: new Date(date - 5287000), event: 'Küche: Fenster geöffnet'});
                this.events.push({icon: 'directions_run', time: new Date(date - 7000000), event: 'Flur: Bewegung während Abwesenheit'});
                this.events.push({icon: 'thumb_down_alt', time: new Date(date - 7891200), event: 'Keller: Luftfeuchtigkeit zu hoch'});
                this.events.push({icon: 'check_circle_outline', time: new Date(date - 49765342), event: 'Wohnzimmer: Temperatur erreicht'});
                this.ready = true;
            }
        });
    }


}
