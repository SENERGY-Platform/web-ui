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
import { WidgetModel, WidgetPropertiesModels } from '../../modules/dashboard/shared/dashboard-widget.model';
import { SwitchService } from './shared/switch.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { SwitchPropertiesDeploymentsModel, SwitchPropertiesInstancesModel } from './shared/switch-properties.model';
import { MatCard, MatCardContent, MatCardImage } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackError } from '../../core/services/snack-bar-messages';

@Component({
    selector: 'senergy-switch',
    templateUrl: './switch.component.html',
    styleUrls: ['./switch.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, MatCardImage, MatSlideToggle, FormsModule, WidgetFooterComponent]
})
export class SwitchComponent implements OnInit {
    private switchService = inject(SwitchService);
    private dashboardService = inject(DashboardService);
    private destroyRef = inject(DestroyRef);
    private snackBar = inject(MatSnackBar);

    ready = false;


    @Input() dashboardId = '';
    @Input() widget: WidgetModel = { properties: {} as WidgetPropertiesModels } as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngOnInit() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.ready = true;
            }
        });
    }

    edit() {
        this.switchService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    toggle() {
        this.stopDeployedInstances();
    }

    private triggerDeployments() {
        let trigger = '';
        if (this.widget.properties.active === true) {
            trigger = 'on';
        } else {
            trigger = 'off';
        }
        if (this.widget.properties.deployments) {
            const deploymentsArray: SwitchPropertiesDeploymentsModel[] = [];
            this.widget.properties.deployments.forEach((deployment: SwitchPropertiesDeploymentsModel) => {
                if (deployment.trigger === trigger) {
                    deploymentsArray.push(deployment);
                }
            });
            if (deploymentsArray.length > 0) {
                this.switchService.startMultipleDeployments(deploymentsArray).subscribe((instances: SwitchPropertiesInstancesModel[]) => {
                    this.widget.properties.instances = instances;
                    this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties).subscribe();
                });
            } else {
                this.widget.properties.instances = [];
                this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties).subscribe();
            }
        }
    }

    private stopDeployedInstances() {
        if (this.widget.properties.instances) {
            const instancesArray: SwitchPropertiesInstancesModel[] = [];
            this.widget.properties.instances.forEach((instance: SwitchPropertiesInstancesModel) => {
                if (!instance.ended) {
                    instancesArray.push(instance);
                }
            });
            if (instancesArray.length > 0) {
                this.switchService.stopMultipleDeployments(instancesArray).subscribe((stopped) => {
                    if (stopped === null) {
                        // the toggle has already flipped; put it back, the old instances are still running
                        this.widget.properties.active = !this.widget.properties.active;
                        snackError(this.snackBar, 'Running deployments could not be stopped, the new ones were not started');
                        return;
                    }
                    this.triggerDeployments();
                });
            } else {
                this.triggerDeployments();
            }
        } else {
            this.triggerDeployments();
        }
    }
}
