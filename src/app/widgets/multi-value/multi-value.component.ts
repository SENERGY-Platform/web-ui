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
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {MultiValueService} from './shared/multi-value.service';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {MultiValueMeasurement, MultiValueOrderEnum} from './shared/multi-value.model';

@Component({
    selector: 'senergy-multi-value',
    templateUrl: './multi-value.component.html',
    styleUrls: ['./multi-value.component.css'],
})
export class MultiValueComponent implements OnInit, OnDestroy {

    configured = false;
    dataReceived = 0;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private multiValueService: MultiValueService,
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
        // this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
    }

    edit() {
        this.multiValueService.openEditDialog(this.dashboardId, this.widget.id);
    }

    checkWarning(m: MultiValueMeasurement): boolean {
        if (m.warning_enabled && m.data && m.lowerBoundary && (m.data < m.lowerBoundary)) {
            return true;
        }
        if (m.warning_enabled && m.data && m.upperBoundary && (m.data > m. upperBoundary)) {
            return true;
        }
        return false;
    }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.dataReceived = 0;
                this.multiValueService.getValues(this.widget).subscribe(result => {
                    if (this.widget.properties.multivaluemeasurements) {
                        this.widget.properties.multivaluemeasurements[result.index].data = result.value;
                        this.dataReceived++;
                    }
                });
            }
        });
    }

    isDataReady(): boolean {
        if (this.widget.properties.multivaluemeasurements) {
            return this.widget.properties.multivaluemeasurements.length === this.dataReceived;
        }
        return false;
    }

    /**
     * Checks if the widget is configured. The widget is considered configured if all exports and columns are set
     */
    private setConfigured() {
        this.configured = true;
        if (this.widget.properties.multivaluemeasurements) {
            for (const measurement of this.widget.properties.multivaluemeasurements) {
                if (measurement.export.id === '' && measurement.column.Name === '') {
                    this.configured = false;
                    return;
                }
            }
        }
    }

    orderedValues(): MultiValueMeasurement[] {
        const m = this.widget.properties.multivaluemeasurements || [];
        switch (this.widget.properties.order || 0) {
            case MultiValueOrderEnum.AlphabeticallyAsc:
                m.sort((a, b) => {
                    return a.name.charCodeAt(0) - b.name.charCodeAt(0);
                });
                return m;
            case MultiValueOrderEnum.AlphabeticallyDesc:
                m.sort((a, b) => {
                    return b.name.charCodeAt(0) - a.name.charCodeAt(0);
                });
                return m;
            case MultiValueOrderEnum.ValueAsc:
                m.sort((a, b) => {
                    return Number(a.data) - Number(b.data);
                });
                return m;
            case MultiValueOrderEnum.ValueDesc:
                m.sort((a, b) => {
                    return Number(b.data) - Number(a.data);
                });
                return m;
        }
        return m;
    }

}
