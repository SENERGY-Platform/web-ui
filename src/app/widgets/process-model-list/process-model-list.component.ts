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
import { ProcessModelListService } from './shared/process-model-list.service';
import { ProcessModelListModel } from './shared/process-model-list.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { ProcessRepoService } from 'src/app/modules/processes/process-repo/shared/process-repo.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { MatList, MatListItem, MatListItemTitle, MatListItemLine, MatListItemMeta } from '@angular/material/list';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { WidgetNoDataComponent } from '../../core/components/widget-no-data/widget-no-data.component';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-process-model-list',
    templateUrl: './process-model-list.component.html',
    styleUrls: ['./process-model-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatList, MatListItem, MatListItemTitle, MatListItemLine, MatListItemMeta, MatIconButton, MatTooltip, RouterLink, MatIcon, WidgetNoDataComponent, WidgetFooterComponent, DatePipe]
})
export class ProcessModelListComponent implements OnInit {
    private processModelListService = inject(ProcessModelListService);
    private dashboardService = inject(DashboardService);
    private processRepoService = inject(ProcessRepoService);
    private destroyRef = inject(DestroyRef);

    processes: ProcessModelListModel[] = [];
    ready = false;
    refreshing = false;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    userHasProcessRepoUpdateAuthorization = false;

    ngOnInit() {
        this.getProcesses();
        this.userHasProcessRepoUpdateAuthorization = this.processRepoService.userHasUpdateAuthorization();
    }

    edit() {
        this.processModelListService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private getProcesses() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.processModelListService.getProcesses().subscribe((processes: ProcessModelListModel[]) => {
                    this.processes = processes;
                    this.ready = true;
                    this.refreshing = false;
                });
            }
        });
    }

    void() {}
}
