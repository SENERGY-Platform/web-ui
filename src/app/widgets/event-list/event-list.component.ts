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

import { Component, Input, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { EventListService } from './shared/event-list.service';
import { EventListModel } from './shared/event-list.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-event-list',
    templateUrl: './event-list.component.html',
    styleUrls: ['./event-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatList, MatListItem, MatIcon, MatListItemIcon, MatListItemTitle, MatListItemLine, WidgetFooterComponent, DatePipe]
})
export class EventListComponent implements OnInit {
    private eventListService = inject(EventListService);
    private dashboardService = inject(DashboardService);
    private destroyRef = inject(DestroyRef);

    events: EventListModel[] = [];
    ready = false;
    refreshing = false;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngOnInit() {
        this.initMockup();
    }

    edit() {
        this.eventListService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private initMockup() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                const date = new Date().getTime();
                this.events = [];
                this.events.push({ icon: 'meeting_room', time: new Date(), event: 'Küche: Fenster geschlossen' });
                this.events.push({ icon: 'meeting_room', time: new Date(date - 5287000), event: 'Küche: Fenster geöffnet' });
                this.events.push({ icon: 'directions_run', time: new Date(date - 7000000), event: 'Flur: Bewegung während Abwesenheit' });
                this.events.push({ icon: 'thumb_down_alt', time: new Date(date - 7891200), event: 'Keller: Luftfeuchtigkeit zu hoch' });
                this.events.push({
                    icon: 'check_circle_outline',
                    time: new Date(date - 49765342),
                    event: 'Wohnzimmer: Temperatur erreicht',
                });
                this.ready = true;
                this.refreshing = false;
            }
        });
    }
}
