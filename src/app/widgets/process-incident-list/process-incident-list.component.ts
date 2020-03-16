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
import {ProcessIncidentListService} from './shared/process-incident-list.service';
import {Subscription} from 'rxjs';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {ProcessIncidentsModel} from '../../modules/processes/incidents/shared/process-incidents.model';
import {ProcessIncidentsService} from '../../modules/processes/incidents/shared/process-incidents.service';
import {DeploymentsModel} from '../../modules/processes/deployments/shared/deployments.model';
import {Router} from '@angular/router';

@Component({
    selector: 'senergy-process-incident-list',
    templateUrl: './process-incident-list.component.html',
    styleUrls: ['./process-incident-list.component.css'],
})
export class ProcessIncidentListComponent implements OnInit, OnDestroy {

    incidents: ProcessIncidentsModel[] = [];
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private processIncidentListService: ProcessIncidentListService,
                private processIncidentsService: ProcessIncidentsService,
                private dashboardService: DashboardService,
                private router: Router) {
    }

    ngOnInit() {
        this.getIncidents();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processIncidentListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    navigateToMonitorSection(incident: ProcessIncidentsModel) {
        this.router.navigateByUrl('/processes/monitor', {
            state: {
                deployment: {
                    definition_id: incident.process_definition_id,
                    name: incident.deployment_name
                } as DeploymentsModel, activeTab: 1
            }
        });
    }

    private getIncidents() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.processIncidentsService.getProcessIncidents(this.widget.properties.limit || 0).subscribe((incidents: ProcessIncidentsModel[]) => {
                    this.incidents = incidents;
                    this.ready = true;
                });
            }
        });
    }


}
