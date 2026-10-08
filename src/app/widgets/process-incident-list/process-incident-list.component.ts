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
import { ProcessIncidentListService } from './shared/process-incident-list.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { ProcessIncidentsModel } from '../../modules/processes/incidents/shared/process-incidents.model';
import { ProcessIncidentsService } from '../../modules/processes/incidents/shared/process-incidents.service';
import { DeploymentsModel } from '../../modules/processes/deployments/shared/deployments.model';
import { Router } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { WidgetNoDataComponent } from '../../core/components/widget-no-data/widget-no-data.component';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-process-incident-list',
    templateUrl: './process-incident-list.component.html',
    styleUrls: ['./process-incident-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatList, MatListItem, MatListItemIcon, MatIconButton, MatTooltip, MatIcon, MatListItemTitle, MatListItemLine, WidgetNoDataComponent, WidgetFooterComponent, DatePipe]
})
export class ProcessIncidentListComponent implements OnInit {
    private processIncidentListService = inject(ProcessIncidentListService);
    private processIncidentsService = inject(ProcessIncidentsService);
    private dashboardService = inject(DashboardService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    incidents: ProcessIncidentsModel[] = [];
    ready = false;
    refreshing = false;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngOnInit() {
        this.getIncidents();
    }

    edit() {
        this.processIncidentListService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    navigateToMonitorSection(incident: ProcessIncidentsModel) {
        this.router.navigateByUrl('/processes/monitor', {
            state: {
                deployment: {
                    definition_id: incident.process_definition_id,
                    name: incident.deployment_name,
                } as DeploymentsModel,
                activeTab: 1,
            },
        });
    }

    private getIncidents() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.processIncidentsService
                    .getProcessIncidents(this.widget.properties.limit || 0)
                    .subscribe((incidents: ProcessIncidentsModel[]) => {
                        this.incidents = incidents;
                        this.ready = true;
                        this.refreshing = false;
                    });
            }
        });
    }
}
