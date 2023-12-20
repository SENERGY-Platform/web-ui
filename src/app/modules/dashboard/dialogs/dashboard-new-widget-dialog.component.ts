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

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../shared/dashboard-widget.model';
import { DashboardTypesEnum } from '../shared/dashboard-types.enum';
import { Observable } from 'rxjs';
import { EnergyPredictionRequirementsService } from '../../../widgets/energy-prediction/shared/energy-prediction-requirements.service';

export interface Types {
    value: string;
    viewValue: string;
    requirementsService?: { requirementsFulfilled(): Observable<boolean> };
    disabled: boolean;
    tooltip: string;
}

export interface SwitchCategories extends Types {
    imgUrl: string;
}

@Component({
    templateUrl: './dashboard-new-widget-dialog.component.html',
    styleUrls: ['./dashboard-new-widget-dialog.component.css'],
})
export class DashboardNewWidgetDialogComponent {
    selectedType: Types = { value: '', viewValue: '', tooltip: '', disabled: false };
    selectedCategory: any = null;
    categories: Types[] | SwitchCategories[] = [];
    categoryDisabled = true;
    types: Types[] = [
        { value: DashboardTypesEnum.Switch, viewValue: 'Switch', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.RangeSlider, viewValue: 'Range Slider', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.Chart, viewValue: 'Chart', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.DevicesState, viewValue: 'Devices state', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.ProcessState, viewValue: 'Process state', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.EventList, viewValue: 'Event list', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.RankingList, viewValue: 'Ranking list', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.ProcessModelList, viewValue: 'Process model list', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.DeviceDowntimeList, viewValue: 'Device downtime list', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.SingleValue, viewValue: 'Single Value', disabled: false, tooltip: '' },
        // {value: DashboardTypesEnum.MultiValue, viewValue: 'Multi Value', disabled: false, tooltip: ''},
        {
            value: DashboardTypesEnum.EnergyPrediction,
            viewValue: 'Energy Prediction',
            disabled: false,
            tooltip: EnergyPredictionRequirementsService.requirement,
            requirementsService: this.energyPredictionRequirementsService,
        },
        {
            value: DashboardTypesEnum.AirQuality,
            viewValue: 'Air Quality',
            disabled: false,
            tooltip: '',
        },
        {
            value: DashboardTypesEnum.ProcessIncidentList,
            viewValue: 'Process incident list',
            disabled: false,
            tooltip: '',
        },
        { value: DashboardTypesEnum.ProcessScheduler, viewValue: 'Process Scheduler', disabled: false, tooltip: '' },
        // {value: DashboardTypesEnum.DeviceStatus, viewValue: 'Device Status', disabled: false, tooltip: ''},
        { value: DashboardTypesEnum.DataTable, viewValue: 'Data Table', disabled: false, tooltip: '' },
        { value: DashboardTypesEnum.AcControl, viewValue: 'Air Condition Control', disabled: false, tooltip: '', requirementsService: undefined },
        { value: DashboardTypesEnum.AnomalyDetection, viewValue: 'Anomaly Detection', disabled: false, tooltip: '' },
    ];
    switchCategories: SwitchCategories[] = [
        {
            value: 'default',
            viewValue: 'Default',
            imgUrl: 'https://images.pexels.com/photos/927546/pexels-photo-927546.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
            disabled: false,
            tooltip: '',
        },
        {
            value: 'security',
            viewValue: 'Security',
            imgUrl: 'https://images.pexels.com/photos/277574/pexels-photo-277574.jpeg?auto=compress&cs=tinysrgb&h=350',
            disabled: false,
            tooltip: '',
        },
        {
            value: 'monitoring',
            viewValue: 'Monitoring',
            imgUrl: 'https://images.pexels.com/photos/1001752/pexels-photo-1001752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
            disabled: false,
            tooltip: '',
        },
    ];
    chartCategories: Types[] = [
        { value: 'charts_export', viewValue: 'Export', disabled: false, tooltip: '' },
        { value: 'charts_process_instances', viewValue: 'Process instances', disabled: false, tooltip: '' },
        { value: 'charts_process_deployments', viewValue: 'Process deployments', disabled: false, tooltip: '' },
        { value: 'charts_device_total_downtime', viewValue: 'Device total downtime', disabled: false, tooltip: '' },
        {
            value: 'charts_device_downtime_rate_per_gateway',
            viewValue: 'Downtime rate per gateway',
            disabled: false,
            tooltip: '',
        },
        { value: 'charts_device_per_gateway', viewValue: 'Device per gateway', disabled: false, tooltip: '' },
    ];

    constructor(
        private dialogRef: MatDialogRef<DashboardNewWidgetDialogComponent>,
        private energyPredictionRequirementsService: EnergyPredictionRequirementsService,
    ) {
        this.types.forEach((t) => this.checkRequirements(t));
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
        this.categories.forEach((t) => this.checkRequirements(t));
    }

    close(): void {
        this.dialogRef.close();
    }

    create(inputName: string): void {
        const widget: WidgetModel = {
            id: '',
            name: inputName,
            type: this.selectedType.value,
            properties: {},
            x: -1,
            y: -1,
            cols: -1,
            rows: -1,
        };
        switch (this.selectedType.value) {
        case DashboardTypesEnum.Switch: {
            widget.properties = {
                imgUrl: this.selectedCategory.imgUrl,
                active: false,
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

    private checkRequirements(t: Types) {
        if (t.requirementsService !== undefined) {
            t.requirementsService.requirementsFulfilled().subscribe((b) => {
                t.disabled = !b;
            });
        }
    }
}
