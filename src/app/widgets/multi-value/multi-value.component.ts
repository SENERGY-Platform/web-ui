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

import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {MultiValueService} from './shared/multi-value.service';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {MultiValueMeasurement, MultiValueOrderEnum} from './shared/multi-value.model';
import {Sort} from '@angular/material/sort';
import {MatTable} from '@angular/material/table';

@Component({
    selector: 'senergy-multi-value',
    templateUrl: './multi-value.component.html',
    styleUrls: ['./multi-value.component.css'],
})
export class MultiValueComponent implements OnInit, OnDestroy {

    configured = false;
    destroy = new Subscription();
    dataReady = false;
    orderedValues: MultiValueMeasurement[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild(MatTable, {static: false}) table !: MatTable<any>;

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
                this.dataReady = false;
                this.multiValueService.getValues(this.widget).subscribe(result => {
                    this.widget = result;
                    this.dataReady = true;
                    this.orderValues(this.widget.properties.order || 0);
                });
            }
        });
    }

    /**
     * Checks if the widget is configured. The widget is considered configured if all exports and columns are set
     */
    private setConfigured() {
        this.configured = true;
        if (this.widget.properties.multivaluemeasurements) {
            for (const measurement of this.widget.properties.multivaluemeasurements) {
                if (measurement.export.id === '' || measurement.column.Name === '' || measurement.type === '') {
                    this.configured = false;
                    return;
                }
            }
        } else {
            this.configured = false;
        }
    }

    private orderValues(sortId: number) {
        const m = this.widget.properties.multivaluemeasurements || [];
        switch (sortId) {
            case MultiValueOrderEnum.AlphabeticallyAsc:
                m.sort((a, b) => {
                    return a.name.charCodeAt(0) - b.name.charCodeAt(0);
                });
                break;
            case MultiValueOrderEnum.AlphabeticallyDesc:
                m.sort((a, b) => {
                    return b.name.charCodeAt(0) - a.name.charCodeAt(0);
                });
                break;
            case MultiValueOrderEnum.ValueAsc:
                m.sort((a, b) => {
                    return this.parseNumber(a, true) - this.parseNumber(b, true);
                });
                break;
            case MultiValueOrderEnum.ValueDesc:
                m.sort((a, b) => {
                    return this.parseNumber(b, false) - this.parseNumber(a, false);
                });
                break;
        }
        this.orderedValues = m;
        if (this.table) {
            this.table.renderRows();
        }
    }

    private parseNumber(m: MultiValueMeasurement, max: boolean): number {
        if (m.data == null || m.type === 'String') {
            if (max) {
                return Number.MAX_VALUE;
            }
            return  Number.MIN_VALUE;
        }
        return Number(m.data);
    }

    matSortChange(event: Sort) {
        switch (event.active) {
            case 'value':
                if (event.direction === 'asc') {
                    this.orderValues(MultiValueOrderEnum.ValueAsc);
                } else {
                    this.orderValues(MultiValueOrderEnum.ValueDesc);
                }
                break;
            case 'name':
                if (event.direction === 'asc') {
                    this.orderValues(MultiValueOrderEnum.AlphabeticallyAsc);
                } else {
                    this.orderValues(MultiValueOrderEnum.AlphabeticallyDesc);
                }
                break;
        }
    }
}
