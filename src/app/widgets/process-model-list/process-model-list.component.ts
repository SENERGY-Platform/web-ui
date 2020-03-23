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
import {ProcessModelListService} from './shared/process-model-list.service';
import {ProcessModelListModel} from './shared/process-model-list.model';
import {Subscription} from 'rxjs';
import {ChartsModel} from '../charts/shared/charts.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';

@Component({
    selector: 'senergy-process-model-list',
    templateUrl: './process-model-list.component.html',
    styleUrls: ['./process-model-list.component.css'],
})
export class ProcessModelListComponent implements OnInit, OnDestroy {

    processes: ProcessModelListModel[] = [];
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private processModelListService: ProcessModelListService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.getProcesses();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processModelListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcesses() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.processModelListService.getProcesses().subscribe((processes: ProcessModelListModel[]) => {
                    this.processes = processes;
                    this.ready = true;
                });
            }
        });
    }
}
