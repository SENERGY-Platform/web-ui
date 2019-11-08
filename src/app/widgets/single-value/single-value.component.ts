/*
 * Copyright 2018 InfAI (CC SES)
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
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import {SingleValueService} from './shared/single-value.service';
import {SingleValueModel} from './shared/single-value.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-single-value',
    templateUrl: './single-value.component.html',
    styleUrls: ['./single-value.component.css'],
})
export class SingleValueComponent implements OnInit, OnDestroy {

    devicesStatus: SingleValueModel = {value: 0};
    ready = false;
    configured = false;
    dataReady = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private singleValueService: SingleValueService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.update();
        this.registerIcons();
        this.setConfigured();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
        this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
        this.iconRegistry.addSvgIcon('offline', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/disconnect_white.svg'));
    }

    edit() {
        this.singleValueService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.dataReady = false;
                this.singleValueService.getSingleValue(this.widget).subscribe((devicesStatus: SingleValueModel) => {
                    this.devicesStatus = devicesStatus;
                    this.ready = true;
                    this.dataReady = true;
                }, () => {
                    this.ready = true;
                });
            }
        });
    }

    private setConfigured() {
        this.configured = !(
          this.widget.properties.measurement === undefined
        );
    }
}
