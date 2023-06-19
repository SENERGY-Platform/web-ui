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

import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { MatTable } from '@angular/material/table';
import { DeviceStatusConfigConvertRuleModel, DeviceStatusElementModel } from './shared/device-status-properties.model';
import { DeploymentsService } from '../../modules/processes/deployments/shared/deployments.service';
import { DeviceStatusDialogService } from './shared/device-status-dialog.service';
import {
    LastValuesRequestElementInfluxModel,
    LastValuesRequestElementTimescaleModel,
    TimeValuePairModel
} from '../shared/export-data.model';
import { ExportDataService } from '../shared/export-data.service';
import { DeviceStatusItemModel } from './shared/device-status-item.model';

@Component({
    selector: 'senergy-device-status',
    templateUrl: './device-status.component.html',
    styleUrls: ['./device-status.component.css'],
})
export class DeviceStatusComponent implements OnInit, OnDestroy {
    configured = false;
    destroy = new Subscription();
    dataReady = false;
    items: DeviceStatusItemModel[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdateAuthorization = false;
    @ViewChild(MatTable, { static: false }) table!: MatTable<any>;

    constructor(
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer,
        private deviceStatusDialogService: DeviceStatusDialogService,
        private dashboardService: DashboardService,
        private deploymentsService: DeploymentsService,
        private exportDataService: ExportDataService,
    ) {}

    ngOnInit() {
        this.update();
        this.setConfigured();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.deviceStatusDialogService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.dataReady = false;

                const elements = this.widget.properties.elements;
                if (elements) {
                    const queries: LastValuesRequestElementInfluxModel[] = [];
                    elements.forEach((element: DeviceStatusElementModel) => {
                        if (element.exportId && element.exportValues) {
                            queries.push({ measurement: element.exportId, columnName: element.exportValues.Name });
                        }
                    });

                    this.exportDataService.getLastValuesInflux(queries).subscribe((res) => {
                        this.items = [];
                        res.forEach((pair: TimeValuePairModel, index: number) => {
                            let v = pair.value;
                            if (v === true || v === false) {
                                v = v as unknown as string;
                            }
                            const convert = this.convert(v);
                            this.items.push({
                                name: elements[index].name as string,
                                status: v,
                                icon: convert.icon,
                                color: convert.color,
                                time: pair.time,
                            });
                        });
                        this.dataReady = true;
                    });
                } else {
                    this.dataReady = true;
                }
            }
        });
    }

    /**
     * Checks if the widget is configured. The widget is considered configured if all exports and columns are set
     */
    private setConfigured() {
        this.configured = true;
    }

    private convert(status: string | number | boolean | null): { icon: string; color: string } {
        const convertRules: DeviceStatusConfigConvertRuleModel[] | undefined = this.widget.properties.convertRules;
        if (convertRules) {
            for (let i = 0; i < convertRules.length; i++) {
                switch (typeof status) {
                case 'string': {
                    if (status === convertRules[i].status) {
                        return { icon: convertRules[i].icon, color: convertRules[i].color };
                    }
                    break;
                }
                case 'boolean': {
                    if (status === JSON.parse(convertRules[i].status)) {
                        return { icon: convertRules[i].icon, color: convertRules[i].color };
                    }
                    break;
                }
                case 'number': {
                    if (status === parseInt(convertRules[i].status, 10)) {
                        return { icon: convertRules[i].icon, color: convertRules[i].color };
                    }
                    break;
                }
                }
            }
        }
        return { icon: '', color: '' };
    }
}
