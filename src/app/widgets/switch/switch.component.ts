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
import {SwitchService} from './shared/switch.service';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {SwitchPropertiesDeploymentsModel, SwitchPropertiesInstancesModel} from './shared/switch-properties.model';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-switch',
    templateUrl: './switch.component.html',
    styleUrls: ['./switch.component.css'],
})
export class SwitchComponent implements OnInit, OnDestroy {

    ready = false;

    private destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private switchService: SwitchService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.ready = true;
            }
        });
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.switchService.openEditDialog(this.dashboardId, this.widget.id);
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
                    this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe();
                });
            } else {
                this.widget.properties.instances = [];
                this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe();
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
                this.switchService.stopMultipleDeployments(instancesArray).subscribe(() => {
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
