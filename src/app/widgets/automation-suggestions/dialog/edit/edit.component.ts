/*
 * Copyright 2026 InfAI (CC SES)
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

import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, map, Observable } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import {
    AUTOMATION_SUGGESTIONS_RELEASE_NAME,
    setSuggestionInstanceId,
    suggestionInstanceId
} from '../../shared/automation-suggestion.model';

@Component({
    selector: 'app-automation-suggestions-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class AutomationSuggestionsEditComponent implements OnInit {
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: ['', Validators.required],
        instance: [null as SmartServiceInstanceModel | null, Validators.required],
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    instances: SmartServiceInstanceModel[] = [];
    ready = false;

    constructor(
        private dialogRef: MatDialogRef<AutomationSuggestionsEditComponent>,
        private dashboardService: DashboardService,
        private instanceService: SmartServiceInstanceService,
        private releasesService: SmartServiceReleasesService,
        private formBuilder: UntypedFormBuilder,
        @Inject(MAT_DIALOG_DATA) data: {
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit(): void {
        forkJoin({
            instances: this.loadInstances(),
            widget: this.dashboardService.getWidget(this.dashboardId, this.widgetId),
        }).subscribe({
            next: ({ instances, widget }) => {
                this.instances = instances;
                this.widget = widget;
                const currentId = suggestionInstanceId(widget.properties);
                this.form.patchValue({
                    name: widget.name,
                    instance: instances.find((i) => i.id === currentId) ?? null,
                });
                this.ready = true;
            },
            error: () => {
                this.ready = true;
            },
        });
    }

    /** The user's instances of the release named Automatisierungsvorschläge. */
    private loadInstances(): Observable<SmartServiceInstanceModel[]> {
        return forkJoin({
            releases: this.releasesService.getReleaseList(9999, 0, AUTOMATION_SUGGESTIONS_RELEASE_NAME, 'r', false),
            instances: this.instanceService.getInstances({ limit: 9999, offset: 0 }),
        }).pipe(
            map(({ releases, instances }) => {
                const releaseIds = new Set(releases.releases
                    .filter((release) => release.name === AUTOMATION_SUGGESTIONS_RELEASE_NAME)
                    .map((release) => release.id));
                return instances.instances.filter((instance) => releaseIds.has(instance.release_id));
            }),
        );
    }

    close(): void {
        this.dialogRef.close(this.widget);
    }

    private updateName(): Observable<DashboardResponseMessageModel> {
        const newName = this.form.get('name')?.value;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    private updateProperties(): Observable<DashboardResponseMessageModel> {
        const instance = this.form.controls.instance.value;
        if (instance !== null) {
            setSuggestionInstanceId(this.widget.properties, instance.id);
        }
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs: Observable<DashboardResponseMessageModel>[] = [];
        if (this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if (this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }
        forkJoin(obs).subscribe((responses) => {
            const errorOccured = responses.find((response) => response.message !== 'OK');
            if (!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    compare(a: SmartServiceInstanceModel | null, b: SmartServiceInstanceModel | null): boolean {
        return !!a && !!b && a.id === b.id;
    }
}
