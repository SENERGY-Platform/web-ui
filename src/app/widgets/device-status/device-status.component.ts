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
import {DeviceStatusService} from './shared/device-status.service';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {MatTable} from '@angular/material/table';
import {DeviceStatusElementModel} from './shared/device-status-properties.model';
import {DeploymentsService} from '../../modules/processes/deployments/shared/deployments.service';
import {MultiValueService} from '../multi-value/shared/multi-value.service';
import {ChartsExportModel} from '../charts/export/shared/charts-export.model';
import {environment} from '../../../environments/environment';
import {ChartsExportRequestPayloadModel} from '../charts/export/shared/charts-export-request-payload.model';
import {HttpClient} from '@angular/common/http';

@Component({
    selector: 'senergy-device-status',
    templateUrl: './device-status.component.html',
    styleUrls: ['./device-status.component.css'],
})
export class DeviceStatusComponent implements OnInit, OnDestroy {

    configured = false;
    destroy = new Subscription();
    dataReady = false;
    interval = 0;
    // orderedValues: DeviceStatusMeasurement[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild(MatTable, {static: false}) table !: MatTable<any>;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private deviceStatusService: DeviceStatusService,
                private dashboardService: DashboardService,
                private deploymentsService: DeploymentsService,
                private multiValueService: MultiValueService,
                private http: HttpClient) {
    }

    ngOnInit() {
        this.update();
        this.registerIcons();
        this.setConfigured();
    }

    ngOnDestroy() {
        clearInterval(this.interval);
        this.destroy.unsubscribe();
    }

    registerIcons() {
        // this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
    }

    edit() {
        this.deviceStatusService.openEditDialog(this.dashboardId, this.widget.id);
    }

    // checkWarning(m: DeviceStatusMeasurement): boolean {
    //     // if (m.warning_enabled && m.data && m.lowerBoundary && (m.data < m.lowerBoundary)) {
    //     //     return true;
    //     // }
    //     // if (m.warning_enabled && m.data && m.upperBoundary && (m.data > m. upperBoundary)) {
    //     //     return true;
    //     // }
    //     return false;
    // }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.dataReady = false;

                const elements = this.widget.properties.elements;

                if (elements) {
                    clearInterval(this.interval);
                    const refreshTimeInMs = (this.widget.properties.refreshTime || 0) * 1000;
                    if (refreshTimeInMs > 0) {
                        this.interval = window.setInterval(() => {
                            elements.forEach((element: DeviceStatusElementModel) => {
                                this.deploymentsService.startDeployment(element.deploymentId).subscribe();
                            });
                        }, refreshTimeInMs);
                    }

                    const requestPayload: ChartsExportRequestPayloadModel = {
                        time: {
                            last: '500000w', // arbitrary high number
                            end: undefined,
                            start: undefined
                        },
                        group: {
                            type: undefined,
                            time: ''
                        },
                        queries: [{
                            id: elements[0].exportId,
                            fields: [{
                                math: '',
                                name: 'level',
                            }]
                        }],
                        limit: 1
                    };

                    this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).subscribe(model => {
                        const columns = model.results[0].series[0].columns;
                        const values = model.results[0].series[0].values;

                        [elements[0].exportId + '.level'].forEach((id) => {
                            const columnIndex = columns.findIndex(col => col === id);
                            values.forEach(val => {
                                if (val[columnIndex]) {
                                    console.log(val[columnIndex]);
                                }
                            });
                        });
                    });
                }




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

    // private orderValues(sortId: number) {
    //     // const m = this.widget.properties.multivaluemeasurements || [];
    //     // switch (sortId) {
    //     //     case MultiValueOrderEnum.AlphabeticallyAsc:
    //     //         m.sort((a, b) => {
    //     //             return a.name.charCodeAt(0) - b.name.charCodeAt(0);
    //     //         });
    //     //         break;
    //     //     case MultiValueOrderEnum.AlphabeticallyDesc:
    //     //         m.sort((a, b) => {
    //     //             return b.name.charCodeAt(0) - a.name.charCodeAt(0);
    //     //         });
    //     //         break;
    //     //     case MultiValueOrderEnum.ValueAsc:
    //     //         m.sort((a, b) => {
    //     //             return this.parseNumber(a, true) - this.parseNumber(b, true);
    //     //         });
    //     //         break;
    //     //     case MultiValueOrderEnum.ValueDesc:
    //     //         m.sort((a, b) => {
    //     //             return this.parseNumber(b, false) - this.parseNumber(a, false);
    //     //         });
    //     //         break;
    //     // }
    //     // this.orderedValues = m;
    //     // if (this.table) {
    //     //     this.table.renderRows();
    //     // }
    // }

    // private parseNumber(m: DeviceStatusMeasurement, max: boolean): number {
    //     if (m.data == null || m.type === 'String') {
    //         if (max) {
    //             return Number.MAX_VALUE;
    //         }
    //         return  Number.MIN_VALUE;
    //     }
    //     return Number(m.data);
    // }

    // matSortChange(event: Sort) {
    //     switch (event.active) {
    //         case 'value':
    //             if (event.direction === 'asc') {
    //                 this.orderValues(MultiValueOrderEnum.ValueAsc);
    //             } else {
    //                 this.orderValues(MultiValueOrderEnum.ValueDesc);
    //             }
    //             break;
    //         case 'name':
    //             if (event.direction === 'asc') {
    //                 this.orderValues(MultiValueOrderEnum.AlphabeticallyAsc);
    //             } else {
    //                 this.orderValues(MultiValueOrderEnum.AlphabeticallyDesc);
    //             }
    //             break;
    //     }
    // }
}
