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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { concatMap, Subscription, of } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { PvLoadService } from './shared/pv-load.service';
import { PVLoadRecommendationResult } from './shared/recommendation.model';

@Component({
    selector: 'senergy-pv-load-recommendation',
    templateUrl: './pv-load-recommendation.component.html',
    styleUrls: ['./pv-load-recommendation.component.css']
})
export class PvLoadRecommendationComponent implements OnInit, OnDestroy {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    recommendation?: PVLoadRecommendationResult;
    error?: string;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;


    constructor(
      private dashboardService: DashboardService,
      private pvLoadService: PvLoadService
    ) {}

    ngOnInit(): void {
        this.update();
        this.configured = this.widget.properties.pvLoadRecommendation !== undefined;
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    private update() {
        const exportID = this.widget.properties?.pvLoadRecommendation?.exportID;
        if(exportID == null) {
            console.error('Export ID missing');
            return;
        }

        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            concatMap((event: string) => {
                if (event === 'reloadAll' || event === this.widget.id) {
                    this.refreshing = true;
                    return this.pvLoadService.getPVLoadRecommendation(exportID);
                }
                return of();
            })).subscribe({
            next: (recommendation) => {
                if(recommendation != null) {
                    this.recommendation = recommendation;
                }
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                if(err.error) {
                    this.error = err.error;
                } else {
                    this.error = JSON.stringify(err);
                }
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    edit() {
        this.pvLoadService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
