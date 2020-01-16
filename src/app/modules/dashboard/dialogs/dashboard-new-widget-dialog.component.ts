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

import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';
import {WidgetModel} from '../shared/dashboard-widget.model';
import {DashboardTypesEnum} from '../shared/dashboard-types.enum';

export interface Types {
    value: string;
    viewValue: string;
}

export interface SwitchCategories {
    value: string;
    viewValue: string;
    imgUrl: string;
}

export interface ChartCategories {
    value: string;
    viewValue: string;
}

@Component({
    templateUrl: './dashboard-new-widget-dialog.component.html',
    styleUrls: ['./dashboard-new-widget-dialog.component.css']
})

export class DashboardNewWidgetDialogComponent {

    selectedType: Types = {value: '', viewValue: ''};
    selectedCategory: any = null;
    categories: any[] = [];
    categoryDisabled = true;
    types: Types[] = [
        {value: DashboardTypesEnum.Switch, viewValue: 'Switch'},
        {value: DashboardTypesEnum.Chart, viewValue: 'Chart'},
        {value: DashboardTypesEnum.DevicesState, viewValue: 'Devices state'},
        {value: DashboardTypesEnum.ProcessState, viewValue: 'Process state'},
        {value: DashboardTypesEnum.EventList, viewValue: 'Event list'},
        {value: DashboardTypesEnum.RankingList, viewValue: 'Ranking list'},
        {value: DashboardTypesEnum.ProcessModelList, viewValue: 'Process model list'},
        {value: DashboardTypesEnum.DeviceDowntimeList, viewValue: 'Device downtime list'},
        {value: DashboardTypesEnum.SingleValue, viewValue: 'Single Value'},
        {value: DashboardTypesEnum.MultiValue, viewValue: 'Multi Value'},
        {value: DashboardTypesEnum.EnergyPrediction, viewValue: 'Energy Prediction'},
        {value: DashboardTypesEnum.AirQuality, viewValue: 'Air Quality'},
        {value: DashboardTypesEnum.ProcessIncidentList, viewValue: 'Process incident list'},
    ];
    switchCategories: SwitchCategories[] = [
        {
            value: 'default',
            viewValue: 'Default',
            imgUrl: 'https://images.pexels.com/photos/927546/pexels-photo-927546.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260'
        },
        {
            value: 'security',
            viewValue: 'Security',
            imgUrl: 'https://images.pexels.com/photos/277574/pexels-photo-277574.jpeg?auto=compress&cs=tinysrgb&h=350'
        },
        {
            value: 'monitoring',
            viewValue: 'Monitoring',
            imgUrl: 'https://images.pexels.com/photos/1001752/pexels-photo-1001752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260'
        },
    ];
    chartCategories: ChartCategories[] = [
        {value: 'charts_export', viewValue: 'Export'},
        {value: 'charts_process_instances', viewValue: 'Process instances'},
        {value: 'charts_process_deployments', viewValue: 'Process deployments'},
        {value: 'charts_device_total_downtime', viewValue: 'Device total downtime'},
        {value: 'charts_device_downtime_rate_per_gateway', viewValue: 'Downtime rate per gateway'},
        {value: 'charts_device_per_gateway', viewValue: 'Device per gateway'},
    ];

    constructor(private dialogRef: MatDialogRef<DashboardNewWidgetDialogComponent>) {
    }

    activateCategory(): void {
        switch (this.selectedType.value) {
            case DashboardTypesEnum.Switch: {
                this.categories = this.switchCategories;
                this.categoryDisabled = false;
                break;
            }
            case DashboardTypesEnum.Chart: {
                this.categories = this.chartCategories;
                this.categoryDisabled = false;
                break;
            }
            default: {
                this.categories = [];
                this.categoryDisabled = true;
            }
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    create(inputName: string): void {
        const widget: WidgetModel = {id: '', name: inputName, type: this.selectedType.value, properties: {}};
        switch (this.selectedType.value) {
            case DashboardTypesEnum.Switch: {
                widget.properties = {
                    imgUrl: this.selectedCategory.imgUrl,
                    active: false
                };
                break;
            }
            case DashboardTypesEnum.Chart: {
                widget.type = this.selectedCategory.value;
                break;
            }
            case DashboardTypesEnum.ProcessIncidentList: {
                widget.properties.limit = 10;
                break;
            }
        }
        this.dialogRef.close(widget);
    }

}
