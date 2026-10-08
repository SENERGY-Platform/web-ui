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

import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { MatIconRegistry, MatIcon } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ProcessStateService } from './shared/process-state.service';
import { ProcessStateModel } from './shared/process-state.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-process-state',
    templateUrl: './process-state.component.html',
    styleUrls: ['./process-statecomponent.css'],
    providers: [HttpClient],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatIcon, WidgetFooterComponent]
})
export class ProcessStateComponent implements OnInit, OnDestroy {
    private iconRegistry = inject(MatIconRegistry);
    private sanitizer = inject(DomSanitizer);
    private processStateService = inject(ProcessStateService);
    private dashboardService = inject(DashboardService);

    processStatus: ProcessStateModel = { available: 0, executable: 0 };
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngOnInit() {
        this.setDeviceStatus();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processStateService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private setDeviceStatus() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.processStateService.getProcessStatus().subscribe((processStatus: ProcessStateModel) => {
                    this.processStatus = processStatus;
                    this.ready = true;
                    this.refreshing = false;
                });
            }
        });
    }
}
