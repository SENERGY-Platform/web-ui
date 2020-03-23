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
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {ProcessStateService} from './shared/process-state.service';
import {ProcessStateModel} from './shared/process-state.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Component({
    selector: 'senergy-process-state',
    templateUrl: './process-state.component.html',
    styleUrls: ['./process-statecomponent.css'],
    providers: [HttpClient],
})
export class ProcessStateComponent implements OnInit, OnDestroy {

    processStatus: ProcessStateModel = {available: 0, executable: 0};
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private processStateService: ProcessStateService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.setDeviceStatus();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processStateService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private setDeviceStatus() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.processStateService.getProcessStatus().subscribe((processStatus: ProcessStateModel) => {
                        this.processStatus = processStatus;
                        this.ready = true;
                });
            }
        });
    }
}
